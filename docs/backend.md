# The Backend Pipeline: FastAPI & Orchestration

The Mesh backend is a high-performance **FastAPI** service written in Python 3.10+, utilizing **SQLAlchemy** for persistence and **LangChain** for LLM orchestration.

## Core Endpoints

The system exposes two primary endpoints designed to support the Human-in-the-Loop Zero-Hallucination architecture.

### `POST /api/v1/generate-draft`
This is the entry point for the ambient audio recording. 

1. **Ingestion**: Accepts `multipart/form-data` containing the raw `.webm` or `.wav` audio `Blob`.
2. **Transcription**: Pushed out asynchronously to either a local Whisper instance or Anyscale/OpenAI Whisper endpoints.
3. **Context Hydration**: The `patientId` triggers a database lookup via `db_service.py` to retrieve EESZT pointers.
4. **Draft Generation**: Instead of saving directly to the DB, the Orchestrator returns the strictly-typed `ClinicalDraftJson`, the `patient_summary_md`, and the `actionables` array straight to the client.

### `POST /api/v1/finalize-report`
This endpoint commits the doctor's reviewed facts to the system of record.

1. **Ingestion**: Accepts the JSON payload directly from the Doctor Dashboard review screen.
2. **PDF Compilation**: Under the hood, we use `wkhtmltopdf` combined with a beautiful HTML Jinja template (`app/templates/report.html`) to render the formal hospital EMR document.
3. **Storage**: Both the Markdown patient summary and the PDF URL are saved to the SQLite database via SQLAlchemy schemas.

## The Orchestrator (`app/services/orchestrator.py`)

The true intelligence of Mesh lies in the orchestration layer. 

```python
async def generate_draft(
    audio: UploadFile,
    patient_id: str,
    doctor_id: str,
    date: str,
    language: str,
    fallback_transcript: Optional[str] = None
) -> DraftResponse:
    # 1. Transcribe the audio
    transcript_text = await transcribe_audio(audio)
    
    # 2. Fetch the "Opaque Pointers" from the DB
    patient_context_str = fetch_patient_context_str(patient_id)
    
    # 3. Extract the Structured Data (Pydantic Schema Enforced)
    clinical_dict = generate_extraction_data(transcript_text, patient_context_str)
    
    # 4. Generate the layman's Patient Summary
    patient_summary_md = generate_patient_summary(
        transcript=transcript_text, 
        clinical_dict=clinical_dict, 
        patient_context=patient_context_str,
        language=language
    )
    
    return DraftResponse(...)
```

By decoupling extraction from finalization, Mesh guarantees that no AI artifact ever enters the patient's legal medical record without explicit human sign-off.
