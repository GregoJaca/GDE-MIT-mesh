// Application configuration derived from environment variables.
// All values must come from VITE_* env vars — no hardcoded URLs allowed.

export const APP_CONFIG = {
    TITLE: import.meta.env.VITE_APP_TITLE || 'MediCore Medical Dashboard',

    API: {
        BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
        TRANSCRIBE_URL: import.meta.env.VITE_TRANSCRIBE_API_URL || 'http://localhost:8000/api/v1/transcribe',
        CONSULTATION_URL: import.meta.env.VITE_CONSULTATION_API_URL || 'http://localhost:8000/api/v1/generate-consultation',
        PATIENTS_URL: import.meta.env.VITE_PATIENTS_API_URL || 'http://localhost:8000/api/v1/eeszt/patients',
        PATIENT_CONTEXT_URL: import.meta.env.VITE_PATIENT_CONTEXT_API_URL || 'http://localhost:8000/api/v1/eeszt/context',
    },

    FEATURES: {
        MOCK_DATA_ENABLED: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
    },

    ASSETS: {
        DEFAULT_PDF_URL: import.meta.env.VITE_DEFAULT_PDF_URL || '/reports/tetelsor.pdf',
    },

    UPLOAD: {
        SUPPORTED_DOCUMENT_TYPES: {
            'application/pdf': ['.pdf'],
        } as Record<string, string[]>,
    },

    RECORDING: {
        CHUNK_INTERVAL_MS: 1000,
        PREFERRED_MIME_TYPE: 'audio/webm;codecs=opus',
        FALLBACK_MIME_TYPE: 'audio/webm',
    },
} as const;
