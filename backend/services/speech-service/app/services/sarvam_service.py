import requests
import logging
from typing import Dict, Any
from app.config.settings import SARVAM_API_KEY, SARVAM_API_URL

logger = logging.getLogger(__name__)

def transcribe_with_sarvam(file_path: str) -> Dict[str, Any]:
    if not SARVAM_API_KEY:
        raise ValueError("SARVAM_API_KEY is not set.")
    
    logger.info(f"Transcribing {file_path} with Sarvam AI...")
    
    headers = {
        "api-subscription-key": SARVAM_API_KEY
    }
    
    with open(file_path, "rb") as audio_file:
        files = {
            "file": (file_path, audio_file, "audio/wav")
        }
        
        # We specify prompt or model if required by Sarvam API. 
        # By default Sarvam Speech-to-Text-Translate translates regional to English.
        data = {
            "model": "saaras:v2.5"
        }
        
        try:
            response = requests.post(
                SARVAM_API_URL,
                headers=headers,
                files=files,
                data=data,
                timeout=15 # 15 seconds timeout
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Extract transcript from Sarvam's response
            text = result.get("transcript", "")
            language = result.get("language_code", "en") # Adjust based on actual API
            
            if not text:
                raise Exception("Empty transcript from Sarvam AI")
                
            return {
                "success": True,
                "provider": "sarvam",
                "language": language,
                "text": text
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Sarvam API error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Sarvam Transcription error: {str(e)}")
            raise
