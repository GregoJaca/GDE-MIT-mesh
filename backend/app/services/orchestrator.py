import asyncio
import os
import shutil
import logging
from typing import Tuple
from sqlalchemy.orm import Session

from app.services.pipeline import ZeroHallucinationPipeline
from app.services.db_service import DBService
from app.transcriber.transcribe import transcribe_file_with_diarization
from app.report_generator.generate_report import generate_report_from_dict

logger = logging.getLogger(__name__)

class OrchestratorService:
    def __init__(self, pipeline: ZeroHallucinationPipeline):
        self.pipeline = pipeline

    async def run_full_extraction(
        self, 
        audio_file_path: str, 
        format_id: str,
        db: Session,
        patient_id: str,
        doctor_id: str,
        encounter_date: str
    ) -> Tuple[str, str]:
        """
        Orchestrates the full flow:
        1. Parse DB Context.
        2. Transcribe Audio.
        3. LLM Pipeline Execution.
        4. Document Generation.
        """
        logger.info(f"Starting orchestration for patient {patient_id}")
        
        # 1. Fetch DB Context
        patient_meta, context_docs = DBService.get_patient_context(db, patient_id)
        if not patient_meta:
            raise ValueError(f"Patient {patient_id} context could not be retrieved.")
            
        doctor_meta = DBService.get_doctor_context(db, doctor_id)
        available_doctors = DBService.get_available_doctors(db)
        
        # 2. Transcribe Audio
        loop = asyncio.get_running_loop()
        transcript_lines = await loop.run_in_executor(None, transcribe_file_with_diarization, audio_file_path)
        raw_transcript = " ".join(transcript_lines)
        
        # Filter out doctor names from the context passed to the LLM to prevent hallucinations/PII leakage
        available_doctor_categories = [{"doctor_id": d["doctor_id"], "specialty": d["specialty"]} for d in available_doctors]
        
        # Construct full metadata context for the pipeline
        full_metadata = {
            "patient_id": patient_id,
            "patient_name": patient_meta["name"],
            "patient_taj": patient_meta["taj"],
            "doctor_id": doctor_id,
            "doctor_name": doctor_meta["name"],
            "doctor_seal": doctor_meta["seal_number"],
            "encounter_date": encounter_date,
            "context_documents": context_docs,
            "available_doctor_categories": available_doctor_categories
        }
        
        # Run Pipeline
        hydrated_clinical, hydrated_patient, _ = self.pipeline.run_consultation(
            raw_transcript=raw_transcript,
            metadata_context=full_metadata
        )
        
        # Document Generation Integration
        # We need a format for report_generator. Let's use 'fmt_001' (SOAP or Consult)
        # Map the structured clinical lists into the SOAP format expected by fmt_001
        soap_dynamic_data = hydrated_clinical
        if format_id == "fmt_001":
            cc_list = [f"• {c['finding']} ({c['condition_status']})" for c in hydrated_clinical.get("chief_complaints", [])]
            ast_list = [f"• {a['finding']} ({a['condition_status']})" for a in hydrated_clinical.get("assessments", [])]
            plan_list = [{"action_item": p["description"], "type": p["action_type"]} for p in hydrated_clinical.get("actionables", [])]
            
            soap_dynamic_data = {
                "chief_complaint": "<br>".join(cc_list) if cc_list else "None reported.",
                "history_of_present_illness": "Information extracted automatically from audio consultation.",
                "vital_signs": {},
                "physical_exam": "Not assessed via audio analysis.",
                "assessment": "<br>".join(ast_list) if ast_list else "Pending physician review.",
                "plan": plan_list
            }

        # Constructing the report_generator payload
        doc_payload = {
            "universal_header": {
                "patient_name": patient_meta["name"],
                "patient_id": patient_id,
                "taj": patient_meta["taj"],
                "doctor_name": doctor_meta["name"],
                "date": encounter_date
            },
            "dynamic_data": soap_dynamic_data
        }
        
        output_pdf = f"/tmp/medical_report_{patient_id}.pdf"
        
        success, pdf_path, md_report_path = generate_report_from_dict(
            doc_payload, "fmt_001", output_pdf
        )
        
        # Also save the layman summary as a separate MD file
        patient_summary_md_path = f"/tmp/patient_summary_{patient_id}.md"
        with open(patient_summary_md_path, "w", encoding="utf-8") as f:
            f.write(f"# Patient Summary: {patient_meta['name']}\n\n")
            f.write(hydrated_patient["layman_explanation"])
        
        return pdf_path, patient_summary_md_path
