import { useState, useRef, useCallback, useEffect } from 'react';

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
  const index = recordingsStore.findIndex(r => r.appointmentId === recording.appointmentId);
  if (index !== -1) {
    recordingsStore[index] = recording;
  } else {
    recordingsStore.push(recording);
  }
}

export function clearRecordingsForAppointment(appointmentId: string) {
  const index = recordingsStore.findIndex(r => r.appointmentId === appointmentId);
  if (index !== -1) {
    recordingsStore.splice(index, 1);
  }
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

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

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
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        setDuration(currentDuration => {
          const newRecording: Recording = {
            id: `REC-${Date.now()}`,
            appointmentId,
            blob,
            url,
            duration: currentDuration,
            timestamp: new Date().toISOString(),
          };
          addRecording(newRecording);
          setRecordings(getRecordingsByAppointment(appointmentId));
          return 0; // reset duration state
        });
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
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
