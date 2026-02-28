"""
Lightweight transcription server — wraps transcribe.py as an HTTP endpoint.
Run:  python server.py
Listens on http://localhost:8000 by default.
"""

import os
import sys
import json
import tempfile
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Load .env manually (no pip dependency needed)
def load_env(path):
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                os.environ.setdefault(key, value)

load_env(str(Path(__file__).resolve().parent.parent / ".env"))

from transcribe import transcribe_file_with_diarization

PORT = int(os.getenv("TRANSCRIBE_SERVER_PORT", "8000"))


class TranscribeHandler(BaseHTTPRequestHandler):
    """Handles POST /api/v1/transcribe with multipart audio upload."""

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/v1/transcribe":
            self._json_response(404, {"error": "Not found"})
            return

        try:
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in content_type:
                self._json_response(400, {"error": "Expected multipart/form-data"})
                return

            # Parse the multipart boundary
            boundary = content_type.split("boundary=")[-1].strip()
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)

            # Extract the file data from the multipart body
            file_data = self._extract_file(body, boundary.encode())
            if not file_data:
                self._json_response(400, {"error": "No audio file found in request"})
                return

            # Save to temp file
            tmp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
            tmp_input.write(file_data)
            tmp_input.close()

            audio_path = tmp_input.name

            # Try converting WebM → WAV for Azure (needs pydub + ffmpeg)
            tmp_wav_path = None
            try:
                from pydub import AudioSegment
                audio = AudioSegment.from_file(tmp_input.name)
                audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
                tmp_wav = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
                tmp_wav.close()
                tmp_wav_path = tmp_wav.name
                audio.export(tmp_wav_path, format="wav")
                audio_path = tmp_wav_path
                print(f"[server] Converted to WAV: {audio_path}")
            except ImportError:
                print("[server] pydub not installed — sending raw file to Azure")
            except Exception as e:
                print(f"[server] Audio conversion failed ({e}), trying raw file")

            # Run real transcription
            print(f"[server] Starting transcription for: {audio_path}")
            transcript_lines = transcribe_file_with_diarization(audio_path)

            # Clean up temp files
            try:
                os.unlink(tmp_input.name)
                if tmp_wav_path and os.path.exists(tmp_wav_path):
                    os.unlink(tmp_wav_path)
            except Exception:
                pass

            if not transcript_lines:
                self._json_response(200, {"transcript": "(No speech detected in recording)"})
                return

            self._json_response(200, {"transcript": "\n".join(transcript_lines)})

        except Exception as e:
            traceback.print_exc()
            self._json_response(500, {"detail": f"Transcription failed: {str(e)}"})

    def _extract_file(self, body: bytes, boundary: bytes) -> bytes | None:
        """Extract file content from a multipart/form-data body."""
        parts = body.split(b"--" + boundary)
        for part in parts:
            if b"filename=" in part:
                # Find where the headers end and file content begins
                header_end = part.find(b"\r\n\r\n")
                if header_end == -1:
                    continue
                file_content = part[header_end + 4:]
                # Remove trailing \r\n-- if present
                if file_content.endswith(b"\r\n"):
                    file_content = file_content[:-2]
                if file_content.endswith(b"--"):
                    file_content = file_content[:-2]
                if file_content.endswith(b"\r\n"):
                    file_content = file_content[:-2]
                return file_content
        return None

    def _json_response(self, status: int, data: dict):
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")


def main():
    server = HTTPServer(("0.0.0.0", PORT), TranscribeHandler)
    print(f"[server] Transcription server running on http://localhost:{PORT}")
    print(f"[server] Endpoint: POST http://localhost:{PORT}/api/v1/transcribe")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[server] Shutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
