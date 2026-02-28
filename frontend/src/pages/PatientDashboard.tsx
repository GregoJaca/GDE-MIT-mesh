import { Calendar, Stethoscope } from 'lucide-react';
import { useAppointmentContext } from '@/layouts/DashboardLayout';
import ReportViewer from '@/components/shared/ReportViewer';
import AiAssistantPanel from '@/components/patient/AiAssistantPanel';
import ReactMarkdown from 'react-markdown';
import { formatDate } from '@/lib/utils';

export default function PatientDashboard() {
    const { selectedAppointment, selectedCase } = useAppointmentContext();

    if (!selectedAppointment) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                <Calendar className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">No Appointment Selected</p>
                <p className="text-sm">Select an appointment from the sidebar to view details</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Appointment header */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 shrink-0 transition-colors">
                <div>
                    {selectedCase && (
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 bg-brand-plum/8 dark:bg-brand-plum/15 text-brand-plum dark:text-brand-lime px-2.5 py-1 rounded-lg text-xs font-semibold border border-brand-plum/15 dark:border-brand-lime/20">
                                <span className="text-sm">{selectedCase.icon}</span>
                                {selectedCase.title}
                            </div>
                        </div>
                    )}
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        {selectedAppointment.topic}
                        <span className="text-xs font-semibold px-2 py-1 bg-brand-lime/20 text-brand-teal rounded-full border border-brand-lime/50">
                            {selectedAppointment.status}
                        </span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(selectedAppointment.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-brand-mint/10 text-brand-teal px-3 py-1.5 rounded-lg text-sm font-medium border border-brand-teal/20">
                    <Stethoscope className="w-4 h-4" />
                    Provider: {selectedAppointment.doctorId}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-colors">
                <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 p-8 overflow-auto">
                    <div className="max-w-4xl mx-auto w-full space-y-6">
                        {/* Layman summary */}
                        {selectedAppointment.patientSummary && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-brand-mint shadow-sm shadow-brand-mint/20 mb-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                                    <div className="p-2 bg-brand-mint/20 rounded-lg text-brand-teal">
                                        <Stethoscope className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-lg font-bold text-brand-plum dark:text-brand-lime">Provider's Summary for You</h2>
                                </div>
                                <article className="prose prose-slate dark:prose-invert max-w-none text-brand-slate prose-headings:text-brand-plum prose-headings:font-bold prose-strong:text-brand-teal">
                                    <ReactMarkdown>{selectedAppointment.patientSummary}</ReactMarkdown>
                                </article>
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-4 mt-8">
                            <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Full Clinical Record</h3>
                            <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                        </div>

                        <div className="rounded-xl overflow-hidden min-h-[400px]">
                            <ReportViewer
                                appointmentId={selectedAppointment.id}
                                appointmentReport={selectedAppointment.report}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <AiAssistantPanel appointmentTopic={selectedAppointment.topic} />
        </div>
    );
}
