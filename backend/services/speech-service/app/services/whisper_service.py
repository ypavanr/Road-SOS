import whisper
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Initialize globally at startup
model = None

def load_whisper_model():
    global model
    if model is None:
        logger.info("Loading Whisper 'base' model...")
        model = whisper.load_model("base")
        logger.info("Whisper model loaded successfully.")

def transcribe_with_whisper(file_path: str) -> Dict[str, Any]:
    global model
    if model is None:
        load_whisper_model()
    
    logger.info(f"Transcribing {file_path} with Whisper fallback...")
    
    # transcribe() uses ffmpeg under the hood
    result = model.transcribe(file_path)
    
    text = result.get("text", "").strip()
    language = result.get("language", "unknown")
    
    # Filter out common Whisper hallucinations for silence/background noise
    hallucinations = ["yes", "yes.", "yeah", "yeah.", "thank you.", "thank you", "you.", "you", "mhm.", "mhm"]
    if text.lower() in hallucinations:
        logger.info(f"Filtered out likely hallucinated text: '{text}'")
        text = ""
    
    return {
        "success": True,
        "provider": "whisper",
        "language": language,
        "text": text
    }
