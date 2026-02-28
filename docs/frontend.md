# Frontend Ecosystem: React & Zen UX

The Mesh frontend is built on **React**, **TypeScript**, **Tailwind CSS**, and **Vite**. 

It serves two distinct distinct environments:
- `/doctor`: The Ambient Scribe dashboard.
- `/patient`: The mobile-optimized patient portal.

## The Design Philosophy: Minimalist Zen

Medical interfaces are notoriously cluttered, contributing directly to cognitive load and screen fatigue. Mesh utilizes a strict **Zen UX** paradigm:
- **Monochrome & Muted:** Core interactions are black, white, and zinc. 
- **Borderless:** Cards and containers use subtle whitespace and soft background colors (`bg-zinc-50`) instead of harsh borders.
- **Progressive Disclosure:** Complex data (like the EESZT document viewer modal) only appears when explicitly requested.

## The Audio Capture Pipeline

The core mechanism of the Doctor Dashboard is the `MediaRecorder` hook.

1. **Capturing:** When the doctor presses "Record," a native browser webhook requests microphone access. 
2. **Buffering:** Audio chunks are buffered locally in the browser memory. Because our backend uses `ffmpeg` and OpenAI Whisper `chunked` processing, we can handle audio files that last up to an hour.
3. **Drafting:** When the doctor presses "Stop", the frontend packages the binary `Blob` into a `FormData` object and POSTs it to the `/generate-draft` endpoint.

## State Management (`DoctorDashboard.tsx`)

Managing the transition between raw audio, the LLM draft, and the finalized PDF is handled via a strict State Machine `flowState`:

```tsx
const [flowState, setFlowState] = useState<'idle' | 'drafting' | 'reviewing' | 'finalizing' | 'done'>('idle');
```

- **`idle`**: The microphone is ready, waiting for the doctor.
- **`drafting`**: An overlay spinner appears while the backend processes the audio and LLM extraction.
- **`reviewing`**: The UI splits. The doctor is presented with an *interactive* form pre-populated by the LLM's `ClinicalDraftJson`. They can type, edit, and hover over findings to see the `exact_quote` Audit Trail.
- **`finalizing`**: The edited JSON is posted back to the server.
- **`done`**: The PDF `iframe` renders inline.
