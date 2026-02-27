import { useState, useRef, useCallback } from 'react';

export interface Recording {
  id: string;
  appointmentId: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: string;
}

// In-memory store for recordings (mock backend)
const recordingsStore: Recording[] = [];

export function getRecordingsByAppointment(appointmentId: string): Recording[] {
  return recordingsStore.filter(r => r.appointmentId === appointmentId);
}

export function addRecording(recording: Recording) {
  recordingsStore.push(recording);
}

export function useAudioRecorder(appointmentId: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>(getRecordingsByAppointment(appointmentId));
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);

        const newRecording: Recording = {
          id: `REC-${Date.now()}`,
          appointmentId,
          blob,
          url,
          duration: elapsed,
          timestamp: new Date().toISOString(),
        };

        addRecording(newRecording);
        setRecordings(getRecordingsByAppointment(appointmentId));

        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 500);

    } catch (err) {
      console.error('Microphone access error:', err);
      setError('Microphone access denied. Please allow microphone permissions and try again.');
    }
  }, [appointmentId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  const refreshRecordings = useCallback(() => {
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
  };
}
