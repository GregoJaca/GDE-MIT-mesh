// Simple in-memory store for generated Markdown reports keyed by appointment ID.
// When the doctor converts notes to Markdown, the content is stored here.
// The ReportViewer checks this store to show a Markdown report card.

const generatedMds = new Map<string, string>();

export function setGeneratedMd(appointmentId: string, markdown: string) {
  generatedMds.set(appointmentId, markdown);
}

export function getGeneratedMd(appointmentId: string): string | null {
  return generatedMds.get(appointmentId) ?? null;
}

// A version counter so React components can know when to re-render
let version = 0;
export function getMdStoreVersion() { return version; }
export function bumpMdStoreVersion() { version++; }
