import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Mic, Square, Pause, Play, Globe, CheckCircle2, RotateCcw, Info } from 'lucide-react';
import { useAppointmentContext } from '@/layouts/DashboardLayout';
import { generateDraft, finalizeReport } from '@/services/consultation.service';
import { fetchPatients, fetchPatientContext } from '@/services/patient.service';
import { updateAppointmentReport } from '@/stores/appointment.store';
import { setGeneratedPdf } from '@/stores/pdf.store';
import { APP_CONFIG } from '@/config/app.config';
import type { Patient, PatientContext, ClinicalDraftJson, DraftResponse } from '@/types';
import EesztMarkdown from '@/components/shared/EesztMarkdown';

const DOCTOR_ID = import.meta.env.VITE_DOCTOR_ID || 'D-99';

type FlowState = 'idle' | 'recording' | 'drafting' | 'reviewing' | 'finalizing' | 'done';

// ── SpeechRecognition shim ──────────────────────────────────────────────────
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

// ── Audit tooltip ─────────────────────────────────────────────────────────────
function QuoteTooltip({ quote }: { quote?: string }) {
    if (!quote) return null;
    return (
        <div className="group relative inline-flex items-center ml-1 cursor-help">
            <Info className="w-3 h-3 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 transition-colors" strokeWidth={1.5} />
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-60 bg-zinc-900 dark:bg-zinc-100 text-xs rounded-md p-3 shadow-xl z-50 text-zinc-100 dark:text-zinc-900">
                <p className="font-semibold mb-1 text-[10px] uppercase tracking-wider opacity-60">Source quote</p>
                <p className="italic leading-relaxed">"{quote}"</p>
            </div>
        </div>
    );
}

