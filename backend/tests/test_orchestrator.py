from unittest.mock import patch
import json
import os

@patch("app.services.orchestrator.transcribe_file_with_diarization")
def test_full_orchestration_flow(mock_transcribe, mock_wav_path, client):
    """
    Test the E2E flow: Audio -> Orchestrator -> Pipeline -> PDF/MD Report.
    """
    # 1. Setup Mocks
    mock_transcribe.return_value = ["[Speaker 1]: Patient complains of chest pain and shortness of breath."]
    
    metadata = {
        "patient_id": "P-001",
        "doctor_id": "D-99",
        "doctor_name": "Dr. Sarah Miller",
        "doctor_seal": "S-Miller-99",
        "encounter_date": "2026-02-28T10:00:00Z"
    }
    
    # 2. Call API
    with open(mock_wav_path, "rb") as audio:
        response = client.post(
            "/api/v1/generate-consultation",
            data={"metadata": json.dumps(metadata)},
            files={"audio": ("test.wav", audio, "audio/wav")}
        )
    
    # 3. Assertions
    assert response.status_code == 200
    data = response.json()
    
    # Check Response Schema
    assert "medical_report_pdf_url" in data
    assert "patient_summary_md" in data
    assert "administrative_metadata" in data
    
    # Check if files were actually created (URL maps to /tmp/ in dev)
    pdf_filename = data["medical_report_pdf_url"].split("/")[-1]
    # In tests, we mount /tmp to StaticFiles, so we check /tmp
    assert os.path.exists(f"/tmp/{pdf_filename}")
    
    # Check Summary Content
    summary_lower = data["patient_summary_md"].lower()
    assert "chest pain" in summary_lower
    assert "breath" in summary_lower or "breathing" in summary_lower
    
    print("\n[SUCCESS] E2E Orchestration verified.")
