import logging
from typing import Type, TypeVar, List, Dict, Any
from openai import AzureOpenAI
from pydantic import BaseModel
from app.core.config import Config

T = TypeVar("T", bound=BaseModel)
logger = logging.getLogger(__name__)

class LLMClient:
    """
    Factored LLM Client for handling Azure OpenAI interactions.
    Encapsulates initialization, parsing, and error handling.
    """
    def __init__(self):
        # Validate all critical configuration points
        required_vars = {
            "OPENAI_API_KEY": Config.KEY,
            "AZURE_OPENAI_ENDPOINT": Config.ENDPOINT,
            "AZURE_OPENAI_DEPLOYMENT_NAME": Config.MODEL
        }
        
        missing = [var for var, val in required_vars.items() if not val]
        if missing:
            raise RuntimeError(f"CRITICAL: Environment variables missing: {', '.join(missing)}")
        
        self.client = AzureOpenAI(
            azure_endpoint=Config.ENDPOINT,
            api_key=Config.KEY,
            api_version=Config.VERSION
        )
        self.model = Config.MODEL
        logger.info(f"LLMClient initialized. Deployment: {self.model}")

    def parse_completion(
        self, 
        messages: List[Dict[str, str]], 
        response_format: Type[T],
        max_tokens: int = 4000
    ) -> T:
        """
        Generic structured output parser using the OpenAI Beta parse API.
        """
        try:
            response = self.client.beta.chat.completions.parse(
                model=self.model,
                messages=messages,
                response_format=response_format,
                max_tokens=max_tokens
            )
            return response.choices[0].message.parsed
        except Exception as e:
            logger.error(f"LLM Parsing failed: {e}")
            raise
