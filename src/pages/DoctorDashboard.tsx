import { useAppointmentContext } from '@/layouts/DashboardLayout';
import { FileText, UserIcon, Calendar, Mic, Square, Pause, Play, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { patients, getPatientById } from '@/lib/mock-data';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useEffect } from 'react';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function DoctorDashboard() {
  const { selectedAppointment, selectedPatientId, setSelectedPatientId } = useAppointmentContext();
  const selectedPatient = getPatientById(selectedPatientId);

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

  // Refresh recordings when appointment changes
  useEffect(() => {
    refreshRecordings();
  }, [selectedAppointment?.id, refreshRecordings]);

  if (!selectedAppointment) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <FileText className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Select Medical Record</p>
        <p className="text-sm mt-1 text-center max-w-sm">Choose an appointment from the left panel to view the detailed clinical report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Patient Context Bar */}
      <div className="flex items-center gap-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200/60">
        <div className="max-w-xs w-full">
          <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase tracking-widest">Active Patient</label>
          <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
            <SelectTrigger className="w-full h-10 border-slate-200 bg-slate-50 font-medium text-slate-900 focus:ring-blue-500">
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
            <div className="h-10 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 shadow-sm">
                {selectedPatient.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 m-0">{selectedPatient.name}</p>
                <p className="text-xs text-slate-500 font-medium m-0">{selectedPatient.age} yrs • {selectedPatient.gender}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Report Header */}
      <div className="pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-2 text-blue-600 font-medium text-sm">
          <FileText className="w-4 h-4" />
          Medical Report
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
          {selectedAppointment.topic}
        </h1>
        <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <UserIcon className="w-4 h-4" /> Provider: {selectedAppointment.doctorId}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-4 h-4" />
            {new Date(selectedAppointment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Vitals Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Blood Pressure</p>
          <p className="text-lg font-bold text-slate-900">118/75</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Heart Rate</p>
          <p className="text-lg font-bold text-slate-900">72 bpm</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Weight</p>
          <p className="text-lg font-bold text-slate-900">142 lbs</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Temperature</p>
          <p className="text-lg font-bold text-slate-900">98.6°F</p>
        </div>
      </div>

      {/* Report Content */}
      <div className="prose prose-slate max-w-none">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Clinical Notes</h3>
        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-white rounded-xl shadow-sm border border-slate-200/50 p-6 font-serif text-lg">
          {selectedAppointment.report}
        </div>
      </div>

      {/* Voice Recording Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isRecording ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Voice Recorder</h3>
              <p className="text-xs text-slate-500">Dictate notes during or after the appointment</p>
            </div>
          </div>

          {/* Recording Controls */}
          <div className="flex items-center gap-3">
            {isRecording && (
              <div className="flex items-center gap-2 mr-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                </span>
                <span className="text-sm font-mono font-bold text-slate-700 tabular-nums min-w-[3.5rem]">
                  {formatDuration(duration)}
                </span>
              </div>
            )}

            {!isRecording ? (
              <Button
                onClick={startRecording}
                className="bg-red-500 hover:bg-red-600 text-white shadow-sm flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Start Recording
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button
                    onClick={resumeRecording}
                    variant="outline"
                    className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={pauseRecording}
                    variant="outline"
                    className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                )}
                <Button
                  onClick={stopRecording}
                  variant="outline"
                  className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Square className="w-4 h-4" />
                  Stop & Save
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mic Error */}
        {micError && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {micError}
          </div>
        )}

        {/* Saved Recordings */}
        <div className="p-5">
          {recordings.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Saved Recordings ({recordings.length})
              </p>
              {recordings.map((rec) => (
                <div key={rec.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors">
                  <div className="p-2 bg-white rounded-md border border-slate-200 shadow-sm">
                    <Mic className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      Recording — {formatDuration(rec.duration)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(rec.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <audio controls src={rec.url} className="h-8 max-w-[200px]" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-2">
              No recordings yet. Press <strong>Start Recording</strong> to dictate notes.
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-6 border-t border-slate-100 flex gap-4">
        <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors">
          Add Addendum
        </button>
        <button className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg shadow-sm transition-colors">
          Request Lab Results
        </button>
      </div>
    </div>
  );
}
