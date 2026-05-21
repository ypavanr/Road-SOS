import os
import shutil
import uuid
import subprocess
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.audio_processing import validate_audio_file, get_safe_filepath
from app.services.fallback_service import transcribe_audio

router = APIRouter()

UPLOAD_DIR = "app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    validate_audio_file(file.filename)
    
    # Generate unique filename to avoid collisions
    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = get_safe_filepath(UPLOAD_DIR, unique_filename)
    
    try:
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Convert to WAV using ffmpeg to ensure compatibility with Sarvam and Whisper
        wav_filename = f"{uuid.uuid4().hex}.wav"
        wav_file_path = get_safe_filepath(UPLOAD_DIR, wav_filename)
        
        try:
            subprocess.run([
                "ffmpeg", "-y", "-i", file_path,
                "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
                wav_file_path
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            # If conversion fails, proceed with original file (maybe Whisper can handle it)
            wav_file_path = file_path

        # Call orchestration service
        result = transcribe_audio(wav_file_path)
        
        if not result.get("success"):
            # Return 500 but still structured as requested
            return result
            
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        return {
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }
    finally:
        # Cleanup files after processing
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        if 'wav_file_path' in locals() and wav_file_path != file_path and os.path.exists(wav_file_path):
            try:
                os.remove(wav_file_path)
            except Exception:
                pass
            try:
                os.remove(file_path)
            except Exception:
                pass
