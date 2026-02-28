from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, index=True) # e.g., P-10101
    taj = Column(String, unique=True, index=True)
    name = Column(String)
    date_of_birth = Column(Date)
    
    # eProfil data
    allergies = Column(Text, nullable=True)
    chronic_diseases = Column(Text, nullable=True)
    blood_type = Column(String, nullable=True)

    events = relationship("EventCatalog", back_populates="patient")
    documents = relationship("EHRDocument", back_populates="patient")
    prescriptions = relationship("ERecept", back_populates="patient")
    referrals = relationship("EBeutalo", back_populates="patient")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String, primary_key=True, index=True) # e.g., D-4099
    name = Column(String)
    seal_number = Column(String, unique=True, index=True) # Pecsétszám

    events = relationship("EventCatalog", back_populates="doctor")

class EventCatalog(Base):
    """1. Eseménykatalógus (Event Catalog)"""
    __tablename__ = "event_catalog"

    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"))
    doctor_id = Column(String, ForeignKey("doctors.id"))
    
    date_time = Column(String) # ISO 8601 string
    institution_name = Column(String)
    department = Column(String)
    type_of_care = Column(String) # Inpatient, Outpatient, GP
    primary_diagnosis = Column(String)

    patient = relationship("Patient", back_populates="events")
    doctor = relationship("Doctor", back_populates="events")

class EHRDocument(Base):
    """2. eKórtörténet (EHR - Electronic Health Records)"""
    __tablename__ = "ehr_documents"

    id = Column(String, primary_key=True, index=True) # system_doc_id
    patient_id = Column(String, ForeignKey("patients.id"))
    
    doc_type = Column(String) # laboratory_result, discharge_summary, outpatient_sheet
    date = Column(Date)
    content = Column(Text) # The actual content, which we don't send to LLM usually, except for specific queries later

    patient = relationship("Patient", back_populates="documents")

class ERecept(Base):
    """3. eRecept (e-Prescription)"""
    __tablename__ = "e_recepts"

    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"))
    
    drug_name_strength = Column(String)
    active_ingredient = Column(String)
    dosage_instructions = Column(String)
    status = Column(String) # Kiváltva, Kiváltható, Visszavonva
    expiry_date = Column(Date)

    patient = relationship("Patient", back_populates="prescriptions")

class EBeutalo(Base):
    """4. eBeutaló (e-Referral)"""
    __tablename__ = "e_beutalos"

    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"))
    
    target_specialty = Column(String)
    reason_for_referral = Column(String)
    urgency = Column(String)
    status = Column(String) # Used, Available
    
    patient = relationship("Patient", back_populates="referrals")
