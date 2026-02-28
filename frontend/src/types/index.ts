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
    actionables?: MedicationAction[];
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

// API response from the finalized consultation endpoint
export interface ConsultationResult {
    medical_report_pdf_url: string;
    patient_summary_md: string;
    administrative_metadata: {
        patient_id: string;
        patient_name: string;
        patient_taj: string;
        doctor_id: string;
        doctor_name: string;
        doctor_seal: string;
        encounter_date: string;
    };
}

// Editable dictionary structure returned by the Draft endpoint
export interface ClinicalDraftJson {
    chief_complaints: ClinicalFinding[];
    assessments: ClinicalFinding[];
    actionables: MedicationAction[];
}

export interface DraftResponse {
    administrative_metadata: {
        patient_id: string;
        patient_name: string;
        patient_taj: string;
        doctor_id: string;
        doctor_name: string;
        doctor_seal: string;
        encounter_date: string;
    };
    patient_summary_md: string;
    clinical_draft_json: ClinicalDraftJson;
    token_map: Record<string, string>;
}

export interface FinalizeRequestPayload {
    patient_id: string;
    doctor_id: string;
    encounter_date: string;
    format_id: string;
    edited_clinical_json: ClinicalDraftJson;
}

export interface ClinicalFinding {
    finding: string;
    condition_status: string;
    system_reference_id?: string;
    exact_quote?: string;
    contextual_quote?: string;
}

export interface MedicationAction {
    action_type: string;
    description: string;
    timeframe?: string;
    status?: string;
    system_reference_id?: string;
    exact_quote?: string;
    contextual_quote?: string;
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
