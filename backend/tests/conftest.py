import pytest
import os
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def mock_wav_path():
    """Creates a dummy wav file."""
    path = "/tmp/test_audio.wav"
    with open(path, "wb") as f:
        # Minimal WAV header
        f.write(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00")
    yield path
    if os.path.exists(path):
        os.remove(path)
