import requests
import json
import time

print("Testing /api/v1/generate-draft")
url = "http://localhost:8000/api/v1/generate-draft"
audio_file = ('dummy_audio.wav', open('backend/dummy_audio.wav', 'rb'), 'audio/wav')

data = {
    'patient_id': "P-001",
    'doctor_id': 'D-99',
    'encounter_date': '2026-03-01T10:00:00Z',
    'language': 'es'
}

files = {'audio': audio_file}
resp = requests.post(url, data=data, files=files)
print(f"Status: {resp.status_code}")
if resp.status_code != 200:
    print(resp.text)
    exit(1)

draft = resp.json()
print("Draft generated successfully!")

print("\nTesting /api/v1/finalize-report")
url_fin = "http://localhost:8000/api/v1/finalize-report"
req = {
    "patient_id": "P-001",
    "doctor_id": "D-99",
    "encounter_date": "2026-03-01T10:00:00Z",
    "format_id": "fmt_001",
    "edited_clinical_json": draft['clinical_draft_json']
}

resp_fin = requests.post(url_fin, json=req)
print(f"Status: {resp_fin.status_code}")
if resp_fin.status_code != 200:
    print(resp_fin.text)
    exit(1)

final = resp_fin.json()
print(f"PDF URL: {final['medical_report_pdf_url']}")
print(f"Summary Length: {len(final['patient_summary_md'])}")
print("E2E Test Passed Flawlessly!")
