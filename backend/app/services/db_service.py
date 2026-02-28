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
        Returns doctors with specialty for LLM referral mapping.
        Specialty is derived from a known map since the Doctor model has no specialty column.
        """
        # Specialty map keyed by doctor ID — update when new doctors are seeded
        SPECIALTY_MAP = {
            "D-99": "General Practitioner",
            "D-02": "Cardiologist",
            "D-03": "Neurologist",
            "D-04": "Orthopedic Surgeon",
            "D-05": "Dermatologist",
        }
        doctors = db.query(Doctor).all()
        return [
            {
                "doctor_id": d.id,
                "name": d.name,
                "specialty": SPECIALTY_MAP.get(d.id, "Specialist"),
            }
            for d in doctors
        ]

    @staticmethod
    def get_doctor_context(db: Session, doctor_id: str):
        """Fetches specific doctor details for the report header."""
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            logger.warning(f"Doctor {doctor_id} not found in DB.")
            return {"name": "Unknown Doctor", "seal_number": "N/A"}
        return {"name": doctor.name, "seal_number": doctor.seal_number}

    @staticmethod
    def get_all_patients(db: Session):
        """Fetches a lightweight list of all patients for the frontend UI."""
        patients = db.query(Patient).all()
        return [
            {"patient_id": p.id, "name": p.name, "taj": p.taj, "dob": str(p.date_of_birth)}
            for p in patients
        ]

    @staticmethod
    def save_consultation_results(db: Session, patient_id: str, doctor_id: str, encounter_date: str, pdf_url: str, patient_summary: str):
        """Persists the finished consultation artifacts into the patient's case and appointment timeline."""
        from app.models.persistence_models import MedicalCaseModel, AppointmentModel
        import uuid
        from dateutil.parser import parse
        import datetime
        
        try:
            dt = parse(encounter_date).date()
        except:
            dt = datetime.date.today()
            
        # Bind to an active case, or create a new ambient tracking case
        active_case = db.query(MedicalCaseModel).filter(
            MedicalCaseModel.patient_id == patient_id,
            MedicalCaseModel.status == "Active"
        ).order_by(MedicalCaseModel.created_date.desc()).first()
        
        if not active_case:
            active_case = MedicalCaseModel(
                id=f"CASE-AMB-{str(uuid.uuid4())[:6].upper()}",
                patient_id=patient_id,
                title="Ambient Consultation",
                description="New active case tracking ambient workflow findings.",
                status="Active",
                created_date=dt,
                icon="Activity"
            )
            db.add(active_case)
            db.commit()
            
        # Insert the final appointment payload
        app_id = f"APP-AMB-{str(uuid.uuid4())[:6].upper()}"
        appointment = AppointmentModel(
            id=app_id,
            patient_id=patient_id,
            case_id=active_case.id,
            date=dt,
            topic="Recorded AI Consultation",
            doctor_id=doctor_id,
            status="Completed",
            report=pdf_url,
            patient_summary=patient_summary
        )
        db.add(appointment)
        db.commit()
