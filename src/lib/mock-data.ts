export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string;
  topic: string;
  doctorId: string;
  report: string;
  status: 'Completed' | 'Pending' | 'Review Required';
}

export const patients: Patient[] = [
  { id: 'PT-1001', name: 'Sarah Jenkins', age: 34, gender: 'Female' },
  { id: 'PT-1002', name: 'Michael Chen', age: 45, gender: 'Male' },
  { id: 'PT-1003', name: 'Emma Watson', age: 28, gender: 'Female' },
];

export const appointments: Appointment[] = [
  // Sarah Jenkins (PT-1001)
  {
    id: 'APP-001',
    patientId: 'PT-1001',
    date: '2023-10-14',
    topic: 'Annual Physical',
    doctorId: 'DR-001',
    status: 'Completed',
    report: `Patient presented for routine annual physical. Vitals are stable. Blood pressure 118/75, HR 72 bpm. Patient reports occasional fatigue but otherwise feels well. Labs ordered for general wellness panel. Recommended increasing cardiovascular exercises and maintaining current diet. No urgent concerns at this time.`,
  },
  {
    id: 'APP-002',
    patientId: 'PT-1001',
    date: '2023-11-05',
    topic: 'Lab Results Review',
    doctorId: 'DR-001',
    status: 'Completed',
    report: `Reviewed lab results from 10/14. Lipid panel shows slightly elevated LDL cholesterol (135 mg/dL). Thyroid function normal. Vitamin D levels are on the lower side of normal (32 ng/mL). Discussed dietary modifications to reduce saturated fats. Prescribed Vitamin D3 1000 IU daily. Follow up in 6 months to recheck lipids.`,
  },
  {
    id: 'APP-003',
    patientId: 'PT-1001',
    date: '2024-02-28',
    topic: 'Dermatology Consult',
    doctorId: 'DR-002',
    status: 'Completed',
    report: `Evaluation of new pigmented lesion on right forearm. Lesion is 4mm, asymmetrical with irregular borders. Dermoscopy shows atypical network. Recommended excisional biopsy to rule out melanoma. Procedure scheduled for next week. Patient counseled on sun protection and regular self-examinations.`,
  },
  
  // Michael Chen (PT-1002)
  {
    id: 'APP-004',
    patientId: 'PT-1002',
    date: '2024-01-15',
    topic: 'Orthopedic Evaluation',
    doctorId: 'DR-003',
    status: 'Review Required',
    report: `Patient presents with right knee pain following a skiing incident 3 days ago. Exam reveals moderate effusion, positive Lachman test, and joint line tenderness. Suspected ACL tear or meniscus injury. MRI of right knee ordered immediately. Prescribed NSAIDs and recommended crutches with minimal weight bearing until MRI results are reviewed.`,
  },

  // Emma Watson (PT-1003)
  {
    id: 'APP-005',
    patientId: 'PT-1003',
    date: '2024-02-10',
    topic: 'Migraine Follow-up',
    doctorId: 'DR-004',
    status: 'Completed',
    report: `Follow up on chronic migraine management. Patient reports decreased frequency of attacks from 4x/week to 1x/week since starting prophylactic medication (Topiramate). Current dosage is effective and well-tolerated. Reviewed migraine diary. Discussed the importance of maintaining consistent sleep schedule and hydration. Will continue current treatment plan.`,
  }
];

// Helper functions for mock backend
export const getAppointmentsByPatient = (patientId: string) => {
  return appointments.filter(a => a.patientId === patientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getPatientById = (patientId: string) => {
  return patients.find(p => p.id === patientId);
};
