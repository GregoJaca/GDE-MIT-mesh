# MediCore Provider Portal - React + TypeScript + Vite

This application provides a comprehensive UI and layout for medical providers and their patients. It supports dashboard views spanning clinical appointments, medical report generation, AI-powered medical voice scribing, and document viewers.

## Current State

The initial hackathon layout and core feature structure exist, backed by an in-memory mock data backend. No real persistent database or authentication systems are tied to the UI. The application uses `Vite`, `React`, `TypeScript`, `Tailwind CSS`, and `lucide-react` for the overall UI framework.

## Core Features Implemented

- **Backend & Data Integration**
  - EESZT-compliant mock SQLite database (`mesh_clinical.db`) mapped to strict Pydantic models.
  - Robust synthetic data generation via `seed.py` for testing medical records (Patients, Doctors, Documents).
  - Synthetic clinical transcripts and metadata fixtures in `backend/data/synthetic_transcripts/` for pipeline validation.
  - Direct integration between the React frontend and local backend endpoints for patient context and history.

- **Provider Dashboard**
  - Select appointments to view clinical documents.
  - Dictate audio via the Voice Recorder tab, featuring animated durations and state management.
  - Automatically transcribe voice input using a simulated AI system into Draft Notes.
  - Convert combined transcribed and manual text into real PDF reports using `jspdf`.
  - Provide fallback or original file views spanning `.md` text structures via `react-markdown` and raw `.pdf` blob streams.
  - Allow medical document file uploads, strictly regulated to portable documents directly.

- **Patient Dashboard**
  - Navigate between existing generated PDF/Markdown reports or engage with an AI conversational assistant placeholder.

## Development

```sh
npm install
npm run dev
```

Build for production using:
```sh
npm run build
```

## Maintenance & Compliance

The codebase attempts to maintain `GUIDELINES.md` rules by storing credentials loosely from version control files via `.env` files conceptually, retaining modular React structure natively, and refraining strictly from informal emotional tags universally.

## Standard Request/Response Schema

The backend provides an orchestrated endpoint for end-to-end clinical processing.

### Post Consultation (`/api/v1/generate-consultation`)
Takes a medical audio recording and builds a full report by fetching context from the DB and running the LLM pipeline.

**Request (Multipart Form-Data)**
| Field | Type | Description |
|---|---|---|
| `audio` | `File (WAV)` | Mono WAV file, 16kHz recommended. |
| `patient_id` | `String` | Patient identifier for DB context fetching. |
| `doctor_id` | `String` | Doctor identifier for DB context fetching. |
| `encounter_date` | `ISO8601 String` | Date and time of the encounter. |
| `format_id` | `String` | Document generation template (default: `fmt_001`). |

**Response (JSON)**
```json
{
  "medical_report_pdf_url": "string (URL to generated PDF)",
  "patient_summary_md": "string (Markdown content)",
  "administrative_metadata": {
    "patient_id": "string",
    "doctor_id": "string",
    "encounter_date": "ISO8601 String",
    "format_id": "string"
  }
}
```

## Module: Orchestrator
The `OrchestratorService` manages the workflow:
1.  **Ingestion**: Receives audio and minimal identifiers.
2.  **Parallel Execution**:
    *   **Transcription**: Azure Speech (Diarized).
    *   **Context Retrieval**: DB fetches for patient history, context docs, and available doctor categories (PII-free).
3.  **Intelligence**: Zero-Hallucination LLM Pipeline (Presidio Scrubbing + Context Injection + PII-Free Patient Summary Generation).
4.  **Generation**: WeasyPrint generates SOAP-mapped PDF/MD reports.

## Installation & Setup

1.  **Backend Dependencies**:
    ```bash
    cd backend
    uv sync
    ```
2.  **Environment Variables**:
    Create a `.env` in the root with:
    ```env
    OPENAI_API_KEY=...
    SPEECH_KEY=...
    SERVICE_REGION=...
    ```
3.  **Seed Database**:
    ```bash
    export PYTHONPATH=$(pwd)
    python app/seed.py
    ```
4.  **Run API**:
    ```bash
    python -m uvicorn app.main:app --reload
    ```
