# MediCore Provider Portal - React + TypeScript + Vite

This application provides a comprehensive UI and layout for medical providers and their patients. It supports dashboard views spanning clinical appointments, medical report generation, AI-powered medical voice scribing, and document viewers.

## Current State

The initial hackathon layout and core feature structure exist, backed by an in-memory mock data backend. No real persistent database or authentication systems are tied to the UI. The application uses `Vite`, `React`, `TypeScript`, `Tailwind CSS`, and `lucide-react` for the overall UI framework.

## Core Features Implemented

- **Backend & Data Integration**
  - EESZT-compliant mock SQLite database (`eeszt_mock.db`) mapped to strict Pydantic models.
  - Robust synthetic data generation via `seed.py` for testing medical records (Patients, Doctors, Documents).
  - Direct integration between the React frontend and local backend endpoints for patient context.

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

# GDE MIT Mesh

## Application
This project is responsible for processing patient records and generating beautifully designed medical PDF documents.

## Module: Report Generator

The `report_generator` module operates with flexible Jinja2 templating mapped to specific Report Formats via `config/formats.json`. WeasyPrint converts the rendered HTML document cleanly into PDF.

### Available Formats
1. SOAP Note (`fmt_001`)
2. History & Physical (`fmt_002`)
3. Discharge Summary (`fmt_003`)
4. Consultation Report (`fmt_004`)
5. Operative / Procedure Note (`fmt_005`)

### Usage

```bash
# General Usage
python report_generator/generate_report.py path/to/patient.json --format fmt_001 --output SOAP_123.pdf

# Interactive CLI Menu
python report_generator/generate_report.py
```

## Module: Transcriber
The `transcriber` module uses Azure Cognitive Services Speech SDK to take a medical audio recording (WAV) and convert it into a structured speaker-diarized text transcript. 

### Configuration
You must configure your `.env` file with your Azure credentials before using this module:
```env
SPEECH_KEY=your_azure_speech_key_here
SERVICE_REGION=your_azure_region_here
```

### Usage
Run the following command against an audio file (Must be 16kHz, 16-bit, Mono WAV file for best results):
```bash
python transcriber/transcribe.py path/to/audio/test.wav
```
