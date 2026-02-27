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
