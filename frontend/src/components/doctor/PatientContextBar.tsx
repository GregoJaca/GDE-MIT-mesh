import { Stethoscope } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Patient, MedicalCase } from '@/types';

interface PatientContextBarProps {
    selectedPatientId: string;
    selectedPatient: Patient | undefined;
    selectedCase: MedicalCase | null;
    selectedAppointmentTopic: string;
    patientsList: Patient[];
    onPatientChange: (id: string) => void;
}

export default function PatientContextBar({
    selectedPatientId,
    selectedPatient,
    selectedCase,
    selectedAppointmentTopic,
    patientsList,
    onPatientChange,
}: PatientContextBarProps) {
    return (
        <div className="flex items-center gap-6 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 shrink-0 transition-colors">
            <div className="max-w-xs w-full">
                <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase tracking-widest">
                    Active Patient
                </label>
                <Select value={selectedPatientId} onValueChange={onPatientChange}>
                    <SelectTrigger className="w-full h-10 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:ring-brand-teal">
                        <SelectValue placeholder="Select a patient..." />
                    </SelectTrigger>
                    <SelectContent>
                        {patientsList.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="font-medium cursor-pointer">
                                {p.name} <span className="text-slate-400 font-normal ml-2">({p.id})</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedPatient && (
                <>
                    <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700" />
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-lime/20 flex items-center justify-center text-brand-teal font-bold border border-brand-lime/50 shadow-sm">
                            {selectedPatient.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-brand-plum dark:text-brand-lime m-0">{selectedPatient.name}</p>
                            <p className="text-xs text-brand-slate dark:text-slate-400 font-medium m-0">
                                {selectedPatient.age ? `${selectedPatient.age} yrs` : 'Age N/A'} • {selectedPatient.gender}
                            </p>
                        </div>
                    </div>
                </>
            )}

            <div className="ml-auto flex items-center gap-3">
                {selectedCase && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-brand-plum/5 to-brand-teal/5 dark:from-brand-plum/10 dark:to-brand-teal/10 text-brand-plum dark:text-brand-lime px-3 py-1.5 rounded-lg text-sm font-medium border border-brand-plum/15 dark:border-brand-lime/20">
                        <span className="text-base">{selectedCase.icon}</span>
                        {selectedCase.title}
                    </div>
                )}
                <div className="flex items-center gap-2 bg-brand-mint/10 text-brand-teal px-3 py-1.5 rounded-lg text-sm font-medium border border-brand-teal/20">
                    <Stethoscope className="w-4 h-4" />
                    {selectedAppointmentTopic}
                </div>
            </div>
        </div>
    );
}
