import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Mic, Square, Pause, Play, Globe, CheckCircle2, FileEdit, Info, Mic2 } from 'lucide-react';
import { useAppointmentContext } from '@/layouts/DashboardLayout';
import { generateDraft, finalizeReport } from '@/services/consultation.service';
import { fetchPatients, fetchPatientContext } from '@/services/patient.service';
import { updateAppointmentReport } from '@/stores/appointment.store';
import { setGeneratedPdf } from '@/stores/pdf.store';
import { APP_CONFIG } from '@/config/app.config';
import type { Patient, PatientContext, ClinicalDraftJson, DraftResponse } from '@/types';
import EesztMarkdown from '@/components/shared/EesztMarkdown';

// ─── Constants ────────────────────────────────────────────────────────────────
const DOCTOR_ID = 'D-99';

// ─── Types ────────────────────────────────────────────────────────────────────
type FlowState = 'idle' | 'recording' | 'drafting' | 'reviewing' | 'finalizing' | 'done';

// Browser SpeechRecognition type shim (not in all TS dom libs)
interface ISpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onresult: ((event: any) => void) | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onerror: ((event: any) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
}
declare global {
    interface Window {
        SpeechRecognition: { new(): ISpeechRecognition };
        webkitSpeechRecognition: { new(): ISpeechRecognition };
    }
}

// ─── AuditTooltip ─────────────────────────────────────────────────────────────
function AuditTooltip({ quote }: { quote?: string }) {
    if (!quote) return null;
    return (
        <div className="group relative inline-flex items-center ml-1.5 cursor-help text-slate-400 hover:text-brand-teal">
            <Info className="w-3.5 h-3.5" />
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 bg-slate-800 text-white text-xs rounded-lg p-2.5 shadow-xl z-50">
                <p className="font-semibold text-brand-lime mb-1">Source quote</p>
                <p className="italic">"{quote}"</p>
            </div>
        </div>
    );
}

