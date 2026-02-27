import azure.cognitiveservices.speech as speechsdk
import time
import os
from dotenv import load_dotenv

load_dotenv()

def transcribe_with_diarization():
    speech_key = os.getenv("SPEECH_KEY")
    service_region = os.getenv("SERVICE_REGION")
    
    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
    
    # Explicitly define the language. This is crucial for ConversationTranscriber to not fail silently.
    speech_config.speech_recognition_language = "en-US" 

    audio_config = speechsdk.audio.AudioConfig(use_default_microphone=True)
    transcriber = speechsdk.transcription.ConversationTranscriber(speech_config=speech_config, audio_config=audio_config)

    print("Listening for multiple voices... (Press Ctrl+C to stop)")
    transcripts = []

    def handle_transcribed(evt):
        if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
            # Skip empty audio pickups (like breathing or mic static)
            if not evt.result.text.strip():
                return
                
            speaker = evt.result.speaker_id 
            text = evt.result.text
            line = f"[{speaker}]: {text}"
            print(line)
            transcripts.append(line)

    def handle_canceled(evt):
        print(f"\n[ERROR] Transcription Canceled: {evt.reason}")
        if evt.reason == speechsdk.CancellationReason.Error:
            print(f"Error Details: {evt.error_details}")

    transcriber.transcribed.connect(handle_transcribed)
    transcriber.canceled.connect(handle_canceled)
    transcriber.session_started.connect(lambda evt: print('\n--- SESSION STARTED ---'))
    transcriber.session_stopped.connect(lambda evt: print('\n--- SESSION STOPPED ---'))
    
    transcriber.start_transcribing_async()
    
    try:
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopping transcription...")
        transcriber.stop_transcribing_async()
        time.sleep(2) # Give it time to finish processing the last audio chunk
        
    print("\n--- Final Structured Transcript ---")
    for entry in transcripts:
        print(entry)

if __name__ == "__main__":
    transcribe_with_diarization()