// API service layer for consultation/transcription endpoints.

import { APP_CONFIG } from '@/config/app.config';
import type { PatientContext } from '@/types';

export interface DraftPayload {
    patientContext: PatientContext;
    doctorId: string;
    date: string;
    audio: Blob;
    language: string;
    transcript?: string;
}

export async function generateDraft(payload: DraftPayload): Promise<import('@/types').DraftResponse> {
    const formData = new FormData();
    formData.append('patient_id', payload.patientContext.patient.id);
    formData.append('doctor_id', payload.doctorId);
    formData.append('encounter_date', payload.date);
    formData.append('language', payload.language);
    if (payload.transcript) {
        formData.append('transcript', payload.transcript);
    }
    formData.append('audio', payload.audio, 'consultation.webm');

    const res = await fetch(`${APP_CONFIG.API.BASE_URL}/generate-draft`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || `Draft API error: ${res.status}`);
    }
    return res.json();
}

export async function finalizeReport(payload: import('@/types').FinalizeRequestPayload): Promise<import('@/types').ConsultationResult> {
    const res = await fetch(`${APP_CONFIG.API.BASE_URL}/finalize-report`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || `Finalize API error: ${res.status}`);
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

export async function getEhrDocument(systemDocId: string): Promise<{ system_doc_id: string; doc_type: string; date: string; content: string }> {
    const res = await fetch(`${APP_CONFIG.API.BASE_URL}/ehr/${systemDocId}`);
    if (!res.ok) {
        throw new Error(`Failed to fetch EHR: ${res.status}`);
    }
    return res.json();
}
