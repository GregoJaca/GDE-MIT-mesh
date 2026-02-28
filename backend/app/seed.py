from sqlalchemy.orm import Session
from datetime import date
from app.core.database import SessionLocal, engine, Base
from app.models.persistence_models import Patient, Doctor, EHRDocument, EventCatalog

def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create Mock Patient
    p1 = Patient(
        id="P-001",
        taj="123-456-789",
        name="Jean-Pierre de La-Fontaine",
        date_of_birth=date(1980, 5, 20),
        allergies="Penicillin",
        chronic_diseases="Type 2 Diabetes",
        blood_type="A+"
    )
    db.add(p1)

    # Create Mock Doctor
    d1 = Doctor(
        id="D-99",
        name="Dr. Sarah Miller",
        seal_number="S-Miller-99"
    )
    db.add(d1)

    # Create Context Documents
    doc1 = EHRDocument(
        id="DOC-RAD-202",
        patient_id="P-001",
        doc_type="laboratory_result",
        date=date(2026, 2, 10),
        content="Blood test shows high cholesterol levels."
    )
    doc2 = EHRDocument(
        id="DOC-BLD-505",
        patient_id="P-001",
        doc_type="radiology_report",
        date=date(2026, 2, 15),
        content="Chest X-ray shows no abnormalities."
    )
    db.add_all([doc1, doc2])

    db.commit()
    db.close()
    print("Database seeded successfully with generic Mesh data.")

if __name__ == "__main__":
    seed()
