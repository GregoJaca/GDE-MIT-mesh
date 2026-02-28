from typing import List, Optional, Any
from pydantic import BaseModel, Field

class DoctorEntry(BaseModel):
    doctor_id: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=200)
    specialty: Optional[str] = Field(None, max_length=100)

class ContextDocument(BaseModel):
    doc_type: str = Field(..., alias="type", min_length=2, max_length=50)
    system_doc_id: str = Field(..., min_length=5, max_length=100, pattern=r"^[A-Za-z0-9\-\_]+$")
    date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="ISO format date YYYY-MM-DD")
    
    model_config = {
        "populate_by_name": True
    }

class EncounterMetadata(BaseModel):
    patient_id: str = Field(..., description="Used to fetch DB context.")
    doctor_id: str = Field(..., description="Used for referral mapping.")
    encounter_date: str = Field(..., description="ISO 8601 Datetime.")
    format_id: str = Field(default="fmt_001", description="Report format ID.")

class ConsultationRequest(BaseModel):
    metadata: EncounterMetadata
    transcript: str = Field(..., description="The dictated notes/transcript")
    format_id: str = Field(default="fmt_001", description="The ID of the report format to generate")

class DraftResponse(BaseModel):
    administrative_metadata: dict
    patient_summary_md: str
    clinical_draft_json: dict = Field(..., description="The editable, hydrated clinical dictionary.")
    token_map: dict = Field(default={}, description="The presidio token map required for final re-hydration.")

class FinalizeRequest(BaseModel):
    appointment_id: Optional[str] = None
    patient_id: str
    doctor_id: str
    encounter_date: str
    format_id: str = "fmt_001"
    edited_clinical_json: dict
    patient_summary_md: Optional[str] = None

class OrchestrationResponse(BaseModel):
    medical_report_pdf_url: str
    patient_summary_md: str
    administrative_metadata: dict

# ── Debug / Testing models ─────────────────────────────────────────────────────

class DebugDraftRequest(BaseModel):
    """
    Text-only entry point that bypasses audio entirely.
    Injects the transcript directly after PII scrub and runs the full
    LLM pipeline, returning every intermediate artifact for inspection.
    """
    patient_id: str = Field(..., description="Patient to load EHR context for.")
    doctor_id: str = Field(default="D-99", description="Doctor ID for referral mapping.")
    encounter_date: str = Field(default="2026-02-28T10:00:00Z", description="ISO 8601.")
    language: str = Field(default="en", description="Patient summary language (en/hu/es).")
    transcript: str = Field(..., description="Raw transcript text — replaces audio transcription step.")
    skip_pii_scrub: bool = Field(
        default=False,
        description="If true, skips Presidio and sends the transcript verbatim to the LLM. "
                    "Useful when transcript is already anonymized."
    )

class DebugStageResult(BaseModel):
    """One stage of the debug pipeline trace."""
    stage: str
    input_preview: str
    output: Any
    warning: Optional[str] = None

class DebugDraftResponse(BaseModel):
    """
    Full debug output — every intermediate in the pipeline exposed.
    """
    # DB context
    patient_meta: dict
    doctor_meta: dict
    context_documents: List[dict]
    available_doctor_categories: List[dict]
    
    # PII scrub
    raw_transcript: str
    scrubbed_transcript: str
    token_map: dict

    # LLM system context (exactly what gets injected into system prompt)
    system_context_injected: str

    # LLM Call 1: Clinical extraction
    clinical_extraction_raw: dict       # before guardrail stripping
    hallucinations_stripped: List[str]  # quotes that failed verbatim check
    clinical_draft_validated: dict      # after guardrail
    
    # LLM Call 2: Patient summary
    patient_summary_md: str

    # Hydrated (PII restored)
    clinical_final_hydrated: dict
    patient_summary_hydrated: str

    # Metadata context sent to all LLM calls
    full_metadata: dict