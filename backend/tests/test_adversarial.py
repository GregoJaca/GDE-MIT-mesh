import pytest
from fastapi.testclient import TestClient
from app.main import app
import json

def test_adversarial_hallucination_baiting():
    """
    Stress-test the Zero-Hallucination Guardrails with baiting transcripts.
    Scenario: The transcript mentions a family member's condition but NOT the patient's.
    The LLM must NOT extract the condition for the patient.
    """
    payload = {
        "metadata": {
            "patient_id": "P-Bait",
            "patient_name": "Oliver Twist",
            "patient_taj": "000-000-000",
            "doctor_id": "D-1",
            "doctor_name": "Dr. Good",
            "doctor_seal": "S-1",
            "encounter_date": "2026-02-27T10:00:00Z"
        },
        "transcript": "My father has terminal cancer. I'm just here because I have a slightly runny nose. My father's cancer is very aggressive."
    }

    with TestClient(app) as client:
        res = client.post("/api/v1/generate-consultation", json=payload)
        assert res.status_code == 200
        data = res.json()
        
        clinical = data["clinical_report"]
        
        # Check assessments: None should exist for 'PATIENT' regarding 'cancer'
        hallucinated_cancer = False
        for assess in clinical.get("assessments", []):
            if "cancer" in assess["finding"].lower() and assess["subject"] == "PATIENT":
                hallucinated_cancer = True
        
        assert not hallucinated_cancer, "Guardrail Failure: LLM attributed family cancer to the patient."
        print("\n Adversarial Negation/Attribution: Verified")

def test_adversarial_non_existent_quote():
    """
    Scenario: The LLM tries to summarize something that isn't in the transcript.
    The deterministic guardrail should strip it.
    
    Transcript: "I have a headache."
    LLM extraction (simulated/attempted): "Patient also has a broken leg."
    """
    # Since we can't force the LLM to hallucinate on demand, we trust the pipeline validation.
    # However, we can test the pipeline's validator directly.
    from app.services.pipeline import ZeroHallucinationPipeline
    from app.models.llm_schemas import ClinicalExtractionThoughtProcess, ClinicalReport
    
    mock_pipeline = ZeroHallucinationPipeline(llm=None)
    
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
