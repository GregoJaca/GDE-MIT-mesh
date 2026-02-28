import pytest
import json
import os
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)

@pytest.fixture
def mock_wav():
    """Creates a dummy wav file."""
    path = "/tmp/test_audio.wav"
    with open(path, "wb") as f:
        f.write(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00")
    yield path
    if os.path.exists(path):
        os.remove(path)

@patch("app.services.orchestrator.transcribe_file_with_diarization")
def test_full_orchestration_flow(mock_transcribe, mock_wav):
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
    with TestClient(app) as client:
        with open(mock_wav, "rb") as audio:
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
    
    # Check if files were actually created in /tmp
    pdf_filename = data["medical_report_pdf_url"].split("/")[-1]
    assert os.path.exists(f"/tmp/{pdf_filename}")
    
    # Check Summary Content
    assert "shortness of breath" in data["patient_summary_md"].lower()
    
    print("\n[SUCCESS] E2E Orchestration verified.")
    print(f"PDF Link: {data['medical_report_pdf_url']}")
    print(f"Summary Start: {data['patient_summary_md'][:100]}...")
