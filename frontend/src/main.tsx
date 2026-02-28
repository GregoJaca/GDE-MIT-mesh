import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/globals.css';
import App from '@/App';
import { ThemeProvider } from '@/components/shared/ThemeProvider';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
    <StrictMode>
        <ThemeProvider defaultTheme="light" storageKey="medicore-theme">
            <App />
        </ThemeProvider>
    </StrictMode>,
);
