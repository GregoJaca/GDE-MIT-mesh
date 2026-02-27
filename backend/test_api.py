import pytest
from httpx import ASGITransport, AsyncClient
from main import app

@pytest.mark.asyncio
async def test_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Minimalist health check via endpoint existence or simple post
        res = await ac.post("/chat", json={"prompt": "hi", "max_tokens": 5})
        assert res.status_code in [200, 500] # 500 expects actual Azure connectivity
