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
from app.models.api_models import EncounterMetadata, OrchestrationResponse, DraftResponse, FinalizeRequest, ConsultationRequest
from app.services.pipeline import ZeroHallucinationPipeline
from app.services.orchestrator import OrchestratorService
from app.models.persistence_models import Patient, EHRDocument, MedicalCaseModel, AppointmentModel, Doctor

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
async def finalize_report(request: FinalizeRequest, db: Session = Depends(get_db)):
    try:
        # Fetch patient and doctor from DB via proper dependency injection
        patient = db.query(Patient).filter(Patient.id == request.patient_id).first()
        doctor = db.query(Doctor).filter(Doctor.id == request.doctor_id).first()

        full_metadata = {
            "patient_id": request.patient_id,
            "patient_name": patient.name if patient else "Unknown",
            "patient_taj": patient.taj if patient else "Unknown",
            "doctor_id": request.doctor_id,
            "doctor_name": doctor.name if doctor else "Unknown",
            "doctor_seal": doctor.seal_number if doctor else "N/A",
            "encounter_date": request.encounter_date
        }
        
        # Pass through the patient summary from the draft stage (no re-inference)
        hydrated_patient = {"layman_explanation": request.patient_summary_md or "Finalized document."}
        
        pdf_path, summary_md_path = state.orchestrator.complete_consultation(
            hydrated_clinical=request.edited_clinical_json,
            hydrated_patient=hydrated_patient,
            full_metadata=full_metadata,
            format_id=request.format_id
        )
        
        return OrchestrationResponse(
            medical_report_pdf_url=f"/outputs/{pdf_path.split('/')[-1]}",
            patient_summary_md=request.patient_summary_md or "Finalized",
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

@app.post("/api/v1/test/generate-consultation", response_model=OrchestrationResponse)
async def test_generate_consultation(
    request: ConsultationRequest,
    db: Session = Depends(get_db)
):
    """
    Test endpoint for processing synthetic consultations from JSON (text-only).
    """
    try:
        meta = request.metadata
        pdf_path, summary_md_path = await state.orchestrator.run_extraction_from_text(
            raw_transcript=request.transcript,
            format_id=request.format_id,
            db=db,
            patient_id=meta.patient_id,
            doctor_id=meta.doctor_id,
            encounter_date=meta.encounter_date
        )
        
        with open(summary_md_path, "r", encoding="utf-8") as f:
            summary_content = f.read()
            
        return OrchestrationResponse(
            medical_report_pdf_url=f"/outputs/{pdf_path.split('/')[-1]}",
            patient_summary_md=summary_content,
            administrative_metadata=meta.model_dump()
        )
    except Exception as e:
        logger.error(f"Test Orchestration Failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/eeszt/patients")
async def get_eeszt_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    return [{"id": p.id, "name": p.name} for p in patients]

@app.get("/api/v1/eeszt/context/{patient_id}")
async def get_patient_context(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    docs = db.query(EHRDocument).filter(EHRDocument.patient_id == patient_id).all()
    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "taj": patient.taj,
            "age": 0,
            "gender": "Unknown"
        },
        "context_documents": [
            {
                "system_doc_id": d.id,
                "document_type": d.doc_type,
                "content_summary": d.content
            } for d in docs
        ]
    }

@app.get("/api/v1/cases/{patient_id}")
async def get_cases_by_patient(patient_id: str, db: Session = Depends(get_db)):
    cases = db.query(MedicalCaseModel).filter(MedicalCaseModel.patient_id == patient_id).all()
    return [
        {
            "id": c.id,
            "patientId": c.patient_id,
            "title": c.title,
            "description": c.description or "",
            "status": c.status,
            "createdDate": c.created_date.isoformat(),
            "icon": c.icon or ""
        } for c in cases
    ]

@app.get("/api/v1/appointments/{case_id}")
async def get_appointments_by_case(case_id: str, db: Session = Depends(get_db)):
    apps = db.query(AppointmentModel).filter(AppointmentModel.case_id == case_id).all()
    return [
        {
            "id": a.id,
            "patientId": a.patient_id,
            "caseId": a.case_id,
            "date": a.date.isoformat(),
            "topic": a.topic,
            "doctorId": a.doctor_id or "",
            "status": a.status,
            "report": a.report or "",
            "patientSummary": a.patient_summary or ""
        } for a in apps
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
