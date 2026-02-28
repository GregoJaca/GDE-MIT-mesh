from sqlalchemy.orm import Session
from datetime import date
from app.core.database import SessionLocal, engine, Base
from app.models.persistence_models import (
    Patient, Doctor, EHRDocument, EventCatalog,
    MedicalCaseModel, AppointmentModel, ERecept, EBeutalo
)

def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ── Patients ──────────────────────────────────────────────────────────────
    patients = [
        Patient(
            id="P-001", taj="123-456-789",
            name="Jean-Pierre de La-Fontaine",
            date_of_birth=date(1980, 5, 20),
            allergies="Penicillin",
            chronic_diseases="Type 2 Diabetes, Hypercholesterolaemia",
            blood_type="A+",
        ),
        Patient(
            id="P-10101", taj="111-111-111",
            name="Jane Doe",
            date_of_birth=date(1980, 1, 1),
            allergies="None",
            chronic_diseases="None",
            blood_type="O+",
        ),
        Patient(
            id="PT-1002", taj="987-654-321",
            name="Michael Chen",
            date_of_birth=date(1990, 6, 15),
            allergies="None",
            chronic_diseases="None",
            blood_type="B+",
        ),
        Patient(
            id="PT-1003", taj="111-222-333",
            name="Emma Watson",
            date_of_birth=date(1985, 4, 20),
            allergies="Sulfa Drugs",
            chronic_diseases="Chronic Migraines",
            blood_type="AB+",
        ),
    ]
    db.add_all(patients)

    # ── Doctors ───────────────────────────────────────────────────────────────
    # NOTE: doctor specialty is stored in-memory by DBService.get_available_doctors()
    # via getattr(d, 'specialty', 'Specialist') because the column doesn't exist in the
    # persistence model yet. We store it as an attribute on the object after creation
    # so the seed works without a DB schema migration.
    doctors = [
        Doctor(id="D-99",  name="Dr. Sarah Miller",   seal_number="S-Miller-99"),
        Doctor(id="D-02",  name="Dr. John Cardio",    seal_number="S-Cardio-02"),
        Doctor(id="D-03",  name="Dr. Lena Neurology", seal_number="S-Neuro-03"),
        Doctor(id="D-04",  name="Dr. Tomas Ortho",    seal_number="S-Ortho-04"),
        Doctor(id="D-05",  name="Dr. Maria Derm",     seal_number="S-Derm-05"),
    ]
    db.add_all(doctors)
    # Flush so we can attach specialty metadata in EventCatalog description fields
    # (the Doctor model has no specialty column; DBService uses getattr with fallback)

    # ── EHR Documents ─────────────────────────────────────────────────────────
    # These are sent as opaque pointers into the LLM system context.
    # The 'content' field is stored but NOT sent to the LLM (privacy by design).
    # The test cases reference specific system_doc_ids — keep these in sync.
    ehr_docs = [
        # ── P-001 Jean-Pierre de La-Fontaine ──
        EHRDocument(
            id="DOC-RAD-202", patient_id="P-001",
            doc_type="laboratory_result",
            date=date(2026, 2, 10),
            content="Fasting lipid panel: Total cholesterol 240 mg/dL, LDL 190 mg/dL, HDL 42 mg/dL. Triglycerides 180 mg/dL. HbA1c 7.1%.",
        ),
        EHRDocument(
            id="DOC-BLD-505", patient_id="P-001",
            doc_type="radiology_report",
            date=date(2026, 2, 15),
            content="Chest X-ray PA view: No acute cardiopulmonary process. Heart size normal. No pleural effusion.",
        ),
        EHRDocument(
            id="DOC-P001-ECG-001", patient_id="P-001",
            doc_type="ecg_report",
            date=date(2026, 1, 20),
            content="12-lead ECG: Normal sinus rhythm, rate 72 bpm. No ST changes or Q waves.",
        ),

        # ── P-10101 Jane Doe ──
        EHRDocument(
            id="DOC-DERM-001", patient_id="P-10101",
            doc_type="dermatology_consult",
            date=date(2024, 2, 20),
            content="New pigmented lesion on right forearm, 4mm, asymmetric, irregular borders (score 3 on ABCDE criteria). Advised monitor and follow up.",
        ),
        EHRDocument(
            id="DOC-JANE-LAB-22", patient_id="P-10101",
            doc_type="laboratory_result",
            date=date(2023, 11, 5),
            content="Lipid panel: Total cholesterol 198 mg/dL, LDL 135 mg/dL (borderline high), HDL 55 mg/dL. Thyroid TSH normal at 1.8.",
        ),
        EHRDocument(
            id="DOC-JANE-VACC-01", patient_id="P-10101",
            doc_type="vaccination_record",
            date=date(2023, 9, 1),
            content="Influenza vaccine administered. COVID-19 booster administered.",
        ),

        # ── PT-1002 Michael Chen ──
        EHRDocument(
            id="DOC-ER-099", patient_id="PT-1002",
            doc_type="emergency_room_triage",
            date=date(2024, 1, 12),
            content="ER triage: skiing accident, pop sensation right knee. Swelling ++. Ottawa knee rules positive. Referred for imaging.",
        ),
        EHRDocument(
            id="DOC-MRI-CHEN-01", patient_id="PT-1002",
            doc_type="mri_report",
            date=date(2024, 1, 20),
            content="MRI right knee: Complete ACL tear. Grade II medial meniscus tear. No fractures identified.",
        ),
        EHRDocument(
            id="DOC-CHEN-PT-01", patient_id="PT-1002",
            doc_type="physiotherapy_assessment",
            date=date(2024, 2, 1),
            content="Initial physiotherapy assessment post-ACL injury. Quad weakness noted. ROM limited 0-95 degrees. Plan: 3x/week PT for 6 weeks pre-op.",
        ),

        # ── PT-1003 Emma Watson ──
        EHRDocument(
            id="DOC-NEURO-88", patient_id="PT-1003",
            doc_type="neurology_consult",
            date=date(2023, 11, 20),
            content="Chronic migraine diagnosed per ICHD-3 criteria. Frequency: 4x/week, avg duration 8h. Initiated Topiramate 25mg titration for prophylaxis.",
        ),
        EHRDocument(
            id="DOC-EMMA-LAB-01", patient_id="PT-1003",
            doc_type="laboratory_result",
            date=date(2024, 1, 15),
            content="Blood panel for Topiramate monitoring: Renal function normal. Electrolytes normal. Bicarbonate 22 (lower limit of normal — monitor).",
        ),
        EHRDocument(
            id="DOC-EMMA-MRI-01", patient_id="PT-1003",
            doc_type="mri_report",
            date=date(2023, 10, 1),
            content="Brain MRI with and without contrast: No structural abnormality. No intracranial lesion. Consistent with primary headache disorder.",
        ),
    ]
    db.add_all(ehr_docs)

    # ── Medical Cases ─────────────────────────────────────────────────────────
    cases = [
        MedicalCaseModel(id="CASE-001", patient_id="P-10101",
            title="Annual Checkup & Labs", status="Closed",
            description="Routine annual physical and follow-up lab review.",
            created_date=date(2023, 10, 14)),
        MedicalCaseModel(id="CASE-002", patient_id="P-10101",
            title="Skin Lesion Evaluation", status="Active",
            description="Evaluation of pigmented lesion on right forearm.",
            created_date=date(2024, 2, 28)),
        MedicalCaseModel(id="CASE-003", patient_id="PT-1002",
            title="Right Knee Injury", status="Active",
            description="Skiing accident — confirmed ACL tear, pre-op management.",
            created_date=date(2024, 1, 15)),
        MedicalCaseModel(id="CASE-004", patient_id="PT-1003",
            title="Chronic Migraine Management", status="Active",
            description="Ongoing prophylactic treatment for chronic migraines.",
            created_date=date(2024, 2, 10)),
        MedicalCaseModel(id="CASE-005", patient_id="P-001",
            title="Cardiovascular Risk Management", status="Active",
            description="Type 2 Diabetes + hypercholesterolaemia — dual risk factor management.",
            created_date=date(2026, 1, 15)),
    ]
    db.add_all(cases)

    # ── Appointments ──────────────────────────────────────────────────────────
    appointments = [
        AppointmentModel(id="APP-001", patient_id="P-10101", case_id="CASE-001", doctor_id="D-99",
            date=date(2023, 10, 14), topic="Annual Physical", status="Completed",
            report="Patient presented for routine annual physical. Vitals stable. BP 118/75, HR 72 bpm.",
            patient_summary="You came in for your routine annual physical. Everything looks stable."),
        AppointmentModel(id="APP-002", patient_id="P-10101", case_id="CASE-001", doctor_id="D-99",
            date=date(2023, 11, 5), topic="Lab Results Review", status="Completed",
            report="Reviewed lipid panel. LDL cholesterol slightly elevated at 135 mg/dL. Thyroid normal.",
            patient_summary="Your cholesterol is slightly elevated but thyroid is normal. No medication needed yet."),
        AppointmentModel(id="APP-003", patient_id="P-10101", case_id="CASE-002", doctor_id="D-99",
            date=date(2024, 2, 28), topic="Dermatology Consult", status="Completed",
            report="Evaluation of pigmented lesion: 4mm, asymmetric, irregular borders. Excisional biopsy recommended.",
            patient_summary="The pigmented lesion has features that warrant a biopsy. Excision recommended."),
        AppointmentModel(id="APP-004", patient_id="PT-1002", case_id="CASE-003", doctor_id="D-99",
            date=date(2024, 1, 15), topic="Post-ER Orthopedic Review", status="Review Required",
            report="ACL tear confirmed on MRI. Grade II medial meniscus tear. Surgical referral placed.",
            patient_summary="Your MRI confirms an ACL tear. Surgery will be needed. PT started in the meantime."),
        AppointmentModel(id="APP-005", patient_id="PT-1003", case_id="CASE-004", doctor_id="D-99",
            date=date(2024, 2, 10), topic="Migraine Follow-up", status="Completed",
            report="Migraine frequency reduced from 4x/week to 1x/week with Topiramate. Continuing current regimen.",
            patient_summary="Great news — migraines are down from 4 per week to 1 per week since starting Topiramate."),
        AppointmentModel(id="APP-006", patient_id="P-001", case_id="CASE-005", doctor_id="D-99",
            date=date(2026, 2, 10), topic="Cardiovascular Risk Review", status="Pending",
            report="",
            patient_summary=""),
    ]
    db.add_all(appointments)

    # ── Prescriptions ─────────────────────────────────────────────────────────
    prescriptions = [
        ERecept(id="RX-001", patient_id="P-10101", doctor_id="D-99", appointment_id="APP-003",
            drug_name_strength="Mupirocin 2% Ointment", active_ingredient="Mupirocin",
            dosage_instructions="Apply to affected area 3x daily for 7 days",
            status="Kiváltható", expiry_date=date(2024, 3, 28)),
        ERecept(id="RX-002", patient_id="P-10101", doctor_id="D-99", appointment_id="APP-003",
            drug_name_strength="Ibuprofen 400mg", active_ingredient="Ibuprofen",
            dosage_instructions="1 tablet every 6 hours as needed for pain",
            status="Kiváltható", expiry_date=date(2024, 5, 28)),
        ERecept(id="RX-004", patient_id="PT-1002", doctor_id="D-99", appointment_id="APP-004",
            drug_name_strength="Celecoxib 200mg", active_ingredient="Celecoxib",
            dosage_instructions="1 capsule daily with food",
            status="Kiváltható", expiry_date=date(2024, 2, 15)),
        ERecept(id="RX-005", patient_id="PT-1002", doctor_id="D-99", appointment_id="APP-004",
            drug_name_strength="Tramadol 50mg", active_ingredient="Tramadol",
            dosage_instructions="1 tablet every 6 hours as needed for severe pain",
            status="Kiváltható", expiry_date=date(2024, 2, 15)),
        ERecept(id="RX-008", patient_id="PT-1003", doctor_id="D-99", appointment_id="APP-005",
            drug_name_strength="Sumatriptan 50mg", active_ingredient="Sumatriptan",
            dosage_instructions="1 tablet at onset of migraine",
            status="Kiváltható", expiry_date=date(2025, 2, 10)),
        ERecept(id="RX-009", patient_id="PT-1003", doctor_id="D-99", appointment_id="APP-005",
            drug_name_strength="Topiramate 25mg", active_ingredient="Topiramate",
            dosage_instructions="1 tablet twice daily for prevention",
            status="Kiváltva", expiry_date=date(2025, 2, 10)),
    ]
    db.add_all(prescriptions)

    # ── eBeutaló referrals ────────────────────────────────────────────────────
    referrals = [
        EBeutalo(id="REF-001", patient_id="PT-1002",
            target_specialty="Orthopedic Surgery",
            reason_for_referral="ACL reconstruction — confirmed complete ACL tear on MRI.",
            urgency="Routine", status="Available"),
        EBeutalo(id="REF-002", patient_id="P-10101",
            target_specialty="Dermatology",
            reason_for_referral="Excisional biopsy of pigmented lesion — ABCDE positive.",
            urgency="Urgent", status="Available"),
        EBeutalo(id="REF-003", patient_id="P-001",
            target_specialty="Cardiology",
            reason_for_referral="Cardiovascular risk assessment — T2DM + hypercholesterolaemia.",
            urgency="Routine", status="Available"),
    ]
    db.add_all(referrals)

    db.commit()
    db.close()
    print("Database seeded successfully with generic Mesh data.")

if __name__ == "__main__":
    seed()
