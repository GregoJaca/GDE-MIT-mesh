// API service layer for patient-related endpoints.
// All fetch calls are centralized here; no raw fetch() outside this directory.

import { APP_CONFIG } from '@/config/app.config';
import type { Patient, PatientContext } from '@/types';

export async function fetchPatients(): Promise<Patient[]> {
    const res = await fetch(APP_CONFIG.API.PATIENTS_URL);
    if (!res.ok) throw new Error(`Failed to fetch patients: ${res.status}`);
    const data: Array<{ id: string; name: string; dob?: string }> = await res.json();
    return data.map((p) => ({
        id: p.id,
        name: p.name,
        // DOB not exposed by the current API — kept as a sensible default
        age: 0,
        gender: 'Unknown',
    }));
}

export async function fetchPatientContext(patientId: string): Promise<PatientContext> {
    const res = await fetch(`${APP_CONFIG.API.PATIENT_CONTEXT_URL}/${patientId}`);
    if (!res.ok) throw new Error(`Failed to fetch patient context: ${res.status}`);
    return res.json();
}
