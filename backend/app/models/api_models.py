from typing import List, Optional
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