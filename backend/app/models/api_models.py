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
    patient_id: str = Field(..., min_length=2, max_length=50)
    patient_name: str = Field(..., min_length=2, max_length=200)
    patient_taj: str = Field(..., pattern=r"^\d{3}-\d{3}-\d{3}$", description="Hungarian TAJ number format")
    doctor_id: str = Field(..., min_length=2, max_length=50)
    doctor_name: str = Field(..., min_length=2, max_length=200)
    doctor_seal: str = Field(..., min_length=2, max_length=50)
    encounter_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?$", description="ISO 8601 Datetime")
    context_documents: List[ContextDocument] = Field(default_factory=list, max_length=50)
    available_doctors: List[DoctorEntry] = Field(default_factory=list, description="List of doctors available for follow-up scheduling.")

class GenerationRequest(BaseModel):
    metadata: EncounterMetadata
    transcript: str = Field(..., min_length=10, max_length=100000, description="The raw audio transcript. Bounded to 100k chars for latency limits.")

class FinalReportResponse(BaseModel):
    administrative_metadata: dict = Field(..., description="Bypass administrative data mapping directly to the frontend.")
    clinical_report: dict = Field(..., description="The highly structured clinical output hydrated back with PII.")
    patient_summary: dict = Field(..., description="The layman translation summary intended for the patient portal.")