// ── Voice recorder hook ────────────────────────────────────────────────────────
function useVoiceRecorder() {
    const mediaRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const finalTranscriptRef = useRef('');

    const [recState, setRecState] = useState<'idle' | 'recording' | 'paused'>('idle');
    const [duration, setDuration] = useState(0);
    const [blob, setBlob] = useState<Blob | null>(null);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');

    const startSR = useCallback((lang: string) => {
        const SpeechAPI: { new(): ISpeechRecognition } | undefined =
            (window as Window).SpeechRecognition ?? (window as Window).webkitSpeechRecognition;
        if (!SpeechAPI) return;
        const r = new SpeechAPI();
        r.continuous = true;
        r.interimResults = true;
        r.lang = lang === 'hu' ? 'hu-HU' : lang === 'es' ? 'es-ES' : 'en-US';
        r.maxAlternatives = 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        r.onresult = (e: any) => {
            let interim = '';
            let final = finalTranscriptRef.current;
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                e.results[i].isFinal ? (final += t + ' ') : (interim = t);
            }
            finalTranscriptRef.current = final;
            setLiveTranscript(final);
            setInterimTranscript(interim);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        r.onerror = (e: any) => { if (e.error !== 'aborted' && e.error !== 'no-speech') console.warn('SR:', e.error); };
        r.onend = () => { if (mediaRef.current?.state === 'recording') try { r.start(); } catch { /* ignore */ } };
        r.start();
        recognitionRef.current = r;
    }, []);

    const stopSR = () => {
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        recognitionRef.current = null;
        setInterimTranscript('');
    };

    const start = async (lang = 'en') => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
        const mr = new MediaRecorder(stream, { mimeType: mime });
        chunksRef.current = [];
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.start(1000);
        mediaRef.current = mr;
        finalTranscriptRef.current = '';
        setLiveTranscript('');
        setInterimTranscript('');
        setBlob(null);
        setDuration(0);
        setRecState('recording');
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        startSR(lang);
    };

    const stop = (): Promise<Blob> => new Promise(resolve => {
        const mr = mediaRef.current;
        if (!mr) return;
        stopSR();
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
        stopSR();
        setRecState('paused');
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const resume = (lang = 'en') => {
        mediaRef.current?.resume();
        setRecState('recording');
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        startSR(lang);
    };

    const reset = () => {
        stopSR();
        const mr = mediaRef.current;
        if (mr && mr.state !== 'inactive') {
            mr.stop();
            mr.stream.getTracks().forEach(t => t.stop());
        }
        mediaRef.current = null;
        chunksRef.current = [];
        if (timerRef.current) clearInterval(timerRef.current);
        finalTranscriptRef.current = '';
        setRecState('idle');
        setDuration(0);
        setBlob(null);
        setLiveTranscript('');
        setInterimTranscript('');
    };

    const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return { recState, duration, blob, liveTranscript, interimTranscript, start, stop, pause, resume, reset, fmt };
}

// ── Main component ─────────────────────────────────────────────────────────────
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

    useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); },
        [recorder.liveTranscript, recorder.interimTranscript]);

    useEffect(() => {
        setFlowState('idle');
        setDraft(null);
        setEditedJson(null);
        setFinalPdfUrl(null);
        setError(null);
        recorder.reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAppointment?.id]);

    useEffect(() => { fetchPatients().then(setPatientsList).catch(console.error); }, []);
    useEffect(() => {
        if (selectedPatientId)
            fetchPatientContext(selectedPatientId).then(setPatientContext).catch(console.error);
    }, [selectedPatientId]);

    const handleStop = async () => {
        if (recorder.recState === 'idle') return;
        setError(null);
        const audioBlob = await recorder.stop();
        if (!patientContext) { setError('Patient context not loaded.'); return; }
        setFlowState('drafting');
        try {
            const transcript = recorder.liveTranscript;
            const result = await generateDraft({
                patientContext,
                doctorId: DOCTOR_ID,
                date: new Date().toISOString(),
                audio: audioBlob,
                language,
                transcript
            });
            setDraft(result);
            setEditedJson(result.clinical_draft_json);
            setFlowState('reviewing');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Draft generation failed.');
            setFlowState('idle');
        }
    };

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
            updateAppointmentReport(selectedAppointment.id, result.medical_report_pdf_url, result.patient_summary_md, editedJson.actionables);
            setSelectedAppointment({ ...selectedAppointment, report: result.medical_report_pdf_url, patientSummary: result.patient_summary_md });
            setFlowState('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Finalization failed.');
            setFlowState('reviewing');
        }
    };

    const resetFlow = () => {
        recorder.reset();
        setFlowState('idle');
        setDraft(null);
        setEditedJson(null);
        setFinalPdfUrl(null);
        setError(null);
    };

    if (!selectedAppointment) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                <FileText className="w-10 h-10 mb-4 opacity-20" strokeWidth={1} />
                <p className="text-sm font-medium text-zinc-500">Select an appointment</p>
                <p className="text-xs text-zinc-400 mt-1">Choose a patient and appointment from the sidebar.</p>
            </div>
        );
    }

    const selectedPatient = patientsList.find(p => p.id === selectedPatientId);
    const isActive = recorder.recState === 'recording' || recorder.recState === 'paused';
    const isRecording = recorder.recState === 'recording';
    const isPaused = recorder.recState === 'paused';
    const isSeeded = !!(selectedAppointment.report && selectedAppointment.report.length > 0 && !selectedAppointment.report.startsWith('/outputs/'));

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header */}
            <div className="flex items-baseline justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {selectedAppointment.topic}
                    </h1>
                    <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5 font-mono">
                        {selectedPatient?.name ?? selectedPatientId}
                        {patientContext && ` / ${patientContext.context_documents.length} EHR doc${patientContext.context_documents.length !== 1 ? 's' : ''}`}
                        {' / '}{new Date(selectedAppointment.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {flowState === 'done' && <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Report saved</span>}
                    {(flowState === 'reviewing' || flowState === 'done') && (
                        <button onClick={resetFlow} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors border border-zinc-200 dark:border-zinc-800">
                            <RotateCcw className="w-3 h-3" strokeWidth={1.5} /> New session
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
                {/* LEFT: Recording + transcript */}
                <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    {/* Recorder controls */}
                    <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0 space-y-4">
                        {/* Status row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative flex items-center">
                                    <Mic className={`w-4 h-4 ${isRecording ? 'text-red-500' : 'text-zinc-300 dark:text-zinc-600'}`} strokeWidth={1.5} />
                                    {isRecording && (
                                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500">
                                            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-none">
                                        {isRecording ? 'Recording' : isPaused ? 'Paused' : 'Ready'}
                                    </p>
                                    <p className="text-xs font-mono text-zinc-400 mt-0.5">{recorder.fmt(recorder.duration)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Reset button — always shown when there's something to reset */}
                                {(isActive || recorder.blob) && (
                                    <button
                                        onClick={() => { recorder.reset(); if (flowState === 'recording') setFlowState('idle'); }}
                                        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                        title="Reset recording"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                                    </button>
                                )}
                                {/* Play/pause/start */}
                                {!isActive && (flowState === 'idle') && (
                                    <button
                                        onClick={() => { void recorder.start(language); setFlowState('recording'); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-md hover:opacity-90 transition-opacity"
                                    >
                                        <Mic className="w-3 h-3" strokeWidth={1.5} /> Start
                                    </button>
                                )}
                                {isActive && (
                                    <>
                                        {isPaused ? (
                                            <button onClick={() => { recorder.resume(language); setFlowState('recording'); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-md hover:opacity-90 transition-opacity">
                                                <Play className="w-3 h-3" strokeWidth={1.5} /> Resume
                                            </button>
                                        ) : (
                                            <button onClick={() => { recorder.pause(); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-semibold rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                                <Pause className="w-3 h-3" strokeWidth={1.5} /> Pause
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Language */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Globe className="w-3 h-3 text-zinc-400" strokeWidth={1.5} />
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Summary language</span>
                            </div>
                            <div className="flex gap-1">
                                {(['en', 'hu', 'es'] as const).map(l => (
                                    <button key={l} onClick={() => setLanguage(l)}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors uppercase tracking-wider ${language === l
                                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                                            : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                            }`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Live transcript panel */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="px-5 py-2.5 border-b border-zinc-50 dark:border-zinc-800/60 flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Transcript</span>
                            {isRecording && <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Live</span>}
                        </div>
                        <div className="flex-1 overflow-auto px-5 py-4">
                            {!recorder.liveTranscript && !recorder.interimTranscript ? (
                                <div className="h-full flex items-center justify-center">
                                    {isActive ? (
                                        <div className="flex items-end gap-0.5 h-6">
                                            {[3, 6, 9, 6, 3, 5, 8, 5].map((h, i) => (
                                                <div key={i}
                                                    className="w-0.5 bg-zinc-300 dark:bg-zinc-700 rounded-full animate-pulse"
                                                    style={{ height: `${h * 2}px`, animationDelay: `${i * 80}ms` }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-zinc-300 dark:text-zinc-700">
                                            Start recording — transcript streams here in real time
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                        {recorder.liveTranscript}
                                    </p>
                                    {recorder.interimTranscript && (
                                        <p className="text-sm text-zinc-400 italic leading-relaxed">
                                            {recorder.interimTranscript}
                                        </p>
                                    )}
                                    <div ref={transcriptEndRef} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* EHR context summary */}
                    {patientContext && patientContext.context_documents.length > 0 && (
                        <div className="px-5 py-3 border-t border-zinc-50 dark:border-zinc-800 shrink-0">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">
                                EHR Context — {patientContext.context_documents.length} records loaded
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2 mb-1">
                                {patientContext.context_documents.map(d => (
                                    <span key={d.system_doc_id} className="inline-flex items-center px-2.5 py-1 border border-zinc-900 rounded-md text-[10px] font-mono text-zinc-700 bg-white shadow-sm">
                                        <span className="font-bold text-zinc-900 mr-1.5">{d.system_doc_id}</span>
                                        <span className="text-zinc-300 mr-1.5">|</span>
                                        <span className="text-zinc-500">{d.document_type}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action button */}
                    <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                        {(flowState === 'idle' || flowState === 'recording') && (
                            <button
                                onClick={handleStop}
                                disabled={!isActive}
                                className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold rounded-lg disabled:opacity-25 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <Square className="w-3.5 h-3.5" strokeWidth={1.5} />
                                Stop and generate draft
                            </button>
                        )}
                        {flowState === 'drafting' && (
                            <div className="w-full py-3 flex items-center justify-center gap-2.5 text-sm text-zinc-500">
                                <div className="w-3.5 h-3.5 border border-zinc-300 dark:border-zinc-700 border-t-zinc-700 dark:border-t-zinc-300 rounded-full animate-spin" />
                                Processing — Azure / Presidio / OpenAI
                            </div>
                        )}
                        {flowState === 'reviewing' && (
                            <button onClick={resetFlow} className="w-full py-2.5 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5">
                                <RotateCcw className="w-3 h-3" strokeWidth={1.5} /> New recording
                            </button>
                        )}
                    </div>
                </div>

                {/* RIGHT: Output */}
                <div className="flex-[1.4] flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Clinical Output</span>
                        {flowState === 'reviewing' && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Review required</span>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto">
                        {/* Idle / recording empty state */}
                        {(flowState === 'idle' || flowState === 'recording') && !isSeeded && !finalPdfUrl && (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-6">
                                <FileText className="w-8 h-8 text-zinc-200 dark:text-zinc-700" strokeWidth={1} />
                                {!isActive ? (
                                    <div className="space-y-3 text-xs text-zinc-400 max-w-xs">
                                        {['Record the consultation', 'Stop — Azure transcribes, Presidio scrubs PII', 'OpenAI extracts SOAP draft (zero hallucination)', 'Doctor reviews and approves', 'WeasyPrint generates signed PDF'].map((s, i) => (
                                            <div key={i} className="flex items-start gap-2.5 text-left">
                                                <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700 tabular-nums shrink-0 mt-0.5">{i + 1}</span>
                                                <span>{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-zinc-400">Recording in progress — stop to run the pipeline.</p>
                                )}
                            </div>
                        )}

                        {/* Seeded existing record */}
                        {(flowState === 'idle' || flowState === 'recording') && isSeeded && !finalPdfUrl && (
                            <div className="p-6 space-y-5">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-3">Clinical Record</p>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{selectedAppointment.report}</p>
                                </div>
                                {selectedAppointment.patientSummary && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-3">Patient Summary</p>
                                        <article className="text-sm leading-relaxed prose prose-sm prose-zinc dark:prose-invert max-w-none">
                                            <EesztMarkdown content={selectedAppointment.patientSummary} />
                                        </article>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Draft review */}
                        {flowState === 'reviewing' && editedJson && draft && (
                            <DraftReview draft={draft} editedJson={editedJson} onUpdate={setEditedJson} onApprove={handleApprove} />
                        )}

                        {/* Finalizing */}
                        {flowState === 'finalizing' && (
                            <div className="h-full flex items-center justify-center gap-3 text-xs text-zinc-400">
                                <div className="w-4 h-4 border border-zinc-200 dark:border-zinc-700 border-t-zinc-500 dark:border-t-zinc-400 rounded-full animate-spin" />
                                Generating PDF
                            </div>
                        )}

                        {/* Done — PDF viewer */}
                        {flowState === 'done' && finalPdfUrl && (
                            <div className="h-full flex flex-col">
                                <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
                                        <span className="text-xs font-medium text-zinc-500">Clinical Report — SOAP format</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={finalPdfUrl} target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors underline">
                                            Open
                                        </a>
                                        <a href={finalPdfUrl} download className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors underline">
                                            Download
                                        </a>
                                    </div>
                                </div>
                                <iframe src={`${finalPdfUrl}#toolbar=0`} className="flex-1 border-0 bg-white" title="Clinical Report" />
                                {draft?.patient_summary_md && (
                                    <div className="shrink-0 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">Patient Summary</p>
                                        <article className="prose prose-sm prose-zinc dark:prose-invert max-w-none text-sm">
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

// ── Draft review ───────────────────────────────────────────────────────────────
function DraftReview({ draft, editedJson, onUpdate, onApprove }: {
    draft: DraftResponse;
    editedJson: ClinicalDraftJson;
    onUpdate: (d: ClinicalDraftJson) => void;
    onApprove: () => void;
}) {
    const update = (cat: 'chief_complaints' | 'assessments', idx: number, val: string) => {
        const next = { ...editedJson };
        next[cat] = next[cat].map((item, i) => i === idx ? { ...item, finding: val } : item);
        onUpdate(next);
    };
    const updateAction = (idx: number, val: string) =>
        onUpdate({ ...editedJson, actionables: editedJson.actionables.map((a, i) => i === idx ? { ...a, description: val } : a) });

    const meta = draft.administrative_metadata;

    return (
        <div className="p-5 h-full flex flex-col gap-5 overflow-auto">
            {/* Meta row */}
            <div className="flex gap-4 text-xs text-zinc-400 font-mono shrink-0">
                <span>{meta.patient_name}</span>
                <span className="text-zinc-200 dark:text-zinc-700">/</span>
                <span>{meta.doctor_name}</span>
                <span className="text-zinc-200 dark:text-zinc-700">/</span>
                <span>{new Date(meta.encounter_date).toLocaleDateString()}</span>
            </div>

            {/* Patient summary */}
            {draft.patient_summary_md && (
                <div className="shrink-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">Patient Summary</p>
                    <div className="border border-zinc-100 dark:border-zinc-800 rounded-lg p-4">
                        <article className="prose prose-sm prose-zinc dark:prose-invert max-w-none text-sm">
                            <EesztMarkdown content={draft.patient_summary_md} />
                        </article>
                    </div>
                </div>
            )}

            {/* Editable findings */}
            <div className="space-y-5 flex-1">
                {([
                    { label: 'Chief Complaints', key: 'chief_complaints' as const },
                    { label: 'Assessments', key: 'assessments' as const },
                ] as const).map(({ label, key }) => (
                    <div key={key}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">{label}</p>
                        {editedJson[key].length === 0
                            ? <p className="text-xs text-zinc-300 dark:text-zinc-700 italic px-2">None detected</p>
                            : editedJson[key].map((item, idx) => (
                                <div key={idx} className="flex items-baseline gap-2 py-1.5 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 shrink-0 w-16 text-right">
                                        {item.condition_status}
                                    </span>
                                    <input
                                        value={item.finding}
                                        onChange={e => update(key, idx, e.target.value)}
                                        className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 bg-transparent border-none focus:outline-none"
                                    />
                                    <QuoteTooltip quote={item.exact_quote} />
                                </div>
                            ))
                        }
                    </div>
                ))}

                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">Action Plan</p>
                    {editedJson.actionables.length === 0
                        ? <p className="text-xs text-zinc-300 dark:text-zinc-700 italic px-2">None detected</p>
                        : editedJson.actionables.map((item, idx) => (
                            <div key={idx} className="flex items-baseline gap-2 py-1.5 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 shrink-0 w-16 text-right">
                                    {item.action_type}
                                </span>
                                <input
                                    value={item.description}
                                    onChange={e => updateAction(idx, e.target.value)}
                                    className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 bg-transparent border-none focus:outline-none"
                                />
                                <QuoteTooltip quote={item.exact_quote} />
                            </div>
                        ))
                    }
                </div>
            </div>

            {/* Approve */}
            <button
                onClick={onApprove}
                className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shrink-0"
            >
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                Approve and generate PDF
            </button>
        </div>
    );
}
