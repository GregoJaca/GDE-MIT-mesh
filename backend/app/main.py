import logging
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.core.llm_client import LLMClient
from app.core.database import get_db
from app.models.api_models import EncounterMetadata, OrchestrationResponse
from app.services.pipeline import ZeroHallucinationPipeline
from app.services.orchestrator import OrchestratorService
from app.models.persistence_models import Patient, EHRDocument

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

class AppState:
    orchestrator: OrchestratorService | None = None

state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    llm = LLMClient()
    pipeline = ZeroHallucinationPipeline(llm=llm)
    state.orchestrator = OrchestratorService(pipeline=pipeline)
    logger.info("Application lifespan started. Orchestrator loaded.")
    yield
    state.orchestrator = None
    logger.info("Application lifespan ended.")

app = FastAPI(lifespan=lifespan, title="Mesh Orchestrated Clinical Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves generated PDFs statically (for hackathon easy access)
app.mount("/outputs", StaticFiles(directory="/tmp"), name="outputs")

@app.post("/api/v1/generate-consultation", response_model=OrchestrationResponse)
async def generate_consultation(
    metadata: str = Form(..., description="JSON string of EncounterMetadata"),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Orchestrated endpoint: Ingests audio, fetches context, runs pipeline, returns PDF/MD links.
    """
    try:
        # 1. Parse Metadata
        meta_dict = json.loads(metadata)
        meta = EncounterMetadata(**meta_dict)
        
        # 2. Save Audio to Temp
        audio_path = f"/tmp/incoming_{meta.patient_id}.wav"
        with open(audio_path, "wb") as buffer:
            buffer.write(await audio.read())
            
        # 3. Run Orchestrator
        pdf_path, summary_md_path = await state.orchestrator.run_full_extraction(
            audio_file_path=audio_path,
            db=db,
            patient_id=meta.patient_id,
            doctor_id_context=meta.doctor_id,
            doctor_name_context=meta.doctor_name,
            doctor_seal_context=meta.doctor_seal,
            encounter_date=meta.encounter_date
        )
        
        # Read MD summary
        with open(summary_md_path, "r", encoding="utf-8") as f:
            summary_content = f.read()
            
        return OrchestrationResponse(
            medical_report_pdf_url=f"/outputs/{pdf_path.split('/')[-1]}",
            patient_summary_md=summary_content,
            administrative_metadata=meta.model_dump()
        )
        
    except Exception as e:
        logger.error(f"Orchestration Failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/eeszt/patients")
async def get_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    return [{"id": p.id, "name": p.name} for p in patients]

@app.get("/api/v1/eeszt/context/{patient_id}")
async def get_patient_context(patient_id: str, db: Session = Depends(get_db)):
    docs = db.query(EHRDocument).filter(EHRDocument.patient_id == patient_id).all()
    return [
        {
            "id": d.id,
            "type": d.doc_type,
            "date": d.date.isoformat(),
            "content": d.content
        } for d in docs
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
