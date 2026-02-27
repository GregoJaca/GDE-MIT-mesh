import logging
import json
from app.core.llm_client import LLMClient
from app.models.llm_schemas import ClinicalExtractionThoughtProcess, PatientSummary
from app.services.scrubber import scrubber
from app.core.prompts import CLINICAL_EXTRACTION_SYSTEM_PROMPT, PATIENT_SUMMARY_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

class ZeroHallucinationPipeline:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    def generate_clinical_report(self, scrubbed_transcript: str, system_context: str) -> ClinicalExtractionThoughtProcess:
        system_prompt = CLINICAL_EXTRACTION_SYSTEM_PROMPT.format(system_context=system_context)

        return self.llm.parse_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Transcript: {scrubbed_transcript}"}
            ],
            response_format=ClinicalExtractionThoughtProcess,
            max_tokens=16384
        )

    def validate_quotes(self, report: ClinicalExtractionThoughtProcess, scrubbed_transcript: str) -> dict:
        """
        Deterministic Guardrail: Verify all extracted quotes exist verbatim in the scrubbed transcript.
        If a quote does not exist, it's a hallucination; the item is stripped.
        """
        valid_report = report.final_validated_clinical_report.model_dump()
        
        logger.info(f"Validating quotes against scrubbed transcript (length: {len(scrubbed_transcript)})")
        # For debugging in tests, we'll log the first 100 chars
        logger.debug(f"Scrubbed excerpt: {scrubbed_transcript[:100]}...")

        def is_valid(item: dict) -> bool:
            quote = item.get("exact_quote")
            if not quote:
                return False
            
            # Strict verbatim check
            exists = scrubbed_transcript.find(quote) != -1
            if not exists:
                logger.warning(f"Guardrail Trip: Hallucinated quote stripped: '{quote}'")
                logger.info(f"Full scrubbed transcript for comparison: {repr(scrubbed_transcript)}")
            return exists

        # Validate each category
        valid_report["chief_complaints"] = [c for c in valid_report["chief_complaints"] if is_valid(c)]
        valid_report["assessments"] = [a for a in valid_report["assessments"] if is_valid(a)]
        valid_report["actionables"] = [act for act in valid_report["actionables"] if is_valid(act)]

        return valid_report

    def generate_patient_summary(self, validated_clinical_dict: dict) -> dict:
        system_prompt = PATIENT_SUMMARY_SYSTEM_PROMPT

        parsed = self.llm.parse_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(validated_clinical_dict)}
            ],
            response_format=PatientSummary,
            max_tokens=8192
        )
        return parsed.model_dump()

    def run_consultation(self, raw_transcript: str, metadata_context: dict) -> tuple[dict, dict, dict]:
        """Runs the complete E2E zero-hallucination pipeline."""
        # 1. PII Scrubbing
        scrubbed_transcript, token_map = scrubber.scrub(raw_transcript)
        
        # 2. Stringify system context (including available doctors)
        system_context = json.dumps({
            "context_documents": metadata_context.get("context_documents", []),
            "available_doctors": metadata_context.get("available_doctors", [])
        })
        
        # 3. LLM Call 1: Structured Extraction (CoVe)
        try:
            thought_process = self.generate_clinical_report(scrubbed_transcript, system_context)
        except Exception as e:
            logger.error(f"Clinical Extraction Failed: {e}")
            raise

        # 4. Deterministic Guardrail Validation
        validated_clinical_dict = self.validate_quotes(thought_process, scrubbed_transcript)

        # 5. LLM Call 2: Patient Summary Translation
        try:
            patient_summary_dict = self.generate_patient_summary(validated_clinical_dict)
        except Exception as e:
            logger.error(f"Patient Summary Failed: {e}")
            raise

        # 6. Metadata Hydration (Swap tokens back to PII)
        hydrated_clinical = scrubber.hydrate_dict(validated_clinical_dict, token_map)
        hydrated_patient = scrubber.hydrate_dict(patient_summary_dict, token_map)

        return hydrated_clinical, hydrated_patient, token_map 

