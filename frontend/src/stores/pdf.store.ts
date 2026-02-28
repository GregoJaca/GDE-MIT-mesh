// In-memory store for generated PDF blob URLs keyed by appointment ID.
// The ReportViewer checks this store first before falling back to the static mock PDF.

const store = new Map<string, string>();

export function setGeneratedPdf(appointmentId: string, blobUrl: string): void {
    const prev = store.get(appointmentId);
    if (prev) URL.revokeObjectURL(prev); // prevent memory leaks
    store.set(appointmentId, blobUrl);
}

export function getGeneratedPdf(appointmentId: string): string | null {
    return store.get(appointmentId) ?? null;
}

// Version counter so React components can trigger re-renders on update
let version = 0;
export function getPdfStoreVersion(): number { return version; }
export function bumpPdfStoreVersion(): void { version++; }
