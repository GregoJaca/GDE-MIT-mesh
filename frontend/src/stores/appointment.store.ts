// In-memory appointment store with mutators.
// Provides data access helpers used across the app.
// In a production system, this would be replaced by a server-side store.

import { MOCK_APPOINTMENTS, MOCK_CASES } from '@/config/mock-fixtures';
import type { Patient } from '@/types';

// In-memory patient list — populated by the patient service on first load
let _patients: Patient[] = [];
export function setPatientCache(patients: Patient[]): void { _patients = patients; }
export function getPatientById(id: string): Patient | undefined { return _patients.find((p) => p.id === id); }

import type { Appointment, MedicalCase } from '@/types';

// Internal mutable arrays seeded from mock fixtures
const appointments: Appointment[] = [...MOCK_APPOINTMENTS];
const medicalCases: MedicalCase[] = [...MOCK_CASES];

// --- Query helpers ---

export function getAppointmentsByPatient(patientId: string): Appointment[] {
    return appointments
        .filter((a) => a.patientId === patientId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getCasesByPatient(patientId: string): MedicalCase[] {
    return medicalCases
        .filter((c) => c.patientId === patientId)
        .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
}

export function getAppointmentsByCase(caseId: string): Appointment[] {
    return appointments
        .filter((a) => a.caseId === caseId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getCaseById(caseId: string): MedicalCase | undefined {
    return medicalCases.find((c) => c.id === caseId);
}

// --- Mutators ---

export function updateAppointmentReport(
    id: string,
    newReport: string,
    newSummary?: string,
): void {
    const idx = appointments.findIndex((a) => a.id === id);
    if (idx !== -1) {
        appointments[idx] = {
            ...appointments[idx],
            report: newReport,
            ...(newSummary ? { patientSummary: newSummary } : {}),
        };
    }
}
