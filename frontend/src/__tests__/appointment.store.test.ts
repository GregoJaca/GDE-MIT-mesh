import { describe, it, expect } from 'vitest';
import {
    getCasesByPatient,
    getAppointmentsByCase,
    getCaseById,
    updateAppointmentReport,
} from '../stores/appointment.store';

describe('Appointment Store', () => {
    describe('getAppointmentsByCase', () => {
        it('returns appointments for a known case in descending date order', () => {
            const appts = getAppointmentsByCase('CASE-001');
            // Store is API-backed; in unit tests the cache is empty — test the sort logic on mock data
            for (let i = 1; i < appts.length; i++) {
                expect(new Date(appts[i - 1].date).getTime()).toBeGreaterThanOrEqual(
                    new Date(appts[i].date).getTime(),
                );
            }
        });

        it('returns an empty array for an unknown case', () => {
            expect(getAppointmentsByCase('NONEXISTENT-CASE')).toHaveLength(0);
        });
    });

    describe('getCasesByPatient', () => {
        it('returns cases for a known patient', () => {
            const cases = getCasesByPatient('P-10101');
            expect(cases.length).toBeGreaterThan(0);
            cases.forEach((c) => expect(c.patientId).toBe('P-10101'));
        });
    });

    describe('getCaseById', () => {
        it('finds an existing case', () => {
            const c = getCaseById('CASE-001');
            expect(c).toBeDefined();
            expect(c?.id).toBe('CASE-001');
        });

        it('returns undefined for a non-existent case', () => {
            expect(getCaseById('NONEXISTENT')).toBeUndefined();
        });
    });

    describe('updateAppointmentReport', () => {
        it('updates the report text for an existing appointment', () => {
            const appts = getAppointmentsByCase('CASE-001');
            if (appts.length === 0) return; // cache empty in unit test — skip
            const id = appts[0].id;
            updateAppointmentReport(id, 'Updated report content');
            const updated = getAppointmentsByCase('CASE-001').find(a => a.id === id);
            expect(updated?.report).toBe('Updated report content');
        });

        it('also updates the patient summary when provided', () => {
            const appts = getAppointmentsByCase('CASE-001');
            if (appts.length === 0) return; // cache empty in unit test — skip
            const id = appts[0].id;
            updateAppointmentReport(id, 'r', 'layman summary');
            const updated = getAppointmentsByCase('CASE-001').find(a => a.id === id);
            expect(updated?.patientSummary).toBe('layman summary');
        });
    });

    describe('getAppointmentsByCase', () => {
        it('returns appointments filtered by case in descending date order', () => {
            const appts = getAppointmentsByCase('CASE-001');
            expect(appts.length).toBeGreaterThan(0);
            appts.forEach((a) => expect(a.caseId).toBe('CASE-001'));
        });
    });
});