// ─── Real-time voice recorder hook ─────────────────────────────────────────────
function useVoiceRecorder() {
    const mediaRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [recState, setRecState] = useState<'idle' | 'recording' | 'paused'>('idle');
    const [duration, setDuration] = useState(0);
    const [blob, setBlob] = useState<Blob | null>(null);
    // Live transcript from Web SpeechRecognition (for visual feedback)
    const [liveTranscript, setLiveTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');

    const finalTranscriptRef = useRef('');

    const startSpeechRecognition = useCallback((lang: string) => {
        const SpeechAPI: { new(): ISpeechRecognition } | undefined =
            (window as Window).SpeechRecognition ?? (window as Window).webkitSpeechRecognition;
        if (!SpeechAPI) return;

        const recognition = new SpeechAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang === 'hu' ? 'hu-HU' : lang === 'es' ? 'es-ES' : 'en-US';
        recognition.maxAlternatives = 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            let interim = '';
            let final = finalTranscriptRef.current;
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += t + ' ';
                } else {
                    interim = t;
                }
            }
            finalTranscriptRef.current = final;
            setLiveTranscript(final);
            setInterimTranscript(interim);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (e: any) => {
            if (e.error !== 'aborted' && e.error !== 'no-speech') {
                console.warn('SpeechRecognition error:', e.error);
            }
        };

        recognition.onend = () => {
            // Auto-restart if still recording
            if (mediaRef.current?.state === 'recording') {
                try { recognition.start(); } catch { /* already running */ }
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
    }, []);

    const start = async (lang = 'en') => {
        // Start MediaRecorder for audio capture (sent to Azure)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus' : 'audio/webm';
        const mr = new MediaRecorder(stream, { mimeType: mime });
        chunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.start(1000);
        mediaRef.current = mr;

        // Reset transcript state
        finalTranscriptRef.current = '';
        setLiveTranscript('');
        setInterimTranscript('');
        setBlob(null);
        setDuration(0);
        setRecState('recording');
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

        // Start live transcript display
        startSpeechRecognition(lang);
    };

    const stop = (): Promise<Blob> => new Promise((resolve) => {
        const mr = mediaRef.current;
        if (!mr) return;

        // Stop SpeechRecognition
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        recognitionRef.current = null;
        setInterimTranscript('');

        mr.onstop = () => {
            const b = new Blob(chunksRef.current, { type: mr.mimeType });
            setBlob(b);
            setRecState('idle');
            mr.stream.getTracks().forEach(t => t.stop());
            resolve(b);
        };
        mr.stop();
        if (timerRef.current) clearInterval(timerRef.current);
    });

    const pause = () => {
        mediaRef.current?.pause();
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        setRecState('paused');
        setInterimTranscript('');
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const resume = (lang = 'en') => {
        mediaRef.current?.resume();
        setRecState('recording');
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        startSpeechRecognition(lang);
    };

    const fmt = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return { recState, duration, blob, liveTranscript, interimTranscript, start, stop, pause, resume, fmt };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DoctorDashboard() {
    const { selectedAppointment, setSelectedAppointment, selectedPatientId } = useAppointmentContext();

    const [patientsList, setPatientsList] = useState<Patient[]>([]);
    const [patientContext, setPatientContext] = useState<PatientContext | null>(null);
    const [language, setLanguage] = useState<'en' | 'hu' | 'es'>('en');

    const [flowState, setFlowState] = useState<FlowState>('idle');
    const [draft, setDraft] = useState<DraftResponse | null>(null);
    const [editedJson, setEditedJson] = useState<ClinicalDraftJson | null>(null);
    const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recorder = useVoiceRecorder();
    const transcriptEndRef = useRef<HTMLDivElement | null>(null);

    // Auto-scroll live transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [recorder.liveTranscript, recorder.interimTranscript]);

    // Reset flow when appointment changes
    useEffect(() => {
        setFlowState('idle');
        setDraft(null);
        setEditedJson(null);
        setFinalPdfUrl(null);
        setError(null);
    }, [selectedAppointment?.id]);

    useEffect(() => { fetchPatients().then(setPatientsList).catch(console.error); }, []);
    useEffect(() => {
        if (selectedPatientId) {
            fetchPatientContext(selectedPatientId).then(setPatientContext).catch(console.error);
        }
    }, [selectedPatientId]);

    // ── Step 1: Stop → /api/v1/generate-draft ────────────────────────────────
    const handleStopAndGenerate = async () => {
        if (recorder.recState === 'idle') return;
        setError(null);
        const audioBlob = await recorder.stop();
        if (!patientContext) {
            setError('Patient context not loaded. Please wait and try again.');
            return;
        }
        setFlowState('drafting');
        try {
            const result = await generateDraft({
                patientContext,
                doctorId: DOCTOR_ID,
                date: new Date().toISOString(),
                audio: audioBlob,
                language,
            });
            setDraft(result);
            setEditedJson(result.clinical_draft_json);
            setFlowState('reviewing');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Draft generation failed.');
            setFlowState('idle');
        }
    };

    // ── Step 2: Approve → /api/v1/finalize-report → PDF ─────────────────────
    const handleApprove = async () => {
        if (!draft || !editedJson || !selectedAppointment) return;
        setFlowState('finalizing');
        setError(null);
        try {
            const result = await finalizeReport({
                patient_id: selectedPatientId,
                doctor_id: DOCTOR_ID,
                encounter_date: draft.administrative_metadata.encounter_date,
                format_id: 'fmt_001',
                edited_clinical_json: editedJson,
                patient_summary_md: draft.patient_summary_md,
            });

            const pdfUrl = `${APP_CONFIG.API.ROOT_URL}${result.medical_report_pdf_url}`;
            setFinalPdfUrl(pdfUrl);
            setGeneratedPdf(selectedAppointment.id, pdfUrl);
            updateAppointmentReport(
                selectedAppointment.id,
                result.medical_report_pdf_url,
                result.patient_summary_md,
                editedJson.actionables
            );
            setSelectedAppointment({
                ...selectedAppointment,
                report: result.medical_report_pdf_url,
                patientSummary: result.patient_summary_md,
            });
            setFlowState('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Finalization failed.');
            setFlowState('reviewing');
        }
    };

    const resetFlow = () => {
        setFlowState('idle');
        setDraft(null);
        setEditedJson(null);
        setFinalPdfUrl(null);
        setError(null);
    };

    if (!selectedAppointment) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Select an appointment</p>
                <p className="text-sm mt-1 text-center max-w-xs text-slate-500">
                    Choose a patient from the dropdown, then select a case and appointment.
                </p>
            </div>
        );
    }

    const selectedPatient = patientsList.find(p => p.id === selectedPatientId);
    const isRecording = recorder.recState === 'recording';
    const isPaused = recorder.recState === 'paused';
    const isActive = isRecording || isPaused;
    const hasSpeechAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    const isSeededFinalized = !!(
        selectedAppointment.report &&
        selectedAppointment.report.length > 0 &&
        !selectedAppointment.report.startsWith('/outputs/')
    );

    return (
        <div className="flex flex-col h-full gap-4">
            {/* ── Page header ── */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Active Consultation</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-semibold text-brand-plum dark:text-brand-lime">{selectedPatient?.name ?? selectedPatientId}</span>
                        <span className="mx-1.5 text-slate-300">•</span>
                        {selectedAppointment.topic}
                        {patientContext && (
                            <span className="ml-2 text-[11px] font-semibold text-brand-teal bg-brand-teal/10 px-1.5 py-0.5 rounded">
                                {patientContext.context_documents.length} EHR doc{patientContext.context_documents.length !== 1 ? 's' : ''} loaded
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {flowState === 'done' && (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-brand-teal text-white shadow-sm">
                            ✓ EMR Generated
                        </span>
                    )}
                    {flowState === 'reviewing' && (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            Review Required
                        </span>
                    )}
                </div>
            </div>

            {/* ── Error banner ── */}
            {error && (
                <div className="mx-1 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 font-medium">
                    ⚠ {error}
                </div>
            )}

            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
                {/* ── LEFT: Input + Live Transcript ── */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
                        <h2 className="font-bold text-slate-800 dark:text-white">Voice Recording</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {flowState === 'idle'
                                ? 'Record → Stop → AI generates clinical draft'
                                : flowState === 'drafting'
                                    ? 'Azure Speech → Presidio Scrub → OpenAI Extraction…'
                                    : flowState === 'reviewing'
                                        ? 'Review AI output → Approve to generate PDF'
                                        : flowState === 'finalizing'
                                            ? 'WeasyPrint generating SOAP PDF…'
                                            : '✓ Report finalized and saved'}
                        </p>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
                        {/* Recorder control widget */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${isRecording ? 'bg-red-100 dark:bg-red-900/30 text-red-500 animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-brand-teal'}`}>
                                        <Mic className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Voice Recorder</p>
                                            {isRecording && (
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                                </span>
                                            )}
                                            {isPaused && (
                                                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wider">PAUSED</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono">
                                            {isActive ? recorder.fmt(recorder.duration) : recorder.blob ? `Ready — ${recorder.fmt(recorder.duration)}` : '00:00'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isActive && flowState === 'idle' && (
                                        <button
                                            onClick={() => { void recorder.start(language); setFlowState('recording'); }}
                                            className="px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                                        >
                                            <Mic className="w-3 h-3" /> Start
                                        </button>
                                    )}
                                    {isActive && (
                                        <>
                                            {isPaused ? (
                                                <button onClick={() => { recorder.resume(language); setFlowState('recording'); }}
                                                    className="px-3 py-1.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-200 transition-colors flex items-center gap-1.5">
                                                    <Play className="w-3 h-3" /> Resume
                                                </button>
                                            ) : (
                                                <button onClick={() => { recorder.pause(); setFlowState('recording'); }}
                                                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1.5">
                                                    <Pause className="w-3 h-3" /> Pause
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Language selector */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <Globe className="w-3.5 h-3.5" />
                                    <span>Patient summary language</span>
                                </div>
                                <div className="flex bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 gap-0.5">
                                    {(['en', 'hu', 'es'] as const).map(l => (
                                        <button
                                            key={l}
                                            onClick={() => setLanguage(l)}
                                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${language === l ? 'bg-brand-teal text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        >
                                            {l.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── LIVE TRANSCRIPT PANEL ── */}
                        <div className="flex-1 flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-h-0">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Mic2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Live Transcript
                                    </span>
                                    {isRecording && (
                                        <span className="text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                            LIVE
                                        </span>
                                    )}
                                </div>
                                {!hasSpeechAPI && (
                                    <span className="text-[10px] text-amber-500">Web Speech API not available in this browser</span>
                                )}
                            </div>
                            <div className="flex-1 overflow-auto p-4 bg-white dark:bg-slate-900/50">
                                {(!recorder.liveTranscript && !recorder.interimTranscript) ? (
                                    <div className="h-full flex items-center justify-center">
                                        {isActive ? (
                                            <div className="text-center">
                                                <div className="flex gap-1 justify-center mb-3">
                                                    {[0.4, 0.7, 1, 0.7, 0.4].map((h, i) => (
                                                        <div key={i}
                                                            className="w-1 bg-brand-teal rounded-full animate-pulse"
                                                            style={{ height: `${h * 32}px`, animationDelay: `${i * 0.1}s` }}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-xs text-slate-400">Listening… speak clearly</p>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <Mic className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                                                <p className="text-xs text-slate-400">
                                                    {hasSpeechAPI
                                                        ? 'Start recording — transcript will appear here in real time'
                                                        : 'Start recording — audio will be sent to Azure Speech for transcription'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {/* Finalized transcript segments */}
                                        {recorder.liveTranscript && (
                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                                {recorder.liveTranscript}
                                            </p>
                                        )}
                                        {/* Interim (in-progress) text */}
                                        {recorder.interimTranscript && (
                                            <p className="text-sm text-slate-400 dark:text-slate-500 italic leading-relaxed">
                                                {recorder.interimTranscript}
                                            </p>
                                        )}
                                        <div ref={transcriptEndRef} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* EHR context badge */}
                        {patientContext && patientContext.context_documents.length > 0 && (
                            <div className="rounded-xl border border-brand-teal/20 bg-brand-teal/5 dark:bg-brand-teal/10 p-3 shrink-0">
                                <p className="text-xs font-bold text-brand-teal uppercase tracking-wider mb-1.5">
                                    EHR Context Loaded ({patientContext.context_documents.length} docs)
                                </p>
                                <div className="space-y-0.5">
                                    {patientContext.context_documents.slice(0, 4).map((doc) => (
                                        <div key={doc.system_doc_id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-teal" />
                                            <span className="font-mono text-[10px] text-slate-400">{doc.system_doc_id}</span>
                                            <span className="text-slate-500 truncate">{doc.document_type}</span>
                                        </div>
                                    ))}
                                    {patientContext.context_documents.length > 4 && (
                                        <p className="text-[10px] text-slate-400 pl-3.5">+{patientContext.context_documents.length - 4} more</p>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5">IDs sent as opaque pointers — no PHI to LLM</p>
                            </div>
                        )}
                    </div>

                    {/* Action footer */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                        {(flowState === 'idle' || flowState === 'recording') && (
                            <button
                                onClick={handleStopAndGenerate}
                                disabled={!isActive}
                                className="w-full py-3.5 bg-brand-teal hover:bg-brand-teal/90 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-sm tracking-wide"
                            >
                                <Square className="w-4 h-4" />
                                Stop &amp; Generate Clinical Draft
                            </button>
                        )}
                        {flowState === 'drafting' && (
                            <div className="w-full py-3.5 bg-brand-teal/10 text-brand-teal font-bold rounded-xl flex items-center justify-center gap-3 text-sm">
                                <div className="w-4 h-4 border-2 border-brand-teal/40 border-t-brand-teal rounded-full animate-spin" />
                                Azure → Presidio Scrub → OpenAI…
                            </div>
                        )}
                        {(flowState === 'reviewing' || flowState === 'done') && (
                            <button
                                onClick={resetFlow}
                                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl transition-all text-sm"
                            >
                                ← New Recording
                            </button>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: AI Output ── */}
                <div className="flex-[1.4] flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-brand-teal/5 dark:bg-brand-teal/10 flex items-center gap-2 shrink-0">
                        <FileText className="w-4 h-4 text-brand-teal" />
                        <h2 className="font-bold text-slate-800 dark:text-white">AI Clinical Output</h2>
                        {flowState === 'reviewing' && (
                            <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Awaiting Approval
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto">
                        {/* Empty / idle */}
                        {(flowState === 'idle' || flowState === 'recording') && !isSeededFinalized && !finalPdfUrl && (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-4">
                                    <FileText className="w-7 h-7 text-slate-200 dark:text-slate-600" />
                                </div>
                                <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                                    {isActive ? 'Recording in progress…' : 'Waiting for recording'}
                                </p>
                                <p className="text-sm text-slate-400 mt-1 max-w-xs">
                                    {isActive ? 'Stop to trigger AI processing pipeline.' : 'Record the consultation then stop to run the full AI pipeline.'}
                                </p>
                                {!isActive && (
                                    <div className="mt-6 flex flex-col items-center gap-2 text-xs text-slate-400 max-w-xs">
                                        {['Record consultation audio', 'Stop → Azure transcribes + Presidio scrubs PII', 'OpenAI extracts zero-hallucination SOAP draft', 'Review → Approve → WeasyPrint PDF'].map((step, i) => (
                                            <div key={i} className="flex flex-col items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
                                                    <span>{step}</span>
                                                </div>
                                                {i < 3 && <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mt-1" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Seeded finalized appointment */}
                        {(flowState === 'idle' || flowState === 'recording') && isSeededFinalized && !finalPdfUrl && (
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <FileEdit className="w-3.5 h-3.5" /> Existing Clinical Record
                                </div>
                                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{selectedAppointment.report}</p>
                                </div>
                                {selectedAppointment.patientSummary && (
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Layman Summary</p>
                                        <div className="bg-brand-teal/5 dark:bg-brand-teal/10 rounded-xl p-4 border border-brand-teal/20">
                                            <article className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                                                <EesztMarkdown content={selectedAppointment.patientSummary} />
                                            </article>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Draft review */}
                        {flowState === 'reviewing' && editedJson && draft && (
                            <DraftReview
                                draft={draft}
                                editedJson={editedJson}
                                onUpdate={setEditedJson}
                                onApprove={handleApprove}
                            />
                        )}

                        {/* Finalizing */}
                        {flowState === 'finalizing' && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                                <div className="w-8 h-8 border-2 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin" />
                                <p className="text-sm font-medium">WeasyPrint generating EMR PDF…</p>
                            </div>
                        )}

                        {/* Done — inline PDF */}
                        {flowState === 'done' && finalPdfUrl && (
                            <div className="h-full flex flex-col">
                                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Finalized Clinical Report (SOAP)</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={finalPdfUrl} target="_blank" rel="noopener noreferrer"
                                            className="px-3 py-1.5 text-xs font-semibold bg-brand-teal text-white rounded-lg hover:bg-brand-teal/90 transition-colors">
                                            Open PDF
                                        </a>
                                        <a href={finalPdfUrl} download
                                            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-600">
                                            Download
                                        </a>
                                    </div>
                                </div>
                                <iframe
                                    src={`${finalPdfUrl}#toolbar=0`}
                                    className="flex-1 border-0 bg-white"
                                    title="Clinical Report PDF"
                                />
                                {draft?.patient_summary_md && (
                                    <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800 bg-brand-teal/5">
                                        <p className="text-xs font-bold text-brand-teal uppercase tracking-wider mb-2">Patient Summary (separate deliverable)</p>
                                        <article className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                                            <EesztMarkdown content={draft.patient_summary_md} />
                                        </article>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Draft review sub-component ────────────────────────────────────────────────
function DraftReview({
    draft,
    editedJson,
    onUpdate,
    onApprove,
}: {
    draft: DraftResponse;
    editedJson: ClinicalDraftJson;
    onUpdate: (d: ClinicalDraftJson) => void;
    onApprove: () => void;
}) {
    const updateFinding = (cat: 'chief_complaints' | 'assessments', idx: number, val: string) => {
        const next = { ...editedJson };
        next[cat] = next[cat].map((item, i) => i === idx ? { ...item, finding: val } : item);
        onUpdate(next);
    };
    const updateAction = (idx: number, val: string) => {
        onUpdate({ ...editedJson, actionables: editedJson.actionables.map((a, i) => i === idx ? { ...a, description: val } : a) });
    };

    return (
        <div className="p-5 h-full flex flex-col gap-4 overflow-auto">
            {/* Review warning */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl shrink-0">
                <FileEdit className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Human Review Required</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                        Hover ⓘ on each finding to see the verbatim source quote. Edit anything below, then approve.
                    </p>
                </div>
            </div>

            {/* Patient summary rendered as Markdown */}
            {draft.patient_summary_md && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shrink-0">
                    <p className="text-xs font-bold text-brand-teal uppercase tracking-wider mb-2">AI Patient Summary (Layman)</p>
                    <article className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                        <EesztMarkdown content={draft.patient_summary_md} />
                    </article>
                </div>
            )}

            {/* Metadata chips */}
            <div className="flex gap-2 flex-wrap shrink-0">
                {[
                    { label: 'Patient', value: draft.administrative_metadata.patient_name },
                    { label: 'Doctor', value: draft.administrative_metadata.doctor_name },
                    { label: 'Date', value: new Date(draft.administrative_metadata.encounter_date).toLocaleDateString() },
                    { label: 'EHR Docs', value: String((draft.administrative_metadata.context_documents as unknown[])?.length ?? 0) },
                ].map(({ label, value }) => (
                    <div key={label} className="flex-1 min-w-[80px] bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5 truncate">{value}</p>
                    </div>
                ))}
            </div>

            {/* Editable findings */}
            <div className="space-y-4 flex-1">
                {[
                    { label: 'Chief Complaints', key: 'chief_complaints' as const, cls: 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' },
                    { label: 'Assessments', key: 'assessments' as const, cls: 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30' },
                ].map(({ label, key, cls }) => (
                    <div key={key}>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                        {editedJson[key].length === 0
                            ? <p className="text-xs italic text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">None detected</p>
                            : editedJson[key].map((item, idx) => (
                                <div key={idx} className={`flex items-center gap-2 p-2.5 rounded-lg border mb-2 ${cls}`}>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/60 dark:bg-white/10 text-slate-500 uppercase shrink-0">{item.condition_status}</span>
                                    <input
                                        value={item.finding}
                                        onChange={e => updateFinding(key, idx, e.target.value)}
                                        className="flex-1 bg-transparent border-none text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
                                    />
                                    <AuditTooltip quote={item.exact_quote} />
                                </div>
                            ))
                        }
                    </div>
                ))}

                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Action Plan</p>
                    {editedJson.actionables.length === 0
                        ? <p className="text-xs italic text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">None detected</p>
                        : editedJson.actionables.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg border bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30 mb-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/60 dark:bg-white/10 text-slate-500 uppercase shrink-0">{item.action_type}</span>
                                <input
                                    value={item.description}
                                    onChange={e => updateAction(idx, e.target.value)}
                                    className="flex-1 bg-transparent border-none text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
                                />
                                <AuditTooltip quote={item.exact_quote} />
                            </div>
                        ))
                    }
                </div>
            </div>

            {/* Approve CTA */}
            <button
                onClick={onApprove}
                className="w-full py-3.5 bg-brand-plum hover:bg-brand-plum/90 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm tracking-wide shrink-0"
            >
                <CheckCircle2 className="w-4 h-4" />
                Approve &amp; Generate Final PDF Report
            </button>
        </div>
    );
}
