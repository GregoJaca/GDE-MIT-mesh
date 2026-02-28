# Frontend Ecosystem

Echo’s user interfaces are built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

We target two distinct environments:
- **Doctor Dashboard:** The ambient, browser-based scribe companion.
- **Patient Dashboard:** A mobile-optimized app simulating the patient portal.

## Design Philosophy: Zen UX

Medical UI is notoriously heavy, cluttered with dense tables and intrusive borders. Echo actively rejects this paradigm in favor of a strict **Zen UX**:
- **Monochrome Integrity:** We operate on a crisp black, white, and zinc palette. 
- **Borderless Topography:** We use ample whitespace to separate content logic. Formal lines define actionable elements, contrasting starkly with typography-focused data displays.
- **Progressive Disclosure:** Deep, complex data (such as the interactive context modals) is hidden by default and summoned only via immediate user click action.

## Audio Engine

The heart of the Doctor dashboard is powered by the `MediaRecorder` API. 
When the consultation begins, the browser actively buffers ambient dialogue into memory. Because we optimize chunking with backend `ffmpeg` parsers, the audio stream scales seamlessly from a fifteen-second check-in to a forty-five minute complex diagnosis without client-side memory exhaustion.

## State Architecture

The consultation lifecycle is managed explicitly via a rigidly typed state machine:

```tsx
type FlowState = 'idle' | 'drafting' | 'reviewing' | 'finalizing' | 'done';
```

- **`idle`:** Awaiting recording initialization.
- **`drafting`:** The recording has ceased. Echo presents a minimal spinner while asynchronous requests transit to the transcription and GPT-5.2 infrastructure.
- **`reviewing`:** The core "Human-in-the-Loop" interactive phase. The structured draft is displayed as an editable form. The physician audits facts via the `exact_quote` tooltips.
- **`finalizing`:** The physician commits the edited JSON model upstream.
- **`done`:** The hospital-grade PDF is finalized and rendered natively via `iframe`.
