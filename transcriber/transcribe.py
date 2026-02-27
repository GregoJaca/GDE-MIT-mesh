import azure.cognitiveservices.speech as speechsdk
import time
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # env vars already loaded by server.py or set externally

def transcribe_file_with_diarization(audio_file_path):
    """
    Transcribes an audio file and identifies distinct speakers (Diarization) using Azure Speech Services.
    """
    speech_key = os.getenv("SPEECH_KEY")
    service_region = os.getenv("SERVICE_REGION")
    
    if not speech_key or not service_region:
        print("Error: Azure credentials (SPEECH_KEY and SERVICE_REGION) are missing in the .env file.")
        return []

    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
    speech_config.speech_recognition_language = "en-US" 

    if not os.path.exists(audio_file_path):
        print(f"Error: Audio file not found at {audio_file_path}")
        return []

    # Change from default microphone to an audio file
    audio_config = speechsdk.audio.AudioConfig(filename=audio_file_path)
    transcriber = speechsdk.transcription.ConversationTranscriber(speech_config=speech_config, audio_config=audio_config)

    print(f"Processing audio file: {audio_file_path}...")
    transcripts = []
    
    # Setup a flag to keep the program running until the file is fully processed
    transcription_done = False

    def handle_transcribed(evt):
        if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
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
        
        nonlocal transcription_done
        transcription_done = True

    # When Azure hits the end of the audio file, it fires this event
    def handle_session_stopped(evt):
        print('\n--- SESSION STOPPED (End of File) ---')
        nonlocal transcription_done
        transcription_done = True

    transcriber.transcribed.connect(handle_transcribed)
    transcriber.canceled.connect(handle_canceled)
    transcriber.session_started.connect(lambda evt: print('\n--- SESSION STARTED ---'))
    transcriber.session_stopped.connect(handle_session_stopped)
    
    transcriber.start_transcribing_async()
    
    # Wait here while the background thread processes the file
    while not transcription_done:
        time.sleep(0.5)
        
    # Clean up the transcriber
    transcriber.stop_transcribing_async()
        
    print("\n--- Final Structured Transcript ---")
    for entry in transcripts:
        print(entry)
        
    return transcripts

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Transcribe an audio file using Azure Speech Services (with Speaker Diarization)")
    parser.add_argument("audio_file", help="Path to the audio file (16kHz, 16-bit, Mono WAV file for best results)")
    args = parser.parse_args()

    transcribe_file_with_diarization(args.audio_file)
