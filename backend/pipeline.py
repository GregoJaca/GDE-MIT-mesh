import logging
import json
from openai import OpenAI
from llm_schemas import ClinicalExtractionThoughtProcess, PatientSummary
from scrubber import scrubber

logger = logging.getLogger(__name__)

class ZeroHallucinationPipeline:
    def __init__(self, client: OpenAI, model: str):
        self.client = client
        self.model = model

    def generate_clinical_report(self, scrubbed_transcript: str, eeszt_context: str) -> ClinicalExtractionThoughtProcess:
        system_prompt = (
            "You are a strict, clinical NLP extractor. "
            "You MUST explicitly extract findings and actionables from the transcript.\n"
            "CRITICAL RULES:\n"
            "1. ONLY use information explicitly stated in the transcript.\n"
            "2. Under NO CIRCUMSTANCES should you guess or infer clinical status.\n"
            "3. Every 'exact_quote' must be a literal, verbatim substring from the transcript.\n"
            "4. Every 'contextual_quote' must include the exact quote plus approx 5 words before and after to prove logic/negation.\n"
            "5. If context maps to a document in the EESZT context, provide its ID.\n"
            f"EESZT Context:\n{eeszt_context}"
        )

        response = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Transcript: {scrubbed_transcript}"}
            ],
            response_format=ClinicalExtractionThoughtProcess,
            max_tokens=4000
        )
        return response.choices[0].message.parsed

    def validate_quotes(self, report: ClinicalExtractionThoughtProcess, scrubbed_transcript: str) -> dict:
        """Deterministic Guardrail: Validates contextual quotes exist literally in the transcript."""
        valid_report = report.final_validated_clinical_report.model_dump()
        
        # Validate Chief Complaints
        valid_cc = []
        for cc in valid_report["chief_complaints"]:
            if cc["contextual_quote"] in scrubbed_transcript:
                valid_cc.append(cc)
            else:
                logger.warning(f"Hallucination stripped: {cc['finding']}")
        valid_report["chief_complaints"] = valid_cc

        # Validate Assessments
        valid_assess = []
        for assess in valid_report["assessments"]:
            if assess["contextual_quote"] in scrubbed_transcript:
                valid_assess.append(assess)
            else:
                logger.warning(f"Hallucination stripped: {assess['finding']}")
        valid_report["assessments"] = valid_assess

        # Validate Medications
        valid_meds = []
        for med in valid_report["medications"]:
            if med["contextual_quote"] in scrubbed_transcript:
                valid_meds.append(med)
            else:
                logger.warning(f"Hallucination stripped: {med['description']}")
        valid_report["medications"] = valid_meds

        return valid_report

    def generate_patient_summary(self, validated_clinical_dict: dict) -> dict:
        system_prompt = (
            "You are a patient advocate translator. Translate the provided clinical JSON into layman terms. "
            "Do NOT add any medical instructions not present in the JSON. Preserve all system_reference_id pointers."
        )

        response = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(validated_clinical_dict)}
            ],
            response_format=PatientSummary,
            max_tokens=2000
        )
        return response.choices[0].message.parsed.model_dump()

    def run_consultation(self, raw_transcript: str, metadata_context: dict) -> tuple[dict, dict, dict]:
        """Runs the complete E2E zero-hallucination pipeline."""
        # 1. PII Scrubbing
        scrubbed_transcript, token_map = scrubber.scrub(raw_transcript)
        
        # 2. Stringify EESZT context
        eeszt_context = json.dumps(metadata_context.get("context_documents", []))
        
        # 3. LLM Call 1: Structured Extraction (CoVe)
        try:
            thought_process = self.generate_clinical_report(scrubbed_transcript, eeszt_context)
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

