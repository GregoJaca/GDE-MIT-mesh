import os
from dotenv import load_dotenv
from typing import Literal

# Load from superior directory dynamically
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(BASE_DIR, '../.env'))

class Config:
    KEY = os.getenv("OPENAI_API_KEY")
    ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "https://mesh-ai.openai.azure.com/")
    VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
    # For structured outputs, we need either gpt-4o or a deployment that supports `response_format` of json_schema type
    MODEL = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o") 
    BASE_URL = f"{ENDPOINT.rstrip('/')}/openai/v1"
    
    # Centralized LLM magic numbers
    MAX_TOKENS_CLINICAL_EXTRACTION = int(os.getenv("MAX_TOKENS_CLINICAL_EXTRACTION", "16384"))
    MAX_TOKENS_PATIENT_SUMMARY = int(os.getenv("MAX_TOKENS_PATIENT_SUMMARY", "8192"))
    MAX_TOKENS_DEFAULT = int(os.getenv("MAX_TOKENS_DEFAULT", "4000"))

class SchemaConstraints:
    CONDITION_STATUS = Literal["CONFIRMED", "NEGATED", "SUSPECTED", "UNKNOWN"]
    SUBJECT = Literal["PATIENT", "FAMILY_MEMBER"]
    ACTION_TYPE = Literal["PHARMACY_PICKUP", "FOLLOW_UP_APPT", "LIFESTYLE_CHANGE", "LAB_TEST", "OTHER"]
