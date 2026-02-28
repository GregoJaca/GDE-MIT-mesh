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
import { transcribeAudio, generateDraft, finalizeReport } from '@/services/consultation.service';
import { updateAppointmentReport } from '@/stores/appointment.store';
import { formatDate } from '@/lib/utils';
import type { Patient, TabId, SaveFormat, PatientContext, ClinicalDraftJson } from '@/types';
import DraftReviewForm from '@/components/doctor/DraftReviewForm';
import { Globe } from 'lucide-react';

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
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [patientsList, setPatientsList] = useState<Patient[]>([]);
    const [patientContext, setPatientContext] = useState<PatientContext | null>(null);

    // Human-in-The-Loop States
    const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hu' | 'es'>('en');
    const [isDraftMode, setIsDraftMode] = useState(false);
    const [draftData, setDraftData] = useState<ClinicalDraftJson | null>(null);
    const [patientSummary, setPatientSummary] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

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
        if (recorder.recordings.length === 0) {
            alert('Please record an audio consultation first.');
            return;
        }

        if (patientContext) {
            setIsGenerating(true);
            try {
                const audioBlob = recorder.recordings[recorder.recordings.length - 1].blob;
                const result = await generateDraft({
                    patientContext,
                    doctorId: 'D-99',
                    date: new Date().toISOString(),
                    audio: audioBlob,
                    language: selectedLanguage,
                });

                setDraftData(result.clinical_draft_json);
                setPatientSummary(result.patient_summary_md);
                setIsDraftMode(true);
            } catch (err) {
                console.error('Draft generation failed:', err);
                alert('An error occurred during draft generation.');
            } finally {
                setIsGenerating(false);
            }
        }
    };

    const handleFinalize = async () => {
        if (!selectedAppointment || !draftData) return;

        setIsFinalizing(true);
        try {
            const result = await finalizeReport({
                patient_id: selectedPatientId,
                doctor_id: 'D-99',
                encounter_date: new Date().toISOString(),
                format_id: 'fmt_001',
                edited_clinical_json: draftData,
            });

            const { administrative_metadata: meta, patient_summary_md, medical_report_pdf_url } = result;

            updateAppointmentReport(selectedAppointment.id, medical_report_pdf_url, patient_summary_md, draftData.actionables);
            setSelectedAppointment({
                ...selectedAppointment,
                report: medical_report_pdf_url,
                patientSummary: patient_summary_md,
                actionables: draftData.actionables
            });

            setPdfVersion((v) => v + 1);
            setIsDraftMode(false);
            setDraftData(null);
            setActiveTab('report');
        } catch (err) {
            console.error('Finalization failed:', err);
            alert('An error occurred during finalization.');
        } finally {
            setIsFinalizing(false);
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
                        mdVersion={0}
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

                            {isDraftMode && draftData ? (
                                <DraftReviewForm
                                    draftData={draftData}
                                    patientSummaryMd={patientSummary}
                                    onUpdateDraft={setDraftData}
                                    onApprove={handleFinalize}
                                    isSubmitting={isFinalizing}
                                />
                            ) : (
                                <>
                                    {/* Multilingual UI Selection */}
                                    <div className="flex items-center justify-center gap-4 py-4 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                                            <Globe className="w-4 h-4" /> Patient Summary Language:
                                        </div>
                                        <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                                            {[{ id: 'en', label: 'English' }, { id: 'hu', label: 'Hungarian' }, { id: 'es', label: 'Spanish' }].map(lang => (
                                                <button
                                                    key={lang.id}
                                                    onClick={() => setSelectedLanguage(lang.id as any)}
                                                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${selectedLanguage === lang.id ? 'bg-brand-teal text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                >
                                                    {lang.label}
                                                </button>
                                            ))}
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

                                    <div className="flex items-center justify-center mb-8">
                                        <button
                                            onClick={handleGenerate}
                                            disabled={isGenerating || recorder.recordings.length === 0}
                                            className="py-3 px-8 bg-brand-lime hover:bg-brand-lime/90 text-brand-plum font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isGenerating ? 'Analyzing with Mesh LLM...' : 'Generate Clinical Draft'}
                                        </button>
                                    </div>

                                    <ClinicalNotesEditor
                                        topic={selectedAppointment.topic}
                                        doctorId={selectedAppointment.doctorId}
                                        date={selectedAppointment.date}
                                        notes={editableNotes}
                                        saveFormat={saveFormat}
                                        onNotesChange={setEditableNotes}
                                        onSaveFormatChange={setSaveFormat}
                                        onGenerate={() => { }} // Legacy generation overridden
                                        onSaveDraft={handleSaveDraft}
                                    />
                                </>
                            )}
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
