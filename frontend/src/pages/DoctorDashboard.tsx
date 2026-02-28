import { useState, useEffect } from 'react';
import { FileText, ClipboardList, UploadCloud } from 'lucide-react';
import { useAppointmentContext } from '@/layouts/DashboardLayout';
import ReportViewer from '@/components/shared/ReportViewer';
import PatientContextBar from '@/components/doctor/PatientContextBar';
import VoiceRecorder from '@/components/doctor/VoiceRecorder';
import ClinicalNotesEditor from '@/components/doctor/ClinicalNotesEditor';
import FileUploader from '@/components/doctor/FileUploader';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { fetchPatients, fetchPatientContext } from '@/services/patient.service';
import { generateConsultation, transcribeAudio } from '@/services/consultation.service';
import { generateAndStorePdf } from '@/lib/pdf-generator';
import { setGeneratedMd, bumpMdStoreVersion } from '@/stores/md.store';
import { updateAppointmentReport } from '@/stores/appointment.store';
import { formatDate } from '@/lib/utils';
import type { Patient, TabId, SaveFormat, PatientContext } from '@/types';

export default function DoctorDashboard() {
    const {
        selectedAppointment,
        setSelectedAppointment,
        selectedPatientId,
        setSelectedPatientId,
        selectedCase,
    } = useAppointmentContext();

    const [activeTab, setActiveTab] = useState<TabId>('report');
    const [editableNotes, setEditableNotes] = useState(selectedAppointment?.report || '');
    const [saveFormat, setSaveFormat] = useState<SaveFormat>('pdf');
    const [pdfVersion, setPdfVersion] = useState(0);
    const [mdVersion, setMdVersion] = useState(0);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [patientsList, setPatientsList] = useState<Patient[]>([]);
    const [patientContext, setPatientContext] = useState<PatientContext | null>(null);

    useEffect(() => {
        fetchPatients().then(setPatientsList).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedPatientId) {
            fetchPatientContext(selectedPatientId).then(setPatientContext).catch(console.error);
        }
    }, [selectedPatientId]);

    useEffect(() => {
        setEditableNotes(selectedAppointment?.report || '');
    }, [selectedAppointment?.id]);

    const recorder = useAudioRecorder(selectedAppointment?.id ?? '');

    useEffect(() => {
        recorder.refreshRecordings();
    }, [selectedAppointment?.id, recorder.refreshRecordings]);

    const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
        { id: 'report', label: 'Report', icon: FileText },
        { id: 'notes', label: 'Clinical Notes & Audio', icon: ClipboardList },
        { id: 'upload', label: 'Upload Files', icon: UploadCloud },
    ];

    const handleStopAndTranscribe = async () => {
        try {
            setIsTranscribing(true);
            const audioBlob = await recorder.stopRecording();
            recorder.clearRecordings();
            const { transcript } = await transcribeAudio(audioBlob);
            setEditableNotes((prev: string) => prev + (prev ? '\n\n' : '') + transcript);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            alert(`Transcription failed: ${message}`);
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedAppointment) return;

        if (patientContext) {
            alert('Consultation processing started in background...');
            try {
                const result = await generateConsultation({
                    patientContext,
                    transcript: editableNotes,
                    doctorId: 'D-4099',
                    doctorName: 'Dr. Smith',
                    doctorSeal: 'S-14399',
                });

                const { administrative_metadata: meta, clinical_report: clinical, patient_summary: summary } = result;
                const formatRef = (refId?: string) =>
                    refId ? ` (Ref: [${refId}](https://external-system-portal.example/))` : '';

                const formattedReport = [
                    '**CLINICAL CONSULTATION REPORT**',
                    `Date: ${new Date(meta.encounter_date).toLocaleString()}`,
                    `Doctor: ${meta.doctor_name} (${meta.doctor_seal})`,
                    `Patient: ${meta.patient_name}`,
                    '--------------------------------------------------',
                    '**CHIEF COMPLAINTS**',
                    ...clinical.chief_complaints.map((c) => `- ${c.finding} [${c.condition_status}]${formatRef(c.system_reference_id)}`),
                    '**ASSESSMENTS**',
                    ...clinical.assessments.map((a) => `- ${a.finding} [${a.condition_status}]${formatRef(a.system_reference_id)}`),
                    '**MEDICATIONS / ACTIONS**',
                    ...clinical.medications.map((m) => `- ${m.action_type}: ${m.description} (${m.timeframe || 'ASAP'})${formatRef(m.system_reference_id)}`),
                    '--------------------------------------------------',
                    '**PATIENT SUMMARY (LAYMAN)**',
                    summary.layman_explanation,
                ].join('\n');

                const laymanReport = [
                    '**YOUR VISIT SUMMARY**',
                    summary.layman_explanation,
                    '',
                    '**YOUR TO-DOS & ACTION ITEMS**',
                    ...summary.actionables.map((a) => `- ${a.description} (${a.timeframe || 'ASAP'})`),
                ].join('\n');

                updateAppointmentReport(selectedAppointment.id, formattedReport, laymanReport);
                setSelectedAppointment({ ...selectedAppointment, report: formattedReport, patientSummary: laymanReport });
            } catch (err) {
                console.error('Consultation generation failed:', err);
            }
        }

        if (saveFormat === 'pdf') {
            generateAndStorePdf({
                appointmentId: selectedAppointment.id,
                topic: selectedAppointment.topic,
                doctorId: selectedAppointment.doctorId,
                date: selectedAppointment.date,
                patientId: selectedPatientId,
                reportNotes: editableNotes,
            });
            setPdfVersion((v) => v + 1);
            alert("PDF generated and saved to this appointment's Report tab!");
        } else {
            const md = [
                `# ${selectedAppointment.topic}`,
                `**Provider:** ${selectedAppointment.doctorId}  `,
                `**Date:** ${formatDate(selectedAppointment.date)}  `,
                `**Patient:** ${selectedPatientId}`,
                '---',
                '## Clinical Notes',
                editableNotes,
                '---',
                `*Generated by MediCore — ${new Date().toLocaleString()}*`,
            ].join('\n\n');
            setGeneratedMd(selectedAppointment.id, md);
            bumpMdStoreVersion();
            setMdVersion((v) => v + 1);
            alert("Markdown report generated and saved to this appointment's Report tab!");
        }
    };

    const handleSaveDraft = () => {
        if (!selectedAppointment) return;
        updateAppointmentReport(selectedAppointment.id, editableNotes);
        setSelectedAppointment({ ...selectedAppointment, report: editableNotes });
        alert('Notes saved as draft.');
    };

    if (!selectedAppointment) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Select Medical Record</p>
                <p className="text-sm mt-1 text-center max-w-sm">
                    Choose an appointment from the left panel to view the detailed clinical report.
                </p>
            </div>
        );
    }

    const selectedPatient = patientsList.find((p) => p.id === selectedPatientId);

    return (
        <div className="flex flex-col h-full gap-4">
            <PatientContextBar
                selectedPatientId={selectedPatientId}
                selectedPatient={selectedPatient}
                selectedCase={selectedCase}
                selectedAppointmentTopic={selectedAppointment.topic}
                patientsList={patientsList}
                onPatientChange={setSelectedPatientId}
            />

            {/* Tab bar */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 p-1 shrink-0 transition-colors">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-brand-teal/10 text-brand-teal shadow-sm'
                                    : 'text-brand-slate dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-brand-plum dark:hover:text-white'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-colors">
                {activeTab === 'report' && (
                    <ReportViewer
                        appointmentId={selectedAppointment.id}
                        appointmentReport={selectedAppointment.report}
                        pdfVersion={pdfVersion}
                        mdVersion={mdVersion}
                    />
                )}

                {activeTab === 'notes' && (
                    <div className="p-8 overflow-auto h-full">
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-2 text-brand-teal font-medium text-sm">
                                    <FileText className="w-4 h-4" />
                                    Medical Report
                                </div>
                                <h1 className="text-3xl font-bold text-brand-plum dark:text-brand-lime tracking-tight leading-tight">
                                    {selectedAppointment.topic}
                                </h1>
                                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
                                    <span className="font-medium">Provider: {selectedAppointment.doctorId}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                    <span className="font-medium">{formatDate(selectedAppointment.date)}</span>
                                </div>
                            </div>

                            <VoiceRecorder
                                isRecording={recorder.isRecording}
                                isPaused={recorder.isPaused}
                                isTranscribing={isTranscribing}
                                duration={recorder.duration}
                                recordings={recorder.recordings}
                                error={recorder.error}
                                onStart={recorder.startRecording}
                                onStop={handleStopAndTranscribe}
                                onPause={recorder.pauseRecording}
                                onResume={recorder.resumeRecording}
                            />

                            <ClinicalNotesEditor
                                topic={selectedAppointment.topic}
                                doctorId={selectedAppointment.doctorId}
                                date={selectedAppointment.date}
                                notes={editableNotes}
                                saveFormat={saveFormat}
                                onNotesChange={setEditableNotes}
                                onSaveFormatChange={setSaveFormat}
                                onGenerate={handleGenerate}
                                onSaveDraft={handleSaveDraft}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className="p-8 overflow-auto h-full">
                        <div className="max-w-3xl mx-auto">
                            <FileUploader />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
