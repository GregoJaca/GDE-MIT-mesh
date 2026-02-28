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
        db: Session,
        patient_id: str,
        doctor_id_context: str,
        doctor_name_context: str,
        doctor_seal_context: str,
        encounter_date: str
    ) -> Tuple[str, str]:
        """
        Orchestrates the full flow:
        1. Parallel Transcription & DB Context Fetch.
        2. LLM Pipeline Execution.
        3. Document Generation.
        """
        logger.info(f"Starting orchestration for patient {patient_id}")
        
        # Define parallel tasks
        # 1. Fetch DB Context
        # 2. Transcribe Audio
        # Note: transcribe_file_with_diarization is currently synchronous, wrapping in threadpool
        
        # 1. Fetch DB Context (Fast, sequential to avoid thread-safety issues)
        patient_meta, context_docs = DBService.get_patient_context(db, patient_id)
        if not patient_meta:
            raise ValueError(f"Patient {patient_id} context could not be retrieved.")
            
        available_doctors = DBService.get_available_doctors(db)
        
        # 2. Transcribe Audio (Slow, remains in executor)
        loop = asyncio.get_running_loop()
        transcript_lines = await loop.run_in_executor(None, transcribe_file_with_diarization, audio_file_path)
        
        raw_transcript = " ".join(transcript_lines)
        
        # Construct full metadata context for the pipeline
        full_metadata = {
            "patient_id": patient_id,
            "patient_name": patient_meta["name"],
            "patient_taj": patient_meta["taj"],
            "doctor_id": doctor_id_context,
            "doctor_name": doctor_name_context,
            "doctor_seal": doctor_seal_context,
            "encounter_date": encounter_date,
            "context_documents": context_docs,
            "available_doctors": available_doctors
        }
        
        # Run Pipeline
        hydrated_clinical, hydrated_patient, _ = self.pipeline.run_consultation(
            raw_transcript=raw_transcript,
            metadata_context=full_metadata
        )
        
        # Document Generation Integration
        # We need a format for report_generator. Let's use 'fmt_001' (SOAP or Consult)
        # Constructing the report_generator payload
        doc_payload = {
            "universal_header": {
                "patient_name": patient_meta["name"],
                "patient_id": patient_id,
                "taj": patient_meta["taj"],
                "doctor_name": doctor_id_context,
                "date": encounter_date
            },
            "dynamic_data": hydrated_clinical
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
