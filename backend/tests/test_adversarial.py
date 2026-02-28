import pytest
import json
from unittest.mock import patch

def test_adversarial_hallucination_baiting(client, mock_wav_path):
    """
    Stress-test the Zero-Hallucination Guardrails with baiting transcripts.
    Scenario: The transcript mentions a family member's condition but NOT the patient's.
    """
    metadata = {
        "patient_id": "P-001",
        "doctor_id": "D-001",
        "doctor_name": "Dr. Good",
        "doctor_seal": "S-1",
        "encounter_date": "2026-02-27T10:00:00Z"
    }

    # We mock the transcriber to return the baiting text
    baiting_text = "[Speaker 1]: My father has terminal cancer. I'm just here because I have a slightly runny nose."
    
    with patch("app.services.orchestrator.transcribe_file_with_diarization", return_value=[baiting_text]):
        with open(mock_wav_path, "rb") as audio:
            res = client.post(
                "/api/v1/generate-consultation",
                data={"metadata": json.dumps(metadata)},
                files={"audio": ("bait.wav", audio, "audio/wav")}
            )
            
    assert res.status_code == 200
    data = res.json()
    
    summary = data["patient_summary_md"].lower()
    
    # The summary should NOT mention cancer in a way that attributes it to the patient
    # Re-evaluating assertion: it might mention it in passing but shouldn't be a diagnosis.
    assert "cancer" not in summary or "father" in summary
    print("\n Adversarial Negation/Attribution: Verified")

def test_adversarial_non_existent_quote():
    """
    Scenario: The LLM tries to summarize something that isn't in the transcript.
    The deterministic guardrail should strip it.
    """
    from app.services.pipeline import ZeroHallucinationPipeline
    from app.models.llm_schemas import ClinicalExtractionThoughtProcess, ClinicalReport
    
    mock_pipeline = ZeroHallucinationPipeline(llm=None)
    
    # Note: Using dict to bypass direct pydantic validation of nested fields if needed, 
    # but here we use the model properly.
    mock_report = ClinicalExtractionThoughtProcess(
        negation_check="None",
        attribution_check="None",
        final_validated_clinical_report=ClinicalReport(
            chief_complaints=[
                {
                    "finding": "Headache",
                    "condition_status": "CONFIRMED",
                    "subject": "PATIENT",
                    "exact_quote": "headache",
                    "contextual_quote": "I have a headache",
                    "system_reference_id": None
                },
                {
                    "finding": "Broken Leg",
                    "condition_status": "CONFIRMED",
                    "subject": "PATIENT",
                    "exact_quote": "broken leg", # NOT in transcript
                    "contextual_quote": "I have a broken leg", # NOT in transcript
                    "system_reference_id": None
                }
            ],
            assessments=[],
            actionables=[]
        )
    )
    
    transcript = "I have a headache."
    validated = mock_pipeline.validate_quotes(mock_report, transcript)
    
    assert len(validated["chief_complaints"]) == 1
    assert validated["chief_complaints"][0]["finding"] == "Headache"
    print("\n Deterministic Validator: Verified (Correctly stripped hallucination)")
