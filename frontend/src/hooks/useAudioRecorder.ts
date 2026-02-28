import { useState, useRef, useCallback, useEffect } from 'react';
import type { Recording } from '@/types';
import { APP_CONFIG } from '@/config/app.config';

// In-memory store for recordings (one per appointment)
const recordingsStore: Recording[] = [];

function getRecordingsByAppointment(appointmentId: string): Recording[] {
    return recordingsStore.filter((r) => r.appointmentId === appointmentId);
}

function addOrReplaceRecording(recording: Recording): void {
    const idx = recordingsStore.findIndex((r) => r.appointmentId === recording.appointmentId);
    if (idx !== -1) {
        recordingsStore[idx] = recording;
    } else {
        recordingsStore.push(recording);
    }
}

function clearRecordingsForAppointment(appointmentId: string): void {
    const idx = recordingsStore.findIndex((r) => r.appointmentId === appointmentId);
    if (idx !== -1) recordingsStore.splice(idx, 1);
}

export function useAudioRecorder(appointmentId: string) {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [recordings, setRecordings] = useState<Recording[]>(
        getRecordingsByAppointment(appointmentId),
    );
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const blobResolveRef = useRef<((blob: Blob) => void) | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const { PREFERRED_MIME_TYPE, FALLBACK_MIME_TYPE, CHUNK_INTERVAL_MS } = APP_CONFIG.RECORDING;

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mimeType = MediaRecorder.isTypeSupported(PREFERRED_MIME_TYPE)
                ? PREFERRED_MIME_TYPE
                : FALLBACK_MIME_TYPE;

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);

                setDuration((currentDuration) => {
                    const newRecording: Recording = {
                        id: `REC-${Date.now()}`,
                        appointmentId,
                        blob,
                        url,
                        duration: currentDuration,
                        timestamp: new Date().toISOString(),
                    };
                    addOrReplaceRecording(newRecording);
                    setRecordings(getRecordingsByAppointment(appointmentId));
                    return 0;
                });

                stream.getTracks().forEach((track) => track.stop());

                if (blobResolveRef.current) {
                    blobResolveRef.current(blob);
                    blobResolveRef.current = null;
                }
            };

            mediaRecorder.start(CHUNK_INTERVAL_MS);
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
            setIsPaused(false);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Microphone access error:', err);
            setError('Microphone access denied. Please allow microphone permissions and try again.');
        }
    }, [appointmentId, PREFERRED_MIME_TYPE, FALLBACK_MIME_TYPE, CHUNK_INTERVAL_MS]);

    const stopRecording = useCallback((): Promise<Blob> => {
        return new Promise((resolve) => {
            blobResolveRef.current = resolve;
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setIsRecording(false);
            setIsPaused(false);
        });
    }, []);

    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, []);

    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        }
    }, []);

    const refreshRecordings = useCallback(() => {
        setRecordings(getRecordingsByAppointment(appointmentId));
    }, [appointmentId]);

    const clearRecordings = useCallback(() => {
        clearRecordingsForAppointment(appointmentId);
        setRecordings(getRecordingsByAppointment(appointmentId));
    }, [appointmentId]);

    return {
        isRecording,
        isPaused,
        duration,
        recordings,
        error,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        refreshRecordings,
        clearRecordings,
    };
}
