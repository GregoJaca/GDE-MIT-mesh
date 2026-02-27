import os
import logging
from contextlib import asynccontextmanager
from typing import Dict
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from openai import OpenAI
from pydantic import BaseModel, Field

# minimalist senior architecture
load_dotenv(dotenv_path="../.env")

class Config:
    KEY = os.getenv("OPENAI_API_KEY")
    ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "https://mesh-ai.openai.azure.com/")
    VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
    MODEL = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-5.2")
    BASE_URL = f"{ENDPOINT.rstrip('/')}/openai/v1"

class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    max_tokens: int = 100

class State:
    client: OpenAI | None = None

state = State()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not Config.KEY: raise RuntimeError("ENV MISSING: OPENAI_API_KEY")
    state.client = OpenAI(
        base_url=Config.BASE_URL,
        api_key=Config.KEY,
        default_query={"api-version": Config.VERSION},
        default_headers={"api-key": Config.KEY}
    )
    yield
    state.client = None

app = FastAPI(lifespan=lifespan)

@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        res = state.client.chat.completions.create(
            model=Config.MODEL,
            messages=[{"role": "user", "content": req.prompt}],
            max_tokens=req.max_tokens
        )
        return {"response": res.choices[0].message.content, "usage": res.usage.model_dump()}
    except Exception as e:
        logger.error(f"FAIL: {e}")
        raise HTTPException(500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
