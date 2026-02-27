// Simple in-memory store for generated PDF blob URLs keyed by appointment ID.
// When the doctor converts notes to PDF, the blob URL is stored here.
// The ReportViewer checks this store first before falling back to the static mock PDF.

const generatedPdfs = new Map<string, string>();

export function setGeneratedPdf(appointmentId: string, blobUrl: string) {
  // Revoke the old blob URL to avoid memory leaks
  const old = generatedPdfs.get(appointmentId);
  if (old) URL.revokeObjectURL(old);
  generatedPdfs.set(appointmentId, blobUrl);
}

export function getGeneratedPdf(appointmentId: string): string | null {
  return generatedPdfs.get(appointmentId) ?? null;
}

// A version counter so React components can know when to re-render
let version = 0;
export function getPdfStoreVersion() { return version; }
export function bumpPdfStoreVersion() { version++; }
