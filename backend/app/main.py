import logging
import json
import subprocess
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.core.llm_client import LLMClient
from app.core.database import get_db
from app.services.db_service import DBService
from app.models.api_models import EncounterMetadata, OrchestrationResponse, DraftResponse, FinalizeRequest
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

@app.post("/api/v1/generate-draft", response_model=DraftResponse)
async def generate_draft(
    patient_id: str = Form(..., description="Used to fetch DB context."),
    doctor_id: str = Form(..., description="Used for referral mapping."),
    encounter_date: str = Form(..., description="ISO 8601 Datetime."),
    language: str = Form("en", description="Translation language."),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        raw_audio_path = f"/tmp/incoming_{patient_id}_raw"
        with open(raw_audio_path, "wb") as buffer:
            buffer.write(await audio.read())
            
        audio_path = f"/tmp/incoming_{patient_id}.wav"
        
        subprocess.run(
            ["ffmpeg", "-y", "-i", raw_audio_path, "-ar", "16000", "-ac", "1", audio_path],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        
        clinical_dict, patient_dict, token_map, full_metadata = await state.orchestrator.generate_draft(
            audio_file_path=audio_path,
            db=db,
            patient_id=patient_id,
            doctor_id=doctor_id,
            encounter_date=encounter_date,
            language=language
        )
        
        return DraftResponse(
            administrative_metadata=full_metadata,
            patient_summary_md=patient_dict.get("layman_explanation", ""),
            clinical_draft_json=clinical_dict,
            token_map=token_map
        )
        
    except Exception as e:
        logger.error(f"Draft Generation Failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/finalize-report", response_model=OrchestrationResponse)
async def finalize_report(request: FinalizeRequest):
    try:
        # Reconstruct the metadata payload
        full_metadata = {
            "patient_id": request.patient_id,
            "patient_name": "Unknown", # we can fix this if needed, or pass it from frontend
            "patient_taj": "Unknown",
            "doctor_name": "Unknown",
            "encounter_date": request.encounter_date
        }
        
        # We need the patient dictionary layout for the complete_consultation
        hydrated_patient = {"layman_explanation": "Finalized document."}
        
        pdf_path, summary_md_path = state.orchestrator.complete_consultation(
            hydrated_clinical=request.edited_clinical_json,
            hydrated_patient=hydrated_patient,
            full_metadata=full_metadata,
            format_id=request.format_id
        )
        
        return OrchestrationResponse(
            medical_report_pdf_url=f"/outputs/{pdf_path.split('/')[-1]}",
            patient_summary_md="Finalized",
            administrative_metadata={
                "patient_id": request.patient_id,
                "doctor_id": request.doctor_id,
                "encounter_date": request.encounter_date,
                "format_id": request.format_id
            }
        )
        
    except Exception as e:
        logger.error(f"Finalization Failed: {e}", exc_info=True)
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
