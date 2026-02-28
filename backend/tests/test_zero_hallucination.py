import pytest
from app.services.pipeline import ZeroHallucinationPipeline
from app.models.llm_schemas import ClinicalExtractionThoughtProcess, ClinicalReport, DiagnosticResult, ActionableItem

def test_guardrail_isolation_strips_hallucinations():
    """
    Rigorously tests the deterministic quote validation independently of the LLM.
    We inject a fake LLM response with hallucinated quotes and assert the pipeline actively removes them.
    """
    # Create fake parsed LLM output
    fake_report = ClinicalExtractionThoughtProcess(
        negation_check="No negations.",
        attribution_check="Self.",
        final_validated_clinical_report=ClinicalReport(
            chief_complaints=[
                DiagnosticResult(
                    finding="cough",
                    condition_status="CONFIRMED",
                    subject="PATIENT",
                    exact_quote="i have a cough",
                    contextual_quote="so basically i have a cough since yesterday",
                    system_reference_id=None
                ),
                DiagnosticResult(
                    finding="chest pain",
                    condition_status="CONFIRMED",
                    subject="PATIENT",
                    exact_quote="severe pain",
                    contextual_quote="i am experiencing severe pain in my chest right now", # HALLUCINATED
                    system_reference_id=None
                )
            ],
            assessments=[],
            actionables=[
                ActionableItem(
                    action_type="PHARMACY_PICKUP",
                    description="Take aspirin",
                    timeframe=None,
                    system_reference_id=None,
                    exact_quote="buy aspirin",
                    contextual_quote="you should go buy aspirin from the pharmacy" # HALLUCINATED
                )
            ]
        )
    )

    # Actual transcript that only contains the cough, no chest pain or aspirin.
    scrubbed_transcript = "Doc: What's wrong? Patient: so basically i have a cough since yesterday. Doc: Okay, rest."

    # instantiate pipeline (llm not needed for isolated validation test)
    pipeline = ZeroHallucinationPipeline(llm=None)
    
    validated = pipeline.validate_quotes(fake_report, scrubbed_transcript)

    # The cough should remain, but the chest pain and aspirin should be stripped out
    assert len(validated["chief_complaints"]) == 1
    assert validated["chief_complaints"][0]["finding"] == "cough"
    
    assert len(validated["assessments"]) == 0
    assert len(validated["actionables"]) == 0

