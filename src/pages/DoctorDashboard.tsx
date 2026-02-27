import { useState, useEffect } from 'react';
import { useAppointmentContext } from '@/layouts/DashboardLayout';
import { FileText, UserIcon, Calendar, Mic, Square, Pause, Play, AlertTriangle, ClipboardList, Stethoscope, UploadCloud, File } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { patients, getPatientById, updateAppointmentReport } from '@/lib/mock-data';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReportViewer from '@/components/ReportViewer';
import { jsPDF } from 'jspdf';
import { setGeneratedPdf, bumpPdfStoreVersion } from '@/lib/pdf-store';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type TabId = 'report' | 'notes' | 'upload';

export default function DoctorDashboard() {
  const { selectedAppointment, setSelectedAppointment, selectedPatientId, setSelectedPatientId } = useAppointmentContext();
  const selectedPatient = getPatientById(selectedPatientId);
  const [activeTab, setActiveTab] = useState<TabId>('report');
  const [files, setFiles] = useState<File[]>([]);
  const [viewingFile, setViewingFile] = useState<{file: File, url: string} | null>(null);
  const [editableNotes, setEditableNotes] = useState(selectedAppointment?.report || '');
  const [pdfVersion, setPdfVersion] = useState(0);

  // Reset notes whenever the selected appointment changes
  useEffect(() => {
    setEditableNotes(selectedAppointment?.report || '');
  }, [selectedAppointment?.id]);

  const onDrop = (acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
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

  const handleSaveNotes = (isPdf = false) => {
    if (!selectedAppointment) return;
    updateAppointmentReport(selectedAppointment.id, editableNotes);
    setSelectedAppointment({ ...selectedAppointment, report: editableNotes });

    if (isPdf) {
      // Generate a real PDF from the notes using jspdf
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const usableWidth = pageWidth - margin * 2;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(selectedAppointment.topic, margin, 25);

      // Meta line
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(
        `Provider: ${selectedAppointment.doctorId}  |  Date: ${new Date(selectedAppointment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  |  Patient: ${selectedPatientId}`,
        margin, 34
      );

      // Divider
      doc.setDrawColor(200);
      doc.line(margin, 38, pageWidth - margin, 38);

      // Vitals
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Vitals', margin, 48);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Blood Pressure: 118/75   |   Heart Rate: 72 bpm   |   Weight: 142 lbs   |   Temp: 98.6\u00b0F', margin, 56);

      // Clinical Notes
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Clinical Notes', margin, 70);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(editableNotes, usableWidth);
      doc.text(lines, margin, 80);

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(`MediCore — Generated ${new Date().toLocaleString()} — Page ${i} of ${pageCount}`, margin, doc.internal.pageSize.getHeight() - 10);
      }

      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      setGeneratedPdf(selectedAppointment.id, blobUrl);
      bumpPdfStoreVersion();
      setPdfVersion(v => v + 1);
      alert('PDF generated and saved to this appointment\'s Report tab!');
    } else {
      alert('Notes saved successfully as a draft.');
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
              {patients.map((p) => (
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

        <div className="ml-auto flex items-center gap-2 bg-brand-mint/10 text-brand-teal px-3 py-1.5 rounded-lg text-sm font-medium border border-brand-teal/20">
          <Stethoscope className="w-4 h-4" />
          {selectedAppointment.topic}
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
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
          <ReportViewer appointmentId={selectedAppointment.id} pdfVersion={pdfVersion} />
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
                      <Button onClick={startRecording} className="bg-brand-teal hover:bg-brand-teal/90 text-white shadow-sm flex items-center gap-2">
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
                          onClick={() => {
                            stopRecording();
                            // Simulate AI Transcription delay
                            setTimeout(() => {
                              setEditableNotes(prev => 
                                prev + (prev ? '\n\n' : '') + 
                                '[AI Transcription]: Patient presents with continued joint discomfort. Vitals are stable. Advised to continue current physical therapy regimen for another 4 weeks and return for follow-up.'
                              );
                            }, 1000);
                          }} 
                          variant="outline" 
                          className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                        >
                          <Square className="w-4 h-4" /> Stop & Transcribe
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

              {/* Vitals */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Blood Pressure', value: '118/75' },
                  { label: 'Heart Rate', value: '72 bpm' },
                  { label: 'Weight', value: '142 lbs' },
                  { label: 'Temperature', value: '98.6°F' },
                ].map((v) => (
                  <div key={v.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">{v.label}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{v.value}</p>
                  </div>
                ))}
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

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <button 
                  className="px-6 py-2.5 bg-brand-plum hover:bg-brand-plum/90 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                  onClick={() => handleSaveNotes(true)}
                >
                  <FileText className="w-4 h-4" />
                  Convert to PDF & Save to Appointment
                </button>
                <button 
                  className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-brand-slate/5 text-brand-slate dark:text-slate-300 font-medium rounded-lg shadow-sm transition-colors"
                  onClick={() => handleSaveNotes(false)}
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
