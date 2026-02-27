# TODO

- [x] Extract reporting formatting configuration into `.json` map (done)
- [x] Create Beautiful HTML Templates for PDF reports (done - SOAP, H&P, Discharge, Consult, Op Note)
- [x] Create Python generator (`generate_report.py`) utilizing `WeasyPrint` & `jinja2` (done)
- [ ] Connect `generate_report` to main pipeline workflow (placeholder)
- [ ] Add rigorous unit testing (missing)

## Transcriber Module
- [x] Configure Azure Speech SDK for speaker diarization (done)
- [x] Create modular `transcriber/transcribe.py` (done)
- [ ] Integrate transcription logic with parsing pipeline (placeholder)
- [ ] Connect transcriber and report generator to frontend.
