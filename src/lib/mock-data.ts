export interface Patient {
  id: string;
  name: string;
  age: number; // For now keeping mock age since we return DOB from API, but we'll mock it if missing
  gender: string;
}

export interface MedicalCase {
  id: string;
  patientId: string;
  title: string;
  description: string;
  status: 'Active' | 'Closed';
  createdDate: string;
  icon: string; // emoji for visual flair
}

export interface Appointment {
  id: string;
  patientId: string;
  caseId: string;
  date: string;
  topic: string;
  doctorId: string;
  report: string;
  patientSummary?: string;
  status: 'Completed' | 'Pending' | 'Review Required';
}

// We empty the synchronous mocked patient list to enforce using API
export const patients: Patient[] = [];

// New async fetch functions
export const fetchPatients = async (): Promise<Patient[]> => {
  try {
    const res = await fetch("http://localhost:8000/api/v1/eeszt/patients");
    const data = await res.json();
    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      age: 44, // Dummy age since API only sends raw dob
      gender: 'Undefined' // Dummy gender since API doesn't hold it
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const fetchPatientContext = async (patientId: string) => {
  try {
    const res = await fetch(`http://localhost:8000/api/v1/eeszt/context/${patientId}`);
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const medicalCases: MedicalCase[] = [
  // Sarah Jenkins (PT-1001)
  {
    id: 'CASE-001',
    patientId: 'PT-1001',
    title: 'Annual Checkup & Labs',
    description: 'Routine annual physical and follow-up lab review.',
    status: 'Closed',
    createdDate: '2023-10-14',
    icon: '🩺',
  },
  {
    id: 'CASE-002',
    patientId: 'PT-1001',
    title: 'Skin Lesion Evaluation',
    description: 'Evaluation of pigmented lesion on right forearm.',
    status: 'Active',
    createdDate: '2024-02-28',
    icon: '🔬',
  },
  // Michael Chen (PT-1002)
  {
    id: 'CASE-003',
    patientId: 'PT-1002',
    title: 'Right Knee Injury',
    description: 'Skiing accident — suspected ACL tear or meniscus injury.',
    status: 'Active',
    createdDate: '2024-01-15',
    icon: '🦴',
  },
  // Emma Watson (PT-1003)
  {
    id: 'CASE-004',
    patientId: 'PT-1003',
    title: 'Chronic Migraine Management',
    description: 'Ongoing prophylactic treatment for chronic migraines.',
    status: 'Active',
    createdDate: '2024-02-10',
    icon: '🧠',
  },
];

export const appointments: Appointment[] = [
  // Jane Doe (P-10101)
  {
    id: 'APP-001',
    patientId: 'P-10101',
    caseId: 'CASE-001',
    date: '2023-10-14',
    topic: 'Annual Physical',
    doctorId: 'DR-001',
    status: 'Completed',
    report: `Patient presented for routine annual physical. Vitals are stable. Blood pressure 118/75, HR 72 bpm. Patient reports occasional fatigue but otherwise feels well. Labs ordered for general wellness panel. Recommended increasing cardiovascular exercises and maintaining current diet. No urgent concerns at this time.`,
    patientSummary: `Hello Jane, you came in today for your routine annual physical. Everything looks stable. Your blood pressure and heart rate are normal. You mentioned feeling somewhat fatigued, but we didn't find any urgent issues. We have ordered a general wellness blood panel to check on things. In the meantime, I recommend increasing your cardiovascular exercise. No urgent concerns at this time.`
  },
  {
    id: 'APP-002',
    patientId: 'P-10101',
    caseId: 'CASE-001',
    date: '2023-11-05',
    topic: 'Lab Results Review',
    doctorId: 'DR-001',
    status: 'Completed',
    report: `Reviewed lab results from 10/14. Lipid panel shows slightly elevated LDL cholesterol (135 mg/dL). Thyroid function normal. Vitamin D levels are on the lower side of normal (32 ng/mL). Discussed dietary modifications to reduce saturated fats. Prescribed Vitamin D3 1000 IU daily. Follow up in 6 months to recheck lipids.`,
    patientSummary: `Hi Jane. We reviewed your recent lab results today. Your cholesterol is slightly elevated, but your thyroid function is completely normal. Your Vitamin D levels are on the lower side. To help manage this, we discussed some dietary modifications to reduce saturated fats. I have prescribed a Vitamin D3 supplement for you to take daily. Let's schedule a follow-up appointment in 6 months to recheck your cholesterol levels.`
  },
  {
    id: 'APP-003',
    patientId: 'P-10101',
    caseId: 'CASE-002',
    date: '2024-02-28',
    topic: 'Dermatology Consult',
    doctorId: 'DR-002',
    status: 'Completed',
    report: `Evaluation of new pigmented lesion on right forearm. Lesion is 4mm, asymmetrical with irregular borders. Dermoscopy shows atypical network. Recommended excisional biopsy to rule out melanoma. Procedure scheduled for next week. Patient counseled on sun protection and regular self-examinations.`,
    patientSummary: `Hello Jane. Today we evaluated the new pigmented lesion on your right forearm. Because it has irregular borders and some atypical features under the microscope, I recommend we do an excisional biopsy next week just to rule out anything serious like melanoma. It will be a quick procedure. Please remember to use sun protection and continue doing regular skin self-examinations.`
  },

  // Michael Chen (PT-1002)
  {
    id: 'APP-004',
    patientId: 'PT-1002',
    caseId: 'CASE-003',
    date: '2024-01-15',
    topic: 'Orthopedic Evaluation',
    doctorId: 'DR-003',
    status: 'Review Required',
    report: `Patient presents with right knee pain following a skiing incident 3 days ago. Exam reveals moderate effusion, positive Lachman test, and joint line tenderness. Suspected ACL tear or meniscus injury. MRI of right knee ordered immediately. Prescribed NSAIDs and recommended crutches with minimal weight bearing until MRI results are reviewed.`,
    patientSummary: `Hi Michael. Let's talk about your right knee. The swelling and tenderness you're experiencing from your skiing accident suggests you might have a meniscus injury or an ACL tear. We are ordering an MRI immediately to get a clear picture. For now, please take the prescribed NSAIDs for the pain, use your crutches, and minimize putting any weight on that leg until we review the MRI results.`
  },

  // Emma Watson (PT-1003)
  {
    id: 'APP-005',
    patientId: 'PT-1003',
    caseId: 'CASE-004',
    date: '2024-02-10',
    topic: 'Migraine Follow-up',
    doctorId: 'DR-004',
    status: 'Completed',
    report: `Follow up on chronic migraine management. Patient reports decreased frequency of attacks from 4x/week to 1x/week since starting prophylactic medication (Topiramate). Current dosage is effective and well-tolerated. Reviewed migraine diary. Discussed the importance of maintaining consistent sleep schedule and hydration. Will continue current treatment plan.`,
    patientSummary: `Good morning Emma. We discussed your chronic migraine management today. It's great news that the frequency of your attacks has decreased from four times a week down to once a week since starting Topiramate. Since the current dosage is effective and you have no side effects, we will continue this treatment plan. Please remember to maintain a consistent sleep schedule and stay well hydrated.`
  }
];

// Helper functions for mock backend
export const getAppointmentsByPatient = (patientId: string) => {
  return appointments.filter(a => a.patientId === patientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getCasesByPatient = (patientId: string) => {
  return medicalCases.filter(c => c.patientId === patientId).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
};

export const getAppointmentsByCase = (caseId: string) => {
  return appointments.filter(a => a.caseId === caseId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getCaseById = (caseId: string) => {
  return medicalCases.find(c => c.id === caseId);
};

export const getPatientById = (patientId: string) => {
  return patients.find(p => p.id === patientId);
};

export const updateAppointmentReport = (id: string, newReport: string, newSummary?: string) => {
  const idx = appointments.findIndex(a => a.id === id);
  if (idx !== -1) {
    appointments[idx].report = newReport;
    if (newSummary) {
      appointments[idx].patientSummary = newSummary;
    }
  }
};
