from typing import List, Optional
from pydantic import BaseModel, Field

class ContextDocument(BaseModel):
    doc_type: str = Field(..., alias="type")
    eeszt_doc_id: str
    date: Optional[str] = None
    
    class Config:
        populate_by_name = True

class EncounterMetadata(BaseModel):
    patient_id: str
    patient_name: str
    patient_taj: str
    doctor_id: str
    doctor_name: str
    doctor_seal: str
    encounter_date: str
    context_documents: List[ContextDocument] = Field(default_factory=list)

class GenerationRequest(BaseModel):
    metadata: EncounterMetadata
    transcript: str = Field(..., description="The raw audio transcript.")

class FinalReportResponse(BaseModel):
    administrative_metadata: dict
    clinical_report: dict
    patient_summary: dict
