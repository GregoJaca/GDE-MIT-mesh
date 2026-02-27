# MediCore Provider Portal - React + TypeScript + Vite

This application provides a comprehensive UI and layout for medical providers and their patients. It supports dashboard views spanning clinical appointments, medical report generation, AI-powered medical voice scribing, and document viewers.

## Current State

The initial hackathon layout and core feature structure exist, backed by an in-memory mock data backend. No real persistent database or authentication systems are tied to the UI. The application uses `Vite`, `React`, `TypeScript`, `Tailwind CSS`, and `lucide-react` for the overall UI framework.

## Core Features Implemented

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
