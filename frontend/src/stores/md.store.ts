// In-memory store for generated Markdown reports keyed by appointment ID.
// The ReportViewer checks this store to show a Markdown report card.

const store = new Map<string, string>();

export function setGeneratedMd(appointmentId: string, markdown: string): void {
    store.set(appointmentId, markdown);
}

export function getGeneratedMd(appointmentId: string): string | null {
    return store.get(appointmentId) ?? null;
}

let version = 0;
export function getMdStoreVersion(): number { return version; }
export function bumpMdStoreVersion(): void { version++; }
