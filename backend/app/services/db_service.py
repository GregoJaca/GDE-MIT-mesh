from sqlalchemy.orm import Session
from app.models.persistence_models import Patient, Doctor, EHRDocument
import logging

logger = logging.getLogger(__name__)

class DBService:
    @staticmethod
    def get_patient_context(db: Session, patient_id: str):
        """
        Fetches patient metadata and associated historical documents.
        """
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            logger.warning(f"Patient {patient_id} not found in DB.")
            return None, []
            
        documents = db.query(EHRDocument).filter(EHRDocument.patient_id == patient_id).all()
        
        docs_payload = []
        for d in documents:
            docs_payload.append({
                "type": d.doc_type,
                "system_doc_id": d.id,
                "date": str(d.date)
            })
            
        patient_data = {
            "id": patient.id,
            "name": patient.name,
            "taj": patient.taj,
            "dob": str(patient.date_of_birth)
        }
        
        return patient_data, docs_payload

    @staticmethod
    def get_available_doctors(db: Session):
        """
        Returns a list of doctors for follow-up referral mapping.
        """
        doctors = db.query(Doctor).all()
        return [
            {"doctor_id": d.id, "name": d.name, "specialty": getattr(d, 'specialty', 'Specialist')} 
            for d in doctors
        ]
