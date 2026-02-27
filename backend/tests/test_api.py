import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_generate_consultation_schema_success():
    """Validates the input Pydantic schema rejection for invalid metadata."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        
        # Missing transcript
        res = await ac.post("/api/v1/generate-consultation", json={
            "metadata": {
                "patient_id": "123",
                "patient_name": "John Doe",
                "patient_taj": "123-456-789",
                "doctor_id": "D-456",
                "doctor_name": "Dr. Smith",
                "doctor_seal": "S-99",
                "encounter_date": "2026-02-27T10:00:00Z"
            }
        })
        assert res.status_code == 422 # Pydantic Validation Error

@pytest.mark.asyncio
async def test_schema_validation():
    """Tests proper 422 HTTP validation structure."""
    # To fully test, we'd mock `state.client`, but for MVPs simply asserting the endpoint exists and validates 
    # the schema is a strong 80/20 test.
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        
        # Missing patient_taj in metadata
        res = await ac.post("/api/v1/generate-consultation", json={
            "metadata": {
                "patient_id": "123",
                "patient_name": "John Doe",
                "doctor_id": "D-456",
                "doctor_name": "Dr. Smith",
                "doctor_seal": "S-99",
                "encounter_date": "2026-02-27T10:00:00Z"
            },
            "transcript": "Test audio transcript."
        })
        assert res.status_code == 422
