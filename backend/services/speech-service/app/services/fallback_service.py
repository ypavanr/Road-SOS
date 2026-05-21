import logging
from typing import Dict, Any
from app.services.sarvam_service import transcribe_with_sarvam
from app.services.whisper_service import transcribe_with_whisper
from app.services.language_detector import normalize_language_code

logger = logging.getLogger(__name__)

def transcribe_audio(file_path: str) -> Dict[str, Any]:
    """
    Attempts to transcribe with Sarvam AI first.
    If it fails, automatically falls back to local Whisper.
    """
    try:
        logger.info("Attempting Sarvam AI transcription...")
        result = transcribe_with_sarvam(file_path)
        
        # Normalize language code
        result["language"] = normalize_language_code(result.get("language", "en"))
        return result
        
    except Exception as e:
        logger.warning(f"Sarvam AI failed: {str(e)}. Falling back to Whisper...")
        
        try:
            result = transcribe_with_whisper(file_path)
            
            # Normalize language code
            result["language"] = normalize_language_code(result.get("language", "en"))
            return result
            
        except Exception as whisper_e:
            logger.error(f"Whisper fallback failed: {str(whisper_e)}")
            return {
                "success": False,
                "error": "Unable to transcribe audio. Both Sarvam AI and Whisper fallback failed."
            }
