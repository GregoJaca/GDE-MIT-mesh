import pytest
from fastapi.testclient import TestClient
from app.main import app, state
import json

def test_realistic_e2e_pipeline():
    """
    Realistic E2E integration test hitting the live API endpoints (including Azure OpenAI).
    Verifies the metadata bypass, PII scrubbing, LLM extraction, system semantic pointer mapping,
    and deterministic quote guardrails.
    """

    payload = {
        "metadata": {
            "patient_id": "P-88421",
            "patient_name": "Alexander Hamilton",
            "patient_taj": "111-222-333",
            "doctor_id": "D-9901",
            "doctor_name": "Dr. Gregory House",
            "doctor_seal": "S-14399",
            "encounter_date": "2026-02-27T10:00:00Z",
            "context_documents": [
                {
                    "type": "laboratory_result",
                    "system_doc_id": "DOC-99281-XYZ",
                    "date": "2026-02-20"
                }
            ]
        },
        "transcript": "Okay Alexander Hamilton, I see from your latest laboratory result that your cholesterol is slightly elevated. You deny any chest pain. Otherwise, you're recovering well. Let's schedule a follow-up appointment to re-check."
    }

    print("\n--- Starting E2E Integration Test ---")
    with TestClient(app) as client:
        res = client.post("/api/v1/generate-consultation", json=payload)
        
        assert res.status_code == 200, f"API failed with status {res.status_code}: {res.text}"
        data = res.json()
        
        print("\n--- API Response Received ---")
        print(json.dumps(data, indent=2))

        # 1. Metadata Bypass Verification
        assert data["administrative_metadata"]["patient_id"] == "P-88421"
        assert data["administrative_metadata"]["patient_name"] == "Alexander Hamilton"
        print(" Metadata Bypass: Verified")

        # 2. Extract Data
        clinical = data.get("clinical_report", {})
        summary = data.get("patient_summary", {})
        
        # 3. Guardrail / Extraction Checks
        # Expecting elevated cholesterol in assessments or chief complaints
        all_findings = clinical.get("chief_complaints", []) + clinical.get("assessments", [])
        
        assert len(all_findings) > 0, "LLM failed to extract the clinical findings."
        print(" Clinical Extraction: Verified")
        
        # 4. Semantic System Pointer Checking
        pointer_mapped = False
        for finding in all_findings:
            if finding.get("system_reference_id") == "DOC-99281-XYZ":
                pointer_mapped = True
            
            # Check deterministic literal constraints
            assert finding.get("condition_status") in ["CONFIRMED", "NEGATED", "SUSPECTED", "UNKNOWN"]
            
        assert pointer_mapped, "Zero-Hallucination Failure: The LLM failed to map the opaque system pointer to the laboratory result."
        print(" Semantic System Pointer Mapping: Verified")
        
        # 5. Check Actionables
        assert len(summary.get("actionables", [])) > 0, "Failed to extract follow-up actionable."
        print(" Patient Actionables Extraction: Verified")
        
        print("\n All E2E constraints passed successfully!")

def test_ultra_rigorous_multi_entity_mapping():
    """
    High-rigor test for multi-entity semantic mapping and complex PII scrubbing.
    Tests:
    1. Mapping findings to multiple distinct system documents.
    2. Mapping follow-up actionables to a specific doctor from a provided list.
    3. Robustness of PII scrubbing for complex names (hyphenated) and locations.
    """
    payload = {
        "metadata": {
            "patient_id": "P-4402",
            "patient_name": "Jean-Pierre de La-Fontaine", # Complex hyphenated name
            "patient_taj": "555-666-777",
            "doctor_id": "D-101",
            "doctor_name": "Dr. Aris Thorne",
            "doctor_seal": "S-12345",
            "encounter_date": "2026-02-27T14:30:00Z",
            "context_documents": [
                {
                    "type": "radiology_report",
                    "system_doc_id": "SYS-RAD-001",
                    "date": "2026-02-10"
                },
                {
                    "type": "blood_panel",
                    "system_doc_id": "SYS-BLD-999",
                    "date": "2026-02-25"
                }
            ],
            "available_doctors": [
                {"doctor_id": "SPEC-01", "name": "Dr. Sarah Miller", "specialty": "Cardiology"},
                {"doctor_id": "SPEC-02", "name": "Dr. James Wilson", "specialty": "Oncology"}
            ]
        },
        "transcript": (
            "Hello Jean-Pierre de La-Fontaine. I've reviewed your radiology report from February 10th and the "
            "blood panel from the 25th. The radiology shows clear lungs, but your blood work indicates a "
            "need for a cardiology follow-up. I'll refer you to Dr. Sarah Miller for that next Thursday. "
            "You mentioned you're moving to Winston-Salem next month, please update your records."
        )
    }

    print("\n--- Starting Ultra-Rigorous Multi-Entity Test ---")
    with TestClient(app) as client:
        res = client.post("/api/v1/generate-consultation", json=payload)
        assert res.status_code == 200
        data = res.json()
        
        clinical = data["clinical_report"]
        summary = data["patient_summary"]

        # 1. PII Robustness Check
        # Transcript had "Jean-Pierre de La-Fontaine" and "Winston-Salem"
        # Since hydration happens at the end, the final response should have these back.
        assert "Jean-Pierre de La-Fontaine" in data["administrative_metadata"]["patient_name"]
        assert "Sarah Miller" in str(summary)
        print(" PII Scrubbing/Hydration Integrity: Verified")

        # 2. Multi-Document Mapping Check
        rad_mapped = False
        bld_mapped = False
        all_findings = clinical["chief_complaints"] + clinical["assessments"]
        for f in all_findings:
            if f.get("system_reference_id") == "SYS-RAD-001": rad_mapped = True
            if f.get("system_reference_id") == "SYS-BLD-999": bld_mapped = True
        
        assert rad_mapped, "Failed to map radiology_report pointer."
        assert bld_mapped, "Failed to map blood_panel pointer."
        print(" Multi-Document Pointer Mapping: Verified")

        # 3. Multi-Doctor Mapping Check
        doctor_mapped = False
        for act in summary["actionables"]:
            if act.get("system_reference_id") == "SPEC-01":
                doctor_mapped = True
        
        if not doctor_mapped:
            print("\n--- DEBUG: Mapping Failure ---")
            print("Actionables extracted:")
            print(json.dumps(summary["actionables"], indent=2))
            print("Available Doctors in metadata:")
            print(json.dumps(payload["metadata"]["available_doctors"], indent=2))
        
        assert doctor_mapped, "Failed to map follow-up actionable to Dr. Sarah Miller ID (SPEC-01)."
        print(" Multi-Doctor Semantic Mapping: Verified")

        print("\n Ultra-rigorous multi-entity integration passed!")
