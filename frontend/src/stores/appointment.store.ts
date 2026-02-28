// API-backed appointment store.
// Fetches cases and appointments from the backend database.

import { APP_CONFIG } from '@/config/app.config';
import type { Appointment, MedicalCase, Patient, MedicationAction } from '@/types';

const API_BASE = APP_CONFIG.API.BASE_URL;

// ---- Patient cache ----
let _patients: Patient[] = [];
export function setPatientCache(patients: Patient[]): void { _patients = patients; }
export function getPatientById(id: string): Patient | undefined { return _patients.find((p) => p.id === id); }

// ---- API fetch functions ----

export async function fetchCasesByPatient(patientId: string): Promise<MedicalCase[]> {
    const res = await fetch(`${API_BASE}/cases/${patientId}`);
    if (!res.ok) return [];
    return res.json();
}

export async function fetchAppointmentsByCase(caseId: string): Promise<Appointment[]> {
    const res = await fetch(`${API_BASE}/appointments/${caseId}`);
    if (!res.ok) return [];
    return res.json();
}

// ---- In-memory cache for fast lookups (populated after API fetch) ----
let _cases: MedicalCase[] = [];
let _appointments: Appointment[] = [];

export function setCasesCache(cases: MedicalCase[]): void { _cases = cases; }
export function setAppointmentsCache(appointments: Appointment[]): void { _appointments = appointments; }

export function getCasesByPatient(patientId: string): MedicalCase[] {
    return _cases
        .filter((c) => c.patientId === patientId)
        .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
}

export function getAppointmentsByCase(caseId: string): Appointment[] {
    return _appointments
        .filter((a) => a.caseId === caseId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getCaseById(caseId: string): MedicalCase | undefined {
    return _cases.find((c) => c.id === caseId);
}

// ---- Mutators ----

export function updateAppointmentReport(
    id: string,
    newReport: string,
    newSummary?: string,
    newActionables?: MedicationAction[]
): void {
    const idx = _appointments.findIndex((a) => a.id === id);
    if (idx !== -1) {
        _appointments[idx] = {
            ..._appointments[idx],
            report: newReport,
            ...(newSummary ? { patientSummary: newSummary } : {}),
            ...(newActionables ? { actionables: newActionables } : {}),
        };
    }
}
