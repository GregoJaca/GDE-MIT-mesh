import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from app.core.config import Config
from app.core.llm_client import LLMClient
from app.models.api_models import GenerationRequest, FinalReportResponse
from app.services.pipeline import ZeroHallucinationPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

class AppState:
    llm: LLMClient | None = None
    pipeline: ZeroHallucinationPipeline | None = None

state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    state.llm = LLMClient()
    state.pipeline = ZeroHallucinationPipeline(llm=state.llm)
    logger.info("Application lifespan started. LLMClient & Pipeline loaded.")
    yield
    state.llm = None
    state.pipeline = None
    logger.info("Application lifespan ended.")

app = FastAPI(lifespan=lifespan, title="Mesh Hackathon Backend API")

@app.post("/api/v1/generate-consultation", response_model=FinalReportResponse)
async def generate_consultation(req: GenerationRequest):
    """
    Executes the Deterministic Linear Pipeline for system integration.
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
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
