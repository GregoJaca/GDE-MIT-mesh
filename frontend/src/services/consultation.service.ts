// API service layer for consultation/transcription endpoints.

import { APP_CONFIG } from '@/config/app.config';
import type { ConsultationResult, PatientContext } from '@/types';

export interface ConsultationPayload {
    patientContext: PatientContext;
    transcript: string;
    doctorId: string;
    doctorName: string;
    doctorSeal: string;
}

export async function generateConsultation(payload: ConsultationPayload): Promise<ConsultationResult> {
    const res = await fetch(APP_CONFIG.API.CONSULTATION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            metadata: {
                patient_id: payload.patientContext.patient.id,
                patient_name: payload.patientContext.patient.name,
                patient_taj: payload.patientContext.patient.taj,
                doctor_id: payload.doctorId,
                doctor_name: payload.doctorName,
                doctor_seal: payload.doctorSeal,
                encounter_date: new Date().toISOString(),
                context_documents: payload.patientContext.context_documents,
            },
            transcript: payload.transcript,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || `Consultation API error: ${res.status}`);
    }
    return res.json();
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ transcript: string }> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');

    const res = await fetch(APP_CONFIG.API.TRANSCRIBE_URL, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || `Transcription error: ${res.status}`);
    }
    return res.json();
}
