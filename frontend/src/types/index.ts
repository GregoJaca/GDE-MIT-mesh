// Domain types shared across the application.
// All types use generic field names to decouple business logic from upstream systems.

export interface Patient {
    id: string;
    name: string;
    age: number;
    gender: string;
}

export interface MedicalCase {
    id: string;
    patientId: string;
    title: string;
    description: string;
    status: 'Active' | 'Closed';
    createdDate: string;
    icon: string;
}

export type AppointmentStatus = 'Completed' | 'Pending' | 'Review Required';

export interface Appointment {
    id: string;
    patientId: string;
    caseId: string;
    date: string;
    topic: string;
    doctorId: string;
    report: string;
    patientSummary?: string;
    status: AppointmentStatus;
}

// External system context document (generic abstraction over upstream system pointers)
export interface ContextDocument {
    system_doc_id: string;
    document_type: string;
    content_summary?: string;
}

export interface PatientContext {
    patient: Patient & { taj?: string };
    context_documents: ContextDocument[];
}

// API response from the consultation generation endpoint
export interface ConsultationResult {
    administrative_metadata: {
        patient_id: string;
        patient_name: string;
        patient_taj: string;
        doctor_id: string;
        doctor_name: string;
        doctor_seal: string;
        encounter_date: string;
    };
    clinical_report: {
        chief_complaints: ClinicalFinding[];
        assessments: ClinicalFinding[];
        medications: MedicationAction[];
    };
    patient_summary: {
        layman_explanation: string;
        actionables: { description: string; timeframe?: string }[];
    };
}

export interface ClinicalFinding {
    finding: string;
    condition_status: string;
    system_reference_id?: string;
}

export interface MedicationAction {
    action_type: string;
    description: string;
    timeframe?: string;
    system_reference_id?: string;
}

export interface Recording {
    id: string;
    appointmentId: string;
    blob: Blob;
    url: string;
    duration: number;
    timestamp: string;
}

export interface ReportData {
    appointmentId: string;
    topic: string;
    doctorId: string;
    date: string;
    patientId: string;
    reportNotes: string;
}

export type UserRole = 'patient' | 'doctor';
export type SaveFormat = 'pdf' | 'markdown';
export type TabId = 'report' | 'notes' | 'upload';
