# Backend Pipeline

Echo is powered by an edge-optimized **FastAPI** Python architecture. We use **SQLAlchemy** for data persistence and **Azure OpenAI** for high-precision inference, utilizing the `beta.chat.completions.parse` Structured Outputs API.

## Pipeline Execution

The system explicitly decouples AI extraction from database commitment, enforcing our Zero-Hallucination strategy by ensuring a physician reviews all output before persistence.

### 1. `POST /api/v1/generate-draft`
This is the core execution endpoint handling the ambient audio.
- Takes the raw binary audio blob.
- Connects to the transcription engine.
- Pulls Opaque Pointers from the database via `db_service.py`.
- Dispatches to Azure OpenAI, strictly enforcing Pydantic models.
- Executes the deterministic String-Match Guardrail against the exact quotes directly in Python.
- Returns an aggregated dictionary to the client without executing any database mutations.

### 2. `POST /api/v1/finalize-report`
This is the commit endpoint.
- Accepts the physician-audited JSON structure.
- Renders the structured data into a pristine, hospital-grade PDF via heavily optimized HTML-to-PDF pipelining (`wkhtmltopdf`).
- Formalizes the database relationships, saving the PDF trajectory and Markdown blobs to the patient history.

## Intelligence Orchestration

Inside `app/services/orchestrator.py`, the core orchestration flows sequentially, invoking the `ZeroHallucinationPipeline`.

```python
# The core zero-hallucination executor
scrubbed_transcript, token_map = scrubber.scrub(raw_transcript)

# 1. Structure the extraction directly into Pydantic via Azure OpenAI
thought_process = pipeline.generate_clinical_report(scrubbed_transcript, system_context)

# 2. Run deterministic Python string check against exact_quote
validated_clinical_dict = pipeline.validate_quotes(thought_process, scrubbed_transcript)

# 3. Request multi-lingual patient summary
patient_summary_dict = pipeline.generate_patient_summary(...)

# 4. Re-hydrate PII
hydrated_clinical = scrubber.hydrate_dict(validated_clinical_dict, token_map)
return hydrated_clinical, ...
```

The strict segregation of raw inference parsing from the deterministic Python validation completely eliminates the reliance on the LLM to govern its own factual accuracy. The API response boundary is always verified, identical, and safe across every consultation.
