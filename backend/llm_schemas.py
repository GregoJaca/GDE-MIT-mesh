from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from config import SchemaConstraints

class DiagnosticResult(BaseModel):
    finding: str
    condition_status: SchemaConstraints.CONDITION_STATUS = Field(
        ..., description="The clinical status of the finding."
    )
    subject: SchemaConstraints.SUBJECT = Field(
        ..., description="Who the condition belongs to."
    )
    exact_quote: str = Field(
        ..., description="The exact literal 1-4 word substring from the transcript."
    )
    contextual_quote: str = Field(
        ..., description="The exact phrase including the 5 words before and after the exact_quote."
    )
    system_reference_id: Optional[str] = Field(
        default=None, description="The eeszt_doc_id from the available_context if this finding refers to past documents."
    )

class ActionableItem(BaseModel):
    action_type: SchemaConstraints.ACTION_TYPE
    description: str = Field(..., description="Action description.")
    timeframe: Optional[str] = Field(default=None, description="e.g., 'Within 2 days', 'Next Tuesday'")
    system_reference_id: Optional[str] = Field(
        default=None, description="A reference to an EESZT ID or newly generated eRecept."
    )
    exact_quote: str = Field(..., description="Exact substring from transcript justifying this action.")
    contextual_quote: str = Field(..., description="The surrounding phrase containing the exact quote.")

class ClinicalReport(BaseModel):
    chief_complaints: List[DiagnosticResult]
    assessments: List[DiagnosticResult]
    medications: List[ActionableItem]

class ClinicalExtractionThoughtProcess(BaseModel):
    negation_check: str = Field(
        ..., description="Step 1: Explicitly state any negations heard (e.g., 'Patient denied chest pain')."
    )
    attribution_check: str = Field(
        ..., description="Step 2: Outline the subjects mentioned to distinguish patient vs family."
    )
    final_validated_clinical_report: ClinicalReport = Field(
        ..., description="Step 3: The final clinical report extracted from the transcript."
    )

class PatientSummary(BaseModel):
    layman_explanation: str = Field(
        ..., description="A simple, reassuring explanation of the visit for the patient."
    )
    actionables: List[ActionableItem] = Field(
        ..., description="Clear instructions for the patient to follow, directly mapping to the clinical report."
    )
