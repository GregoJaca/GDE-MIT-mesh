import { useState, useEffect } from 'react';
import { useAppointmentContext } from '@/layouts/DashboardLayout';
import { FileText, UserIcon, Calendar, Mic, Square, Pause, Play, AlertTriangle, ClipboardList, Stethoscope, UploadCloud, File, FileDown, FileCode } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getPatientById, fetchPatients, fetchPatientContext, updateAppointmentReport } from '@/lib/mock-data';
import type { Patient } from '@/lib/mock-data';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReportViewer from '@/components/ReportViewer';
import { generateAndStorePdf } from '@/lib/pdf-generator';
import { setGeneratedMd, bumpMdStoreVersion } from '@/lib/md-store';
import { APP_CONFIG } from '@/config/constants';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type TabId = 'report' | 'notes' | 'upload';

export default function DoctorDashboard() {
  const { selectedAppointment, setSelectedAppointment, selectedPatientId, setSelectedPatientId, selectedCase } = useAppointmentContext();
  const selectedPatient = getPatientById(selectedPatientId);
  const [activeTab, setActiveTab] = useState<TabId>('report');
  const [files, setFiles] = useState<File[]>([]);
  const [viewingFile, setViewingFile] = useState<{ file: File, url: string } | null>(null);
  const [editableNotes, setEditableNotes] = useState(selectedAppointment?.report || '');
  const [pdfVersion, setPdfVersion] = useState(0);
  const [mdVersion, setMdVersion] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [saveFormat, setSaveFormat] = useState<'markdown' | 'pdf'>('pdf');
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [patientContextCache, setPatientContextCache] = useState<any>(null);

  useEffect(() => {
    fetchPatients().then(setPatientsList);
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientContext(selectedPatientId).then(setPatientContextCache);
    }
  }, [selectedPatientId]);
  // Reset notes whenever the selected appointment changes
  useEffect(() => {
    setEditableNotes(selectedAppointment?.report || '');
  }, [selectedAppointment?.id]);

  const onDrop = (acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: APP_CONFIG.SUPPORTED_DOCUMENT_TYPES
  });

  const {
    isRecording,
    isPaused,
    duration,
    recordings,
    error: micError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    refreshRecordings,
    clearRecordings
  } = useAudioRecorder(selectedAppointment?.id ?? '');

  useEffect(() => {
    refreshRecordings();
  }, [selectedAppointment?.id, refreshRecordings]);

  if (!selectedAppointment) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
        <FileText className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Select Medical Record</p>
        <p className="text-sm mt-1 text-center max-w-sm">Choose an appointment from the left panel to view the detailed clinical report.</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: 'report', label: 'Report', icon: FileText },
    { id: 'notes', label: 'Clinical Notes & Audio', icon: ClipboardList },
    { id: 'upload', label: 'Upload Files', icon: UploadCloud },
  ];

  const handleSaveNotes = async () => {
    if (!selectedAppointment) return;

    if (patientContextCache) {
      alert("Consultation processing started in background... (Sending to Backend zero-hallucination agent)");
      try {
        const res = await fetch("http://localhost:8000/api/v1/generate-consultation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metadata: {
              patient_id: patientContextCache.patient.id,
              patient_name: patientContextCache.patient.name,
              patient_taj: patientContextCache.patient.taj,
              doctor_id: "D-4099",
              doctor_name: "Dr. Smith",
              doctor_seal: "S-14399",
              encounter_date: new Date().toISOString(),
              context_documents: patientContextCache.context_documents
            },
            transcript: editableNotes
          })
        });
        if (res.ok) {
          const resultingData = await res.json();
          console.log(resultingData);
          const meta = resultingData.administrative_metadata;
          const clinical = resultingData.clinical_report;
          const summary = resultingData.patient_summary;

          const formattedReport = `**CLINICAL CONSULTATION REPORT**
Date: ${new Date(meta.encounter_date).toLocaleString()}
Doctor: ${meta.doctor_name} (${meta.doctor_seal})
Patient: ${meta.patient_name} (TAJ: ${meta.patient_taj})
--------------------------------------------------

**CHIEF COMPLAINTS**
${clinical.chief_complaints.map((c: any) => `- ${c.finding} [${c.condition_status}] ${c.system_reference_id ? `(Ref: [${c.system_reference_id}](https://www.eeszt.gov.hu/hu/eeszt-portal))` : ''}`).join('\n')}

**ASSESSMENTS**
${clinical.assessments.map((a: any) => `- ${a.finding} [${a.condition_status}] ${a.system_reference_id ? `(Ref: [${a.system_reference_id}](https://www.eeszt.gov.hu/hu/eeszt-portal))` : ''}`).join('\n')}

**MEDICATIONS / ACTIONS**
${clinical.medications.map((m: any) => `- ${m.action_type}: ${m.description} (${m.timeframe || 'ASAP'}) ${m.system_reference_id ? `(Ref: [${m.system_reference_id}](https://www.eeszt.gov.hu/hu/eeszt-portal))` : ''}`).join('\n')}

--------------------------------------------------
**PATIENT SUMMARY (LAYMAN)**
${summary.layman_explanation}
`;
          const laymanReport = `**YOUR VISIT SUMMARY**
${summary.layman_explanation}

**YOUR TO-DOS & ACTION ITEMS**
${summary.actionables.map((a: any) => `- ${a.description} (${a.timeframe || 'ASAP'})`).join('\n')}
`;
          updateAppointmentReport(selectedAppointment.id, formattedReport, laymanReport);
          setSelectedAppointment({ ...selectedAppointment, report: formattedReport, patientSummary: laymanReport });
        }
      } catch (err) {
        console.error(err);
      }

    }

    if (saveFormat === 'pdf') {
      generateAndStorePdf({
        appointmentId: selectedAppointment.id,
        topic: selectedAppointment.topic,
        doctorId: selectedAppointment.doctorId,
        date: selectedAppointment.date,
        patientId: selectedPatientId,
        reportNotes: editableNotes
      });
      setPdfVersion(v => v + 1);
      alert('PDF generated and saved to this appointment\'s Report tab!');
    } else {
      // Generate and store Markdown report
      const dateStr = new Date(selectedAppointment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const md = `# ${selectedAppointment.topic}\n\n**Provider:** ${selectedAppointment.doctorId}  \n**Date:** ${dateStr}  \n**Patient:** ${selectedPatientId}\n\n---\n\n## Clinical Notes\n\n${editableNotes}\n\n---\n\n*Generated by MediCore — ${new Date().toLocaleString()}*\n`;
      setGeneratedMd(selectedAppointment.id, md);
      bumpMdStoreVersion();
      setMdVersion(v => v + 1);
      alert('Markdown report generated and saved to this appointment\'s Report tab!');
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Patient Context Bar */}
      <div className="flex items-center gap-6 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 shrink-0 transition-colors">
        <div className="max-w-xs w-full">
          <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase tracking-widest">Active Patient</label>
          <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
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
            <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-lime/20 flex items-center justify-center text-brand-teal font-bold border border-brand-lime/50 shadow-sm">
                {selectedPatient.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-brand-plum dark:text-brand-lime m-0">{selectedPatient.name}</p>
                <p className="text-xs text-brand-slate dark:text-slate-400 font-medium m-0">{selectedPatient.age} yrs • {selectedPatient.gender}</p>
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
            {selectedAppointment.topic}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 p-1 shrink-0 transition-colors">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
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

      {/* Tab Content */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-colors">

        {/* REPORT TAB — PDF Viewer */}
        {activeTab === 'report' && (
          <ReportViewer appointmentId={selectedAppointment.id} pdfVersion={pdfVersion} mdVersion={mdVersion} />
        )}

        {/* CLINICAL NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="p-8 overflow-auto h-full">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Header */}
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-2 text-brand-teal font-medium text-sm">
                  <FileText className="w-4 h-4" />
                  Medical Report
                </div>
                <h1 className="text-3xl font-bold text-brand-plum dark:text-brand-lime tracking-tight leading-tight">
                  {selectedAppointment.topic}
                </h1>
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <UserIcon className="w-4 h-4" /> Provider: {selectedAppointment.doctorId}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedAppointment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Voice Recorder & AI Scribe Integration */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isRecording ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-brand-slate/10 text-brand-teal dark:text-brand-lime'}`}>
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-brand-plum dark:text-brand-lime">Voice Recorder & AI Scribe</h3>
                      <p className="text-xs text-brand-slate dark:text-slate-400">Dictate notes to automatically transcribe them into the report below.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {micError && (
                      <div className="text-xs text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded-md border border-red-200">
                        <AlertTriangle className="w-3 h-3" /> {micError}
                      </div>
                    )}

                    {isRecording && (
                      <div className="flex items-center gap-2 mr-2">
                        <span className="relative flex h-3 w-3">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums min-w-[3.5rem]">
                          {formatDuration(duration)}
                        </span>
                      </div>
                    )}

                    {!isRecording ? (
                      <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        Start Recording
                      </Button>
                    ) : (
                      <>
                        {isPaused ? (
                          <Button onClick={resumeRecording} variant="outline" className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                            <Play className="w-4 h-4" /> Resume
                          </Button>
                        ) : (
                          <Button onClick={pauseRecording} variant="outline" className="flex items-center gap-2">
                            <Pause className="w-4 h-4" /> Pause
                          </Button>
                        )}
                        <Button
                          disabled={isTranscribing}
                          onClick={async () => {
                            try {
                              setIsTranscribing(true);
                              const audioBlob = await stopRecording();
                              clearRecordings();

                              // Send audio to the real transcription backend
                              const formData = new FormData();
                              formData.append('file', audioBlob, 'recording.webm');

                              const response = await fetch(APP_CONFIG.TRANSCRIBE_API_URL, {
                                method: 'POST',
                                body: formData,
                              });

                              if (!response.ok) {
                                const errData = await response.json().catch(() => ({}));
                                throw new Error(errData.detail || `Server error ${response.status}`);
                              }

                              const data = await response.json();
                              setEditableNotes(prev =>
                                prev + (prev ? '\n\n' : '') + data.transcript
                              );
                            } catch (err: unknown) {
                              console.error('Transcription failed:', err);
                              const message = err instanceof Error ? err.message : 'Unknown error';
                              alert(`Transcription failed: ${message}`);
                            } finally {
                              setIsTranscribing(false);
                            }
                          }}
                          variant="outline"
                          className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Square className="w-4 h-4" />
                          {isTranscribing ? 'Transcribing…' : 'Stop & Transcribe'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {recordings.length > 0 && (
                  <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Saved Audio Log</p>
                    <div className="space-y-2">
                      {recordings.map((rec) => (
                        <div key={rec.id} className="flex items-center gap-4 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                          <Mic className="w-3.5 h-3.5 text-brand-teal ml-2" />
                          <span className="text-xs font-semibold text-brand-plum dark:text-slate-300 flex-1">Recording — {formatDuration(rec.duration)}</span>
                          <audio controls src={rec.url} className="h-7 max-w-[200px]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Editable Notes Textbox */}
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-brand-plum dark:text-brand-lime border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">Clinical Report Notes</h3>
                <textarea
                  value={editableNotes}
                  onChange={(e) => setEditableNotes(e.target.value)}
                  placeholder="Type your clinical notes here, or record audio to have AI auto-transcribe it..."
                  className="w-full text-brand-slate dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700 p-6 font-serif text-lg min-h-[350px] resize-y focus:outline-none focus:ring-2 focus:ring-brand-teal transition-all"
                />
              </div>

              {/* Format Toggle & Save */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-5">
                {/* Format Slider */}
                <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner">
                  {/* Sliding pill indicator */}
                  <div
                    className={`absolute top-1 bottom-1 rounded-lg bg-white dark:bg-slate-700 shadow-md transition-all duration-300 ease-in-out ${saveFormat === 'markdown'
                        ? 'left-1 w-[calc(50%-4px)]'
                        : 'left-[calc(50%+2px)] w-[calc(50%-4px)]'
                      }`}
                  />
                  <button
                    onClick={() => setSaveFormat('markdown')}
                    className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 min-w-[120px] justify-center ${saveFormat === 'markdown'
                        ? 'text-brand-plum dark:text-brand-lime'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                  >
                    <FileCode className="w-4 h-4" />
                    Markdown
                  </button>
                  <button
                    onClick={() => setSaveFormat('pdf')}
                    className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 min-w-[120px] justify-center ${saveFormat === 'pdf'
                        ? 'text-brand-plum dark:text-brand-lime'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                </div>

                {/* Save Button */}
                <button
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 hover:shadow-md active:scale-[0.98]"
                  onClick={handleSaveNotes}
                >
                  <FileDown className="w-4 h-4" />
                  {saveFormat === 'pdf' ? 'Generate PDF & Save' : 'Generate Markdown & Save'}
                </button>
                <button
                  className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-brand-slate/5 text-brand-slate dark:text-slate-300 font-medium rounded-lg shadow-sm transition-colors"
                  onClick={() => {
                    if (!selectedAppointment) return;
                    updateAppointmentReport(selectedAppointment.id, editableNotes);
                    setSelectedAppointment({ ...selectedAppointment, report: editableNotes });
                    alert('Notes saved successfully as a draft.');
                  }}
                >
                  Save Draft
                </button>
              </div>
            </div>
          </div>
        )}
        {/* UPLOAD TAB */}
        {activeTab === 'upload' && (
          <div className="p-8 overflow-auto h-full">
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h3 className="text-lg font-bold text-brand-plum dark:text-brand-lime border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-brand-teal" />
                  Upload Documents
                </h3>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group
                    ${isDragActive ? 'border-brand-teal bg-brand-teal/5' : 'border-slate-200 dark:border-slate-700 hover:border-brand-teal/50 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <input {...getInputProps()} />
                  <div className={`p-4 rounded-full mb-4 transition-colors ${isDragActive ? 'bg-brand-mint/20 text-brand-teal' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-brand-teal'}`}>
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="text-base font-medium text-slate-700 dark:text-slate-200">
                    {isDragActive ? "Drop PDF files here..." : "Click or drag PDF files to add to this appointment"}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">PDF documents only</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Uploaded PDF Files ({files.length})
                  </p>
                  {files.map((file, i) => (
                    <div
                      key={i}
                      onClick={() => setViewingFile({ file, url: URL.createObjectURL(file) })}
                      className="flex items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:border-brand-teal/50 hover:shadow-md cursor-pointer transition-all"
                    >
                      <File className="w-5 h-5 text-brand-teal mr-3 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-brand-teal hover:bg-brand-teal/10 hover:text-brand-teal">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* File Viewing Dialog */}
      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
            <DialogTitle className="text-brand-plum dark:text-brand-lime flex items-center gap-2">
              <File className="w-4 h-4 text-brand-teal" />
              {viewingFile?.file.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative bg-slate-100 dark:bg-slate-900 w-full">
            {viewingFile && (
              <iframe
                src={`${viewingFile.url}#toolbar=0`}
                className="w-full h-full border-0 absolute inset-0"
                title="Document Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
