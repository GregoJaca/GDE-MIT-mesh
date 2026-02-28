from sqlalchemy.orm import Session
from datetime import date
from app.core.database import SessionLocal, engine, Base
from app.models.persistence_models import (
    Patient, Doctor, EHRDocument, EventCatalog,
    MedicalCaseModel, AppointmentModel, ERecept
)

def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ---- Patients ----
    p1 = Patient(
        id="P-001", taj="123-456-789", name="Jean-Pierre de La-Fontaine",
        date_of_birth=date(1980, 5, 20), allergies="Penicillin",
        chronic_diseases="Type 2 Diabetes", blood_type="A+"
    )
    p2 = Patient(
        id="P-10101", taj="111-111-111", name="Jane Doe",
        date_of_birth=date(1980, 1, 1), allergies="None",
        chronic_diseases="None", blood_type="O+"
    )
    p3 = Patient(
        id="PT-1002", taj="987-654-321", name="Michael Chen",
        date_of_birth=date(1990, 6, 15), allergies="None",
        chronic_diseases="None", blood_type="B+"
    )
    p4 = Patient(
        id="PT-1003", taj="111-222-333", name="Emma Watson",
        date_of_birth=date(1985, 4, 20), allergies="Sulfa Drugs",
        chronic_diseases="Chronic Migraines", blood_type="AB+"
    )
    db.add_all([p1, p2, p3, p4])

    # ---- Doctor ----
    d1 = Doctor(id="D-99", name="Dr. Sarah Miller", seal_number="S-Miller-99")
    db.add(d1)

    # ---- EHR Documents ----
    docs = [
        EHRDocument(id="DOC-RAD-202", patient_id="P-001", doc_type="laboratory_result",
                    date=date(2026, 2, 10), content="Blood test shows high cholesterol levels."),
        EHRDocument(id="DOC-BLD-505", patient_id="P-001", doc_type="radiology_report",
                    date=date(2026, 2, 15), content="Chest X-ray shows no abnormalities."),
        EHRDocument(id="DOC-DERM-001", patient_id="P-10101", doc_type="dermatology_consult",
                    date=date(2024, 2, 20),
                    content="Patient noted a new pigmented lesion on right forearm. Advised to monitor and follow up if changes occur."),
        EHRDocument(id="DOC-ER-099", patient_id="PT-1002", doc_type="emergency_room_triage",
                    date=date(2024, 1, 12),
                    content="Patient presented to ER after skiing accident. Reports feeling a pop in the right knee. Knee swollen."),
        EHRDocument(id="DOC-NEURO-88", patient_id="PT-1003", doc_type="neurology_consult",
                    date=date(2023, 11, 20),
                    content="Patient diagnosed with chronic migraines. Initiated topiramate prophylaxis."),
    ]
    db.add_all(docs)

    # ---- Medical Cases ----
    cases = [
        MedicalCaseModel(id="CASE-001", patient_id="P-10101", title="Annual Checkup & Labs",
                         description="Routine annual physical and follow-up lab review.",
                         status="Closed", created_date=date(2023, 10, 14)),
        MedicalCaseModel(id="CASE-002", patient_id="P-10101", title="Skin Lesion Evaluation",
                         description="Evaluation of pigmented lesion on right forearm.",
                         status="Active", created_date=date(2024, 2, 28)),
        MedicalCaseModel(id="CASE-003", patient_id="PT-1002", title="Right Knee Injury",
                         description="Skiing accident — suspected ACL tear or meniscus injury.",
                         status="Active", created_date=date(2024, 1, 15)),
        MedicalCaseModel(id="CASE-004", patient_id="PT-1003", title="Chronic Migraine Management",
                         description="Ongoing prophylactic treatment for chronic migraines.",
                         status="Active", created_date=date(2024, 2, 10)),
    ]
    db.add_all(cases)

    # ---- Appointments ----
    appointments = [
        AppointmentModel(id="APP-001", patient_id="P-10101", case_id="CASE-001",
                         date=date(2023, 10, 14), topic="Annual Physical", doctor_id="D-99",
                         status="Completed",
                         report="Patient presented for routine annual physical. Vitals are stable. Blood pressure 118/75, HR 72 bpm.",
                         patient_summary="Hello, you came in today for your routine annual physical. Everything looks stable."),
        AppointmentModel(id="APP-002", patient_id="P-10101", case_id="CASE-001",
                         date=date(2023, 11, 5), topic="Lab Results Review", doctor_id="D-99",
                         status="Completed",
                         report="Reviewed lab results. Lipid panel shows slightly elevated LDL cholesterol (135 mg/dL). Thyroid normal.",
                         patient_summary="We reviewed your recent lab results. Your cholesterol is slightly elevated, but thyroid is normal."),
        AppointmentModel(id="APP-003", patient_id="P-10101", case_id="CASE-002",
                         date=date(2024, 2, 28), topic="Dermatology Consult", doctor_id="D-99",
                         status="Completed",
                         report="Evaluation of new pigmented lesion on right forearm. Lesion is 4mm, asymmetrical with irregular borders.",
                         patient_summary="Today we evaluated your pigmented lesion. Because it has irregular borders, I recommend an excisional biopsy."),
        AppointmentModel(id="APP-004", patient_id="PT-1002", case_id="CASE-003",
                         date=date(2024, 1, 15), topic="Orthopedic Evaluation", doctor_id="D-99",
                         status="Review Required",
                         report="Patient presents with right knee pain following a skiing incident. Suspected ACL tear.",
                         patient_summary="The swelling from your skiing accident suggests a possible meniscus injury or ACL tear. MRI ordered."),
        AppointmentModel(id="APP-005", patient_id="PT-1003", case_id="CASE-004",
                         date=date(2024, 2, 10), topic="Migraine Follow-up", doctor_id="D-99",
                         status="Completed",
                         report="Follow up on chronic migraine. Patient reports decrease from 4x/week to 1x/week with Topiramate.",
                         patient_summary="Great news — attacks decreased from four per week to once a week since starting Topiramate."),
    ]
    db.add_all(appointments)

    # ---- Prescriptions (ERecept) ----
    prescriptions = [
        # APP-003 (Jane Doe - Derm)
        ERecept(id="RX-001", patient_id="P-10101", doctor_id="D-99", appointment_id="APP-003",
                drug_name_strength="Mupirocin 2% Ointment", active_ingredient="Mupirocin",
                dosage_instructions="Apply to affected area 3 times daily for 7 days", status="Kiváltható",
                expiry_date=date(2024, 3, 28), external_document_link="ext-rx-doc-881"),
        ERecept(id="RX-002", patient_id="P-10101", doctor_id="D-99", appointment_id="APP-003",
                drug_name_strength="Chlorhexidine 4% Wash", active_ingredient="Chlorhexidine gluconate",
                dosage_instructions="Use once daily as skin cleanser", status="Kiváltható",
                expiry_date=date(2024, 3, 28), external_document_link="ext-rx-doc-882"),
        ERecept(id="RX-003", patient_id="P-10101", doctor_id="D-99", appointment_id="APP-003",
                drug_name_strength="Ibuprofen 400mg", active_ingredient="Ibuprofen",
                dosage_instructions="Take 1 tablet every 6 hours as needed for pain", status="Kiváltható",
                expiry_date=date(2024, 5, 28), external_document_link="ext-rx-doc-883"),

        # APP-004 (Michael Chen - Ortho)
        ERecept(id="RX-004", patient_id="PT-1002", doctor_id="D-99", appointment_id="APP-004",
                drug_name_strength="Celecoxib 200mg", active_ingredient="Celecoxib",
                dosage_instructions="Take 1 capsule daily", status="Kiváltható",
                expiry_date=date(2024, 2, 15), external_document_link="ext-rx-doc-884"),
        ERecept(id="RX-005", patient_id="PT-1002", doctor_id="D-99", appointment_id="APP-004",
                drug_name_strength="Cyclobenzaprine 5mg", active_ingredient="Cyclobenzaprine",
                dosage_instructions="Take 1 tablet at bedtime as needed", status="Kiváltható",
                expiry_date=date(2024, 2, 15), external_document_link="ext-rx-doc-885"),
        ERecept(id="RX-006", patient_id="PT-1002", doctor_id="D-99", appointment_id="APP-004",
                drug_name_strength="Tramadol 50mg", active_ingredient="Tramadol",
                dosage_instructions="Take 1 tablet every 6 hours as needed for severe pain", status="Kiváltható",
                expiry_date=date(2024, 2, 15), external_document_link="ext-rx-doc-886"),
        ERecept(id="RX-007", patient_id="PT-1002", doctor_id="D-99", appointment_id="APP-004",
                drug_name_strength="Pantoprazole 40mg", active_ingredient="Pantoprazole",
                dosage_instructions="Take 1 tablet daily before breakfast", status="Kiváltható",
                expiry_date=date(2024, 2, 15), external_document_link="ext-rx-doc-887"),

        # APP-005 (Emma Watson - Migraine)
        ERecept(id="RX-008", patient_id="PT-1003", doctor_id="D-99", appointment_id="APP-005",
                drug_name_strength="Sumatriptan 50mg", active_ingredient="Sumatriptan",
                dosage_instructions="Take 1 tablet at onset of migraine", status="Kiváltható",
                expiry_date=date(2025, 2, 10), external_document_link="ext-rx-doc-888"),
        ERecept(id="RX-009", patient_id="PT-1003", doctor_id="D-99", appointment_id="APP-005",
                drug_name_strength="Topiramate 25mg", active_ingredient="Topiramate",
                dosage_instructions="Take 1 tablet twice daily for prevention", status="Kiváltva",
                expiry_date=date(2025, 2, 10), external_document_link="ext-rx-doc-889"),
        ERecept(id="RX-010", patient_id="PT-1003", doctor_id="D-99", appointment_id="APP-005",
                drug_name_strength="Ondansetron 4mg ODT", active_ingredient="Ondansetron",
                dosage_instructions="Dissolve 1 tablet on tongue every 8 hours as needed", status="Kiváltható",
                expiry_date=date(2025, 2, 10), external_document_link="ext-rx-doc-890"),
        ERecept(id="RX-011", patient_id="PT-1003", doctor_id="D-99", appointment_id="APP-005",
                drug_name_strength="Naproxen 500mg", active_ingredient="Naproxen",
                dosage_instructions="Take 1 tablet twice daily with food as needed", status="Kiváltható",
                expiry_date=date(2025, 2, 10), external_document_link="ext-rx-doc-891"),
        ERecept(id="RX-012", patient_id="PT-1003", doctor_id="D-99", appointment_id="APP-005",
                drug_name_strength="Magnesium Oxide 400mg", active_ingredient="Magnesium",
                dosage_instructions="Take 1 tablet daily", status="Kiváltható",
                expiry_date=date(2025, 2, 10), external_document_link="ext-rx-doc-892"),
    ]
    db.add_all(prescriptions)

    db.commit()
    db.close()
    print("Database seeded successfully with generic Mesh data.")

if __name__ == "__main__":
    seed()
