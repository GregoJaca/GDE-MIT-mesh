import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from openai import OpenAI

from config import Config
from api_models import GenerationRequest, FinalReportResponse
from pipeline import ZeroHallucinationPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

class AppState:
    client: OpenAI | None = None
    pipeline: ZeroHallucinationPipeline | None = None

state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not Config.KEY: 
        raise RuntimeError("CRITICAL: OPENAI_API_KEY environment variable missing.")
    
    state.client = OpenAI(
        base_url=Config.BASE_URL,
        api_key=Config.KEY,
        default_query={"api-version": Config.VERSION},
        default_headers={"api-key": Config.KEY}
    )
    state.pipeline = ZeroHallucinationPipeline(client=state.client, model=Config.MODEL)
    logger.info("Application lifespan started. OpenAI & Scrubber loaded.")
    yield
    state.client = None
    state.pipeline = None
    logger.info("Application lifespan ended.")

app = FastAPI(lifespan=lifespan, title="EESZT Hackathon Backend API")

@app.post("/api/v1/generate-consultation", response_model=FinalReportResponse)
async def generate_consultation(req: GenerationRequest):
    """
    Executes the Deterministic Linear Pipeline for EESZT integration.
    """
    try:
        # Run E2E pipeline (Scrub -> Parse -> Guardrail -> Translate -> Hydrate)
        hydrated_clinical, hydrated_patient, token_map = state.pipeline.run_consultation(
            raw_transcript=req.transcript,
            metadata_context=req.metadata.model_dump()
        )
        
        # Inject deterministic administrative metadata (bypass)
        administrative_metadata = req.metadata.model_dump(exclude={"context_documents"})
        
        return FinalReportResponse(
            administrative_metadata=administrative_metadata,
            clinical_report=hydrated_clinical,
            patient_summary=hydrated_patient
        )
        
    except Exception as e:
        logger.error(f"Generate Consultation Failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
