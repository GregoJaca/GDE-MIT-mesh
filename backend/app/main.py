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
from app.models.api_models import (
    EncounterMetadata, OrchestrationResponse, DraftResponse, FinalizeRequest,
    ConsultationRequest, DebugDraftRequest, DebugDraftResponse
)
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

import os as _os
from fastapi.responses import FileResponse as _FileResponse

# Serves generated PDFs statically (for hackathon easy access)
app.mount("/outputs", StaticFiles(directory="/tmp"), name="outputs")

_DEBUG_HTML = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "..", "debug_console.html")

@app.get("/debug", include_in_schema=False)
@app.get("/debug/", include_in_schema=False)
async def serve_debug_console():
    """Serves the pipeline debug console HTML page."""
    if _os.path.exists(_DEBUG_HTML):
        return _FileResponse(_DEBUG_HTML, media_type="text/html")
    return {"error": "debug_console.html not found — run from backend directory"}

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
    transcript: str = Form(None, description="Optional fallback transcript from frontend WebSpeech API"),
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
            language=language,
            fallback_transcript=transcript
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


@app.post("/api/v1/debug/run-draft", response_model=DebugDraftResponse)
async def debug_run_draft(request: DebugDraftRequest, db: Session = Depends(get_db)):
    """
    DEBUG ENDPOINT — Text-only pipeline entry point for prompt engineering and integration testing.

    Bypasses Azure Speech transcription entirely.  The provided `transcript` field is fed
    directly into the PII scrubbing + LLM extraction pipeline, returning every intermediate
    artifact for inspection:
      - DB context loaded (EHR docs, doctors) — what the LLM sees
      - Raw vs scrubbed transcript + token map
      - The exact system_context string injected into the system prompt
      - Raw LLM extraction output (before guardrail)
      - Which exact_quote strings were stripped by the guardrail
      - The validated clinical draft
      - Patient summary (LLM call 2)
      - Hydrated finals (PII restored)
    """
    import json
    from app.services.scrubber import scrubber as _scrubber
    from app.core.prompts import CLINICAL_EXTRACTION_SYSTEM_PROMPT, PATIENT_SUMMARY_SYSTEM_PROMPT

    try:
        # 1. Fetch DB context (same as production path)
        patient_meta, context_docs = DBService.get_patient_context(db, request.patient_id)
        if not patient_meta:
            raise HTTPException(status_code=404, detail=f"Patient {request.patient_id} not found.")

        doctor_meta = DBService.get_doctor_context(db, request.doctor_id)
        available_doctors = DBService.get_available_doctors(db)
        available_doctor_categories = [
            {"doctor_id": d["doctor_id"], "specialty": d["specialty"]} for d in available_doctors
        ]

        full_metadata = {
            "patient_id": request.patient_id,
            "patient_name": patient_meta["name"],
            "patient_taj": patient_meta["taj"],
            "doctor_id": request.doctor_id,
            "doctor_name": doctor_meta["name"],
            "doctor_seal": doctor_meta["seal_number"],
            "encounter_date": request.encounter_date,
            "context_documents": context_docs,
            "available_doctor_categories": available_doctor_categories,
        }

        # 2. PII Scrub (skippable for testing with already-anonymized text)
        raw_transcript = request.transcript
        if request.skip_pii_scrub:
            scrubbed_transcript = raw_transcript
            token_map = {}
        else:
            scrubbed_transcript, token_map = _scrubber.scrub(raw_transcript)

        # 3. Build system_context string exactly as production does
        system_context = json.dumps({
            "context_documents": full_metadata.get("context_documents", []),
            "available_doctor_categories": full_metadata.get("available_doctor_categories", [])
        })

        # 4. LLM Call 1: Clinical Extraction + Guardrail (instrumented)
        # Handle case when called directly from TestClient outside lifespan 
        if state.orchestrator and state.orchestrator.pipeline:
            pipeline = state.orchestrator.pipeline
        else:
            from app.core.llm_client import LLMClient
            from app.services.pipeline import ZeroHallucinationPipeline
            llm = LLMClient()
            pipeline = ZeroHallucinationPipeline(llm=llm)

        thought_process = pipeline.generate_clinical_report(scrubbed_transcript, system_context)
        raw_extraction = thought_process.final_validated_clinical_report.model_dump()

        # Identify which quotes the guardrail would strip
        hallucinations_stripped: list[str] = []
        def _check_item(item: dict) -> bool:
            quote = item.get("exact_quote", "")
            valid = bool(quote) and scrubbed_transcript.find(quote) != -1
            if not valid:
                hallucinations_stripped.append(quote or "<empty quote>")
            return valid

        validated_clinical = {
            "chief_complaints": [c for c in raw_extraction["chief_complaints"] if _check_item(c)],
            "assessments": [a for a in raw_extraction["assessments"] if _check_item(a)],
            "actionables": [act for act in raw_extraction["actionables"] if _check_item(act)],
        }

        # 5. LLM Call 2: Patient Summary
        patient_summary_dict = pipeline.generate_patient_summary(
            validated_clinical_dict=validated_clinical,
            scrubbed_transcript=scrubbed_transcript,
            system_context=system_context,
            language=request.language,
        )

        # 6. Hydrate (restore PII tokens)
        hydrated_clinical = _scrubber.hydrate_dict(validated_clinical, token_map)
        hydrated_patient = _scrubber.hydrate_dict(patient_summary_dict, token_map)

        return DebugDraftResponse(
            patient_meta=patient_meta,
            doctor_meta=doctor_meta,
            context_documents=context_docs,
            available_doctor_categories=available_doctor_categories,
            raw_transcript=raw_transcript,
            scrubbed_transcript=scrubbed_transcript,
            token_map=token_map,
            system_context_injected=system_context,
            clinical_extraction_raw=raw_extraction,
            hallucinations_stripped=hallucinations_stripped,
            clinical_draft_validated=validated_clinical,
            patient_summary_md=patient_summary_dict.get("layman_explanation", ""),
            clinical_final_hydrated=hydrated_clinical,
            patient_summary_hydrated=hydrated_patient.get("layman_explanation", ""),
            full_metadata=full_metadata,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Debug Draft Failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/debug/db-context/{patient_id}")
async def debug_db_context(patient_id: str, doctor_id: str = "D-99", db: Session = Depends(get_db)):
    """
    DEBUG ENDPOINT — Dumps the exact system_context JSON that gets injected into every LLM prompt
    for a given patient, so you can inspect what the model actually sees.

    Also returns raw patient meta, doctor meta, and the full list of available doctors.
    """
    import json
    patient_meta, context_docs = DBService.get_patient_context(db, patient_id)
    if not patient_meta:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")

    doctor_meta = DBService.get_doctor_context(db, doctor_id)
    available_doctors = DBService.get_available_doctors(db)
    available_doctor_categories = [
        {"doctor_id": d["doctor_id"], "specialty": d["specialty"]} for d in available_doctors
    ]

    system_context = json.dumps({
        "context_documents": context_docs,
        "available_doctor_categories": available_doctor_categories,
    }, indent=2)

    return {
        "patient_meta": patient_meta,
        "doctor_meta": doctor_meta,
        "context_documents": context_docs,
        "available_doctors_full": available_doctors,
        "available_doctor_categories": available_doctor_categories,
        "system_context_injected_into_llm": system_context,
        "clinical_extraction_system_prompt_preview": (
            f"[CLINICAL_EXTRACTION_SYSTEM_PROMPT with system_context injected — "
            f"{len(system_context)} chars of context]"
        ),
    }


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
