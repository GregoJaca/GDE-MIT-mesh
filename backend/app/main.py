import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from openai import OpenAI

from app.core.config import Config
from app.core.llm_client import LLMClient
from app.models.api_models import GenerationRequest, FinalReportResponse
from app.services.pipeline import ZeroHallucinationPipeline

from database import get_db, Base, engine
from models import Patient, Doctor, EventCatalog, EHRDocument, ERecept, EBeutalo

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/api/v1/eeszt/patients")
def get_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    return [{"id": p.id, "taj": p.taj, "name": p.name} for p in patients]

@app.get("/api/v1/eeszt/doctors")
def get_doctors(db: Session = Depends(get_db)):
    doctors = db.query(Doctor).all()
    return [{"id": d.id, "name": d.name, "seal_number": d.seal_number} for d in doctors]

@app.get("/api/v1/eeszt/context/{patient_id}")
def get_patient_context(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in EESZT")
        
    documents = db.query(EHRDocument).filter(EHRDocument.patient_id == patient_id).all()
    
    docs_payload = []
    for d in documents:
        docs_payload.append({
            "type": d.doc_type,
            "eeszt_doc_id": d.id,
            "date": str(d.date)
        })
        
    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "taj": patient.taj,
            "dob": str(patient.date_of_birth),
        },
        "context_documents": docs_payload
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
