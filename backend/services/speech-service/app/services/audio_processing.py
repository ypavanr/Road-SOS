import os
from fastapi import HTTPException

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg"}

def validate_audio_file(filename: str):
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {ext}. Allowed formats are: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    return True

def get_safe_filepath(upload_dir: str, filename: str) -> str:
    safe_filename = os.path.basename(filename)
    return os.path.join(upload_dir, safe_filename)
