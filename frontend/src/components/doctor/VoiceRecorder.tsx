import { Mic, Square, Pause, Play, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Recording } from '@/types';
import { formatDuration } from '@/lib/utils';

interface VoiceRecorderProps {
    isRecording: boolean;
    isPaused: boolean;
    isTranscribing: boolean;
    duration: number;
    recordings: Recording[];
    error: string | null;
    onStart: () => void;
    onStop: () => void;
    onPause: () => void;
    onResume: () => void;
}

export default function VoiceRecorder({
    isRecording,
    isPaused,
    isTranscribing,
    duration,
    recordings,
    error,
    onStart,
    onStop,
    onPause,
    onResume,
}: VoiceRecorderProps) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200/60 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isRecording ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-brand-slate/10 text-brand-teal dark:text-brand-lime'}`}>
                        <Mic className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-brand-plum dark:text-brand-lime">Voice Recorder & AI Scribe</h3>
                        <p className="text-xs text-brand-slate dark:text-slate-400">
                            Dictate notes to automatically transcribe them into the report below.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {error && (
                        <div className="text-xs text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded-md border border-red-200">
                            <AlertTriangle className="w-3 h-3" /> {error}
                        </div>
                    )}

                    {isRecording && (
                        <div className="flex items-center gap-2 mr-2">
                            <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-red-400'}`} />
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-500' : 'bg-red-500'}`} />
                            </span>
                            <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums min-w-[3.5rem]">
                                {formatDuration(duration)}
                            </span>
                        </div>
                    )}

                    {!isRecording ? (
                        <Button onClick={onStart} className="bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-2">
                            <Mic className="w-4 h-4" /> Start Recording
                        </Button>
                    ) : (
                        <>
                            {isPaused ? (
                                <Button onClick={onResume} variant="outline" className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                                    <Play className="w-4 h-4" /> Resume
                                </Button>
                            ) : (
                                <Button onClick={onPause} variant="outline" className="flex items-center gap-2">
                                    <Pause className="w-4 h-4" /> Pause
                                </Button>
                            )}
                            <Button
                                disabled={isTranscribing}
                                onClick={onStop}
                                variant="outline"
                                className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                <Square className="w-4 h-4" />
                                {isTranscribing ? 'Transcribing...' : 'Stop & Transcribe'}
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
                                <span className="text-xs font-semibold text-brand-plum dark:text-slate-300 flex-1">
                                    Recording — {formatDuration(rec.duration)}
                                </span>
                                <audio controls src={rec.url} className="h-7 max-w-[200px]" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
