// Mock data for local development and testing.
// These fixtures are used when VITE_ENABLE_MOCK_DATA=true or when the API is unavailable.
// All upstream system reference IDs are kept as generic identifiers.

import type { MedicalCase, Appointment } from '@/types';

export const MOCK_CASES: MedicalCase[] = [
    {
        id: 'CASE-001',
        patientId: 'P-10101',
        title: 'Annual Checkup & Labs',
        description: 'Routine annual physical and follow-up lab review.',
        status: 'Closed',
        createdDate: '2023-10-14',
        icon: '',
    },
    {
        id: 'CASE-002',
        patientId: 'P-10101',
        title: 'Skin Lesion Evaluation',
        description: 'Evaluation of pigmented lesion on right forearm.',
        status: 'Active',
        createdDate: '2024-02-28',
        icon: '',
    },
    {
        id: 'CASE-003',
        patientId: 'PT-1002',
        title: 'Right Knee Injury',
        description: 'Skiing accident — suspected ACL tear or meniscus injury.',
        status: 'Active',
        createdDate: '2024-01-15',
        icon: '',
    },
    {
        id: 'CASE-004',
        patientId: 'PT-1003',
        title: 'Chronic Migraine Management',
        description: 'Ongoing prophylactic treatment for chronic migraines.',
        status: 'Active',
        createdDate: '2024-02-10',
        icon: '',
    },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
    {
        id: 'APP-001',
        patientId: 'P-10101',
        caseId: 'CASE-001',
        date: '2023-10-14',
        topic: 'Annual Physical',
        doctorId: 'DR-001',
        status: 'Completed',
        report: `Patient presented for routine annual physical. Vitals are stable. Blood pressure 118/75, HR 72 bpm. Patient reports occasional fatigue but otherwise feels well. Labs ordered for general wellness panel. Recommended increasing cardiovascular exercises and maintaining current diet. No urgent concerns at this time.`,
        patientSummary: `Hello, you came in today for your routine annual physical. Everything looks stable. Your blood pressure and heart rate are normal. You mentioned feeling somewhat fatigued, but we didn't find any urgent issues. We have ordered a general wellness blood panel to check on things.`,
    },
    {
        id: 'APP-002',
        patientId: 'P-10101',
        caseId: 'CASE-001',
        date: '2023-11-05',
        topic: 'Lab Results Review',
        doctorId: 'DR-001',
        status: 'Completed',
        report: `Reviewed lab results from 10/14. Lipid panel shows slightly elevated LDL cholesterol (135 mg/dL). Thyroid function normal. Vitamin D levels on the lower side (32 ng/mL). Discussed dietary modifications. Prescribed Vitamin D3 1000 IU daily. Follow up in 6 months to recheck lipids.`,
        patientSummary: `We reviewed your recent lab results. Your cholesterol is slightly elevated, but your thyroid function is completely normal. Your Vitamin D levels are on the lower side. I have prescribed a Vitamin D3 supplement for you to take daily.`,
    },
    {
        id: 'APP-003',
        patientId: 'P-10101',
        caseId: 'CASE-002',
        date: '2024-02-28',
        topic: 'Dermatology Consult',
        doctorId: 'DR-002',
        status: 'Completed',
        report: `Evaluation of new pigmented lesion on right forearm. Lesion is 4mm, asymmetrical with irregular borders. Dermoscopy shows atypical network. Recommended excisional biopsy to rule out melanoma. Patient counseled on sun protection and regular self-examinations.`,
        patientSummary: `Today we evaluated the new pigmented lesion on your right forearm. Because it has irregular borders and some atypical features under the microscope, I recommend we do an excisional biopsy next week just to rule out anything serious.`,
    },
    {
        id: 'APP-004',
        patientId: 'PT-1002',
        caseId: 'CASE-003',
        date: '2024-01-15',
        topic: 'Orthopedic Evaluation',
        doctorId: 'DR-003',
        status: 'Review Required',
        report: `Patient presents with right knee pain following a skiing incident 3 days ago. Exam reveals moderate effusion, positive Lachman test, and joint line tenderness. Suspected ACL tear or meniscus injury. MRI of right knee ordered immediately.`,
        patientSummary: `The swelling and tenderness you're experiencing from your skiing accident suggests you might have a meniscus injury or an ACL tear. We are ordering an MRI immediately to get a clear picture.`,
    },
    {
        id: 'APP-005',
        patientId: 'PT-1003',
        caseId: 'CASE-004',
        date: '2024-02-10',
        topic: 'Migraine Follow-up',
        doctorId: 'DR-004',
        status: 'Completed',
        report: `Follow up on chronic migraine management. Patient reports decreased frequency from 4x/week to 1x/week since starting prophylactic medication (Topiramate). Current dosage effective and well-tolerated.`,
        patientSummary: `Great news — the frequency of your attacks has decreased from four times a week down to once a week since starting Topiramate. We will continue this treatment plan.`,
    },
];

// Pre-seeded report PDF entries.
// Empty by default — reports are generated dynamically by the AI pipeline.
// The ReportViewer will show a clean empty state when no PDF has been generated yet.
export const MOCK_REPORT_PDFS: Record<string, { title: string; date: string; provider: string; pdfUrl: string }> = {};

