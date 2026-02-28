import { Calendar, Stethoscope, Clock, CheckCircle } from 'lucide-react';
import { useAppointmentContext } from '@/layouts/DashboardLayout';
import ReportViewer from '@/components/shared/ReportViewer';
import AiAssistantPanel from '@/components/patient/AiAssistantPanel';
import EesztMarkdown from '@/components/shared/EesztMarkdown';
import { formatDate } from '@/lib/utils';

export default function PatientDashboard() {
    const { selectedAppointment, selectedCase } = useAppointmentContext();

    if (!selectedAppointment) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                <Calendar className="w-12 h-12 mb-4 opacity-20" strokeWidth={1} />
                <p className="text-sm font-semibold text-zinc-500">No appointment selected</p>
                <p className="text-xs text-zinc-400 mt-1">Select an appointment from the sidebar</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">

            {/* ── Header bar ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between bg-white border border-zinc-200 px-5 py-3.5 rounded-lg shrink-0">
                <div>
                    {selectedCase && (
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                {selectedCase.title}
                            </span>
                        </div>
                    )}
                    <h1 className="text-base font-bold text-zinc-900 flex items-center gap-3">
                        {selectedAppointment.topic}
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${selectedAppointment.status === 'Completed'
                                ? 'bg-zinc-100 text-zinc-500 border-zinc-200'
                                : selectedAppointment.status === 'Review Required'
                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                    : 'bg-white text-zinc-600 border-zinc-300'
                            }`}>
                            {selectedAppointment.status}
                        </span>
                    </h1>
                    <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(selectedAppointment.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-md">
                    <Stethoscope className="w-3.5 h-3.5" />
                    {selectedAppointment.doctorId}
                </div>
            </div>

            {/* ── Content ──────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-auto">
                <div className="max-w-3xl mx-auto w-full space-y-5 py-2">

                    {/* Provider summary */}
                    {selectedAppointment.patientSummary && (
                        <div className="bg-white border border-zinc-200 rounded-lg p-6">
                            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-zinc-100">
                                <div className="w-8 h-8 rounded-md bg-zinc-100 flex items-center justify-center shrink-0">
                                    <Stethoscope className="w-4 h-4 text-zinc-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Provider Note</p>
                                    <h2 className="text-sm font-semibold text-zinc-900">Summary for You</h2>
                                </div>
                            </div>
                            <article className="prose prose-sm prose-zinc max-w-none
                                               prose-headings:font-bold prose-headings:text-zinc-900
                                               prose-strong:text-zinc-800 prose-p:text-zinc-700
                                               prose-p:leading-relaxed">
                                <EesztMarkdown content={selectedAppointment.patientSummary} />
                            </article>
                        </div>
                    )}

                    {/* Actionables */}
                    {selectedAppointment.actionables && selectedAppointment.actionables.length > 0 && (
                        <div className="bg-white border border-zinc-200 rounded-lg p-6">
                            <div className="flex items-center gap-2.5 mb-5">
                                <div className="w-8 h-8 rounded-md bg-zinc-100 flex items-center justify-center shrink-0">
                                    <CheckCircle className="w-4 h-4 text-zinc-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Action Items</p>
                                    <h2 className="text-sm font-semibold text-zinc-900">Next Steps</h2>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {selectedAppointment.actionables.map((action, idx) => (
                                    <div
                                        key={idx}
                                        className="flex flex-col justify-between border border-zinc-100 rounded-lg p-4 bg-zinc-50"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-900 text-white px-2 py-0.5 rounded">
                                                    {action.action_type || 'Task'}
                                                </span>
                                                {action.timeframe && (
                                                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {action.timeframe}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-zinc-700 leading-relaxed mb-3">{action.description}</p>
                                        </div>
                                        <button
                                            onClick={() => alert(`Creating reminder: ${action.description}`)}
                                            className="mt-auto flex items-center justify-center gap-2 w-full py-2
                                                       bg-white hover:bg-zinc-100 text-zinc-600 text-xs font-medium
                                                       rounded-md border border-zinc-200 transition-colors"
                                        >
                                            <Calendar className="w-3 h-3" />
                                            Add to Calendar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-zinc-100" />
                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Full Clinical Record</span>
                        <div className="h-px flex-1 bg-zinc-100" />
                    </div>

                    {/* Report viewer */}
                    <div className="rounded-lg overflow-hidden border border-zinc-200 min-h-[400px]">
                        <ReportViewer
                            appointmentId={selectedAppointment.id}
                            appointmentReport={selectedAppointment.report}
                        />
                    </div>
                </div>
            </div>

            <AiAssistantPanel appointmentTopic={selectedAppointment.topic} />
        </div>
    );
}
