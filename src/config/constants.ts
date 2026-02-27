export const APP_CONFIG = {
  TITLE: import.meta.env.VITE_APP_TITLE || 'Medical Dashboard',
  DEFAULT_PDF_URL: '/reports/tetelsor.pdf',
  API_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  MOCK_DATA_ENABLED: import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false',
  SCRIBE_DELAY_MS: 1000,
  SUPPORTED_DOCUMENT_TYPES: {
    'application/pdf': ['.pdf']
  }
};
