# Backend Pipeline

Echo is powered by an edge-optimized **FastAPI** Python architecture. We use **SQLAlchemy** for data persistence and **LangChain** for orchestrating complex LLM pipelines utilizing **GPT-5.2**.

## Pipeline Execution

The system explicitly decouples AI extraction from database commitment, enforcing our Zero-Hallucination strategy by ensuring a physician reviews all output.

### 1. `POST /api/v1/generate-draft`
This is the core execution endpoint handling the ambient audio.
- Takes the raw binary audio blob.
- Connects to the transcription engine.
- Pulls Opaque Pointers from the database via `db_service.py`.
- Dispatches to LangChain and GPT-5.2, strictly enforcing Pydantic models.
- Returns an aggregated dictionary to the client without executing any database mutations.

### 2. `POST /api/v1/finalize-report`
This is the commit endpoint.
- Accepts the physician-audited JSON structure.
- Renders the structured data into a pristine, hospital-grade PDF via heavily optimized HTML-to-PDF pipelining.
- Formalizes the database relationships, saving the PDF trajectory and Markdown blobs to the patient history.

## Intelligence Orchestration

Inside `app/services/orchestrator.py`, the AI logic operates purely functionally:

```python
async def generate_draft(
    audio: UploadFile,
    patient_id: str,
    doctor_id: str,
    language: str
) -> DraftResponse:
    # Transcribe the audio chunk
    transcript_text = await transcribe_audio(audio)
    
    # Retrieve EESZT compliance pointers
    patient_context_str = fetch_patient_context_str(patient_id)
    
    # Extract Strict Pydantic Data Matrix via GPT-5.2
    clinical_dict = generate_extraction_data(transcript_text, patient_context_str)
    
    # Generate Multilingual Patient Output
    patient_summary_md = generate_patient_summary(
        transcript=transcript_text, 
        clinical_dict=clinical_dict, 
        language=language
    )
    
    return DraftResponse(...)
```

The strictness of this orchestrator code prevents silent errors and ensures the API response boundary is always identical across every consultation.
