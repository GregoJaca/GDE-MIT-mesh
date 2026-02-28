from sqlalchemy.orm import Session
from datetime import date
from app.core.database import SessionLocal, engine, Base
from app.models.persistence_models import Patient, Doctor, EHRDocument, EventCatalog

def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create Mock Patients
    p1 = Patient(
        id="P-001",
        taj="123-456-789",
        name="Jean-Pierre de La-Fontaine",
        date_of_birth=date(1980, 5, 20),
        allergies="Penicillin",
        chronic_diseases="Type 2 Diabetes",
        blood_type="A+"
    )
    p2 = Patient(
        id="P-10101",
        taj="111-111-111",
        name="Jane Doe",
        date_of_birth=date(1980, 1, 1),
        allergies="None",
        chronic_diseases="None",
        blood_type="O+"
    )
    p3 = Patient(
        id="PT-1002",
        taj="987-654-321",
        name="Michael Chen",
        date_of_birth=date(1990, 6, 15),
        allergies="None",
        chronic_diseases="None",
        blood_type="B+"
    )
    p4 = Patient(
        id="PT-1003",
        taj="111-222-333",
        name="Emma Watson",
        date_of_birth=date(1985, 4, 20),
        allergies="Sulfa Drugs",
        chronic_diseases="Chronic Migraines",
        blood_type="AB+"
    )
    db.add_all([p1, p2, p3, p4])

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
    doc3 = EHRDocument(
        id="DOC-DERM-001",
        patient_id="P-10101",
        doc_type="dermatology_consult",
        date=date(2024, 2, 20),
        content="Patient noted a new pigmented lesion on right forearm. Advised to monitor and follow up if changes occur."
    )
    doc4 = EHRDocument(
        id="DOC-ER-099",
        patient_id="PT-1002",
        doc_type="emergency_room_triage",
        date=date(2024, 1, 12),
        content="Patient presented to ER after skiing accident. Reports feeling a pop in the right knee. Knee swollen. Discharged with pain medication and advised orthopedic follow-up."
    )
    doc5 = EHRDocument(
        id="DOC-NEURO-88",
        patient_id="PT-1003",
        doc_type="neurology_consult",
        date=date(2023, 11, 20),
        content="Patient diagnosed with chronic migraines. Initiated topiramate prophylaxis."
    )
    db.add_all([doc1, doc2, doc3, doc4, doc5])

    db.commit()
    db.close()
    print("Database seeded successfully with generic Mesh data.")

if __name__ == "__main__":
    seed()
