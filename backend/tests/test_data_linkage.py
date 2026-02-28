import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.persistence_models import Patient, Doctor, MedicalCaseModel, AppointmentModel, ERecept
from datetime import date

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_prescription_linkage(db_session):
    # Setup test data
    p1 = Patient(id="P-101", taj="123-456", name="John Doe", date_of_birth=date(1990, 1, 1))
    d1 = Doctor(id="D-99", name="Dr. Smith", seal_number="S-123")
    c1 = MedicalCaseModel(id="CASE-1", patient_id="P-101", title="Test Case", created_date=date(2025, 1, 1))
    a1 = AppointmentModel(id="APP-1", patient_id="P-101", case_id="CASE-1", date=date(2025, 1, 1), topic="Test", doctor_id="D-99")
    
    # Add 3 prescriptions
    rx1 = ERecept(id="RX-1", patient_id="P-101", doctor_id="D-99", appointment_id="APP-1", drug_name_strength="Drug A")
    rx2 = ERecept(id="RX-2", patient_id="P-101", doctor_id="D-99", appointment_id="APP-1", drug_name_strength="Drug B")
    rx3 = ERecept(id="RX-3", patient_id="P-101", doctor_id="D-99", appointment_id="APP-1", drug_name_strength="Drug C")
    
    db_session.add_all([p1, d1, c1, a1])
    db_session.add_all([rx1, rx2, rx3])
    db_session.commit()
    
    # Query back the prescriptions for the appointment
    fetched_prescriptions = db_session.query(ERecept).filter(ERecept.appointment_id == "APP-1").all()
    
    assert len(fetched_prescriptions) == 3
    assert all(rx.doctor_id == "D-99" for rx in fetched_prescriptions)
    assert all(rx.patient_id == "P-101" for rx in fetched_prescriptions)
    
    # Ensure relationships are hydrated
    rx = fetched_prescriptions[0]
    assert rx.appointment.topic == "Test"
    assert rx.doctor.name == "Dr. Smith"
