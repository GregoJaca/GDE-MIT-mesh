import random
from datetime import date, timedelta
from faker import Faker
from database import SessionLocal, engine, Base
from models import Patient, Doctor, EventCatalog, EHRDocument, ERecept, EBeutalo

fake = Faker('hu_HU')

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def generate_taj():
    return f"{random.randint(100, 999)}-{random.randint(100, 999)}-{random.randint(100, 999)}"

def seed_db():
    db = SessionLocal()

    # Create Doctors
    doctors = []
    for i in range(5):
        doc = Doctor(
            id=f"D-{4000 + i}",
            name=f"Dr. {fake.name()}",
            seal_number=f"S-{random.randint(10000, 99999)}"
        )
        db.add(doc)
        doctors.append(doc)
    
    # Specific doctor for testing based on backend/README.md mock
    test_doc = Doctor(id="D-4099", name="Dr. Smith", seal_number="S-14399")
    db.add(test_doc)
    doctors.append(test_doc)

    db.commit()

    # Create Patients
    patients = []
    for i in range(10):
        pat = Patient(
            id=f"P-{10102 + i}",
            taj=generate_taj(),
            name=fake.name(),
            date_of_birth=fake.date_of_birth(minimum_age=18, maximum_age=90),
            allergies=random.choice(["Penicillin", "Lactose", "Pollen", None]),
            chronic_diseases=random.choice(["Diabetes Type 2", "Hypertension", "Asthma", "None"]),
            blood_type=random.choice(["A Rh+", "B Rh+", "AB Rh-", "O Rh+"])
        )
        db.add(pat)
        patients.append(pat)

    # Specific patient for testing based on backend/README.md mock
    test_pat = Patient(
        id="P-10101",
        taj="123-456-789",
        name="Jane Doe",
        date_of_birth=date(1980, 5, 12),
        allergies="None",
        chronic_diseases="None",
        blood_type="A Rh+"
    )
    db.add(test_pat) # No need to merge anymore since the IDs don't collide
    patients.append(test_pat)
    db.commit()
    
    # Generate Events, EHR, ERecepts for the test patient
    doc_lab = EHRDocument(
        id="DOC-99281-XYZ",
        patient_id="P-10101",
        doc_type="laboratory_result",
        date=date(2026, 2, 20),
        content="Cholesterol: 6.2 mmol/L (*H)\nGlucose: 5.1 mmol/L\n..."
    )
    doc_ds = EHRDocument(
        id="DOC-55555-ABC",
        patient_id="P-10101",
        doc_type="discharge_summary",
        date=date(2025, 11, 1),
        content="Patient admitted for..."
    )
    db.add(doc_lab)
    db.add(doc_ds)
    
    erecept = ERecept(
        id="REC-11111",
        patient_id="P-10101",
        drug_name_strength="Algoflex 400mg",
        active_ingredient="Ibuprofen",
        dosage_instructions="1x1 naponta",
        status="Kiváltható",
        expiry_date=date.today() + timedelta(days=90)
    )
    db.add(erecept)

    # For other patients generate random stuff
    for p in patients:
        if p.id == "P-10101": continue
        
        # 1-3 events
        for _ in range(random.randint(1, 3)):
            evt = EventCatalog(
                id=fake.uuid4()[:8],
                patient_id=p.id,
                doctor_id=random.choice(doctors).id,
                date_time=fake.iso8601(),
                institution_name=fake.company(),
                department=random.choice(["Kardiológia", "Bőrgyógyászat", "Háziorvos"]),
                type_of_care=random.choice(["Inpatient", "Outpatient"]),
                primary_diagnosis=random.choice(["I10", "E11", "J45"])
            )
            db.add(evt)
            
        # EHR
        ehr = EHRDocument(
            id=f"DOC-{fake.uuid4()[:8]}",
            patient_id=p.id,
            doc_type=random.choice(["laboratory_result", "outpatient_sheet"]),
            date=fake.date_between(start_date="-1y", end_date="today"),
            content="Sample medical record content"
        )
        db.add(ehr)

    db.commit()
    print("Database seeded successfully with dummy EESZT data!")

if __name__ == "__main__":
    seed_db()
