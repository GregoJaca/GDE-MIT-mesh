import logging
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.core.llm_client import LLMClient
from app.core.database import get_db
from app.services.db_service import DBService
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

@app.get("/api/v1/patients")
def get_patients(db: Session = Depends(get_db)):
    """Returns a list of all patients."""
    return DBService.get_all_patients(db)

@app.get("/api/v1/doctors")
def get_doctors(db: Session = Depends(get_db)):
    """Returns a list of all available doctors."""
    return DBService.get_available_doctors(db)

@app.post("/api/v1/generate-consultation", response_model=OrchestrationResponse)
async def generate_consultation(
    patient_id: str = Form(..., description="Used to fetch DB context."),
    doctor_id: str = Form(..., description="Used for referral mapping."),
    encounter_date: str = Form(..., description="ISO 8601 Datetime."),
    format_id: str = Form("fmt_001", description="Report format ID."),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Orchestrated endpoint: Ingests minimal metadata + audio, fetches context internally, returns PDF/MD links.
    """
    try:
        # 1. Save Audio to Temp
        audio_path = f"/tmp/incoming_{patient_id}.wav"
        with open(audio_path, "wb") as buffer:
            buffer.write(await audio.read())
        
        # 2. Run Orchestrator
        pdf_path, summary_md_path = await state.orchestrator.run_full_extraction(
            audio_file_path=audio_path,
            format_id=format_id,
            db=db,
            patient_id=patient_id,
            doctor_id=doctor_id,
            encounter_date=encounter_date
        )
        
        # Read MD summary
        with open(summary_md_path, "r", encoding="utf-8") as f:
            summary_content = f.read()
            
        return OrchestrationResponse(
            medical_report_pdf_url=f"/outputs/{pdf_path.split('/')[-1]}",
            patient_summary_md=summary_content,
            administrative_metadata={
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "encounter_date": encounter_date,
                "format_id": format_id
            }
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
