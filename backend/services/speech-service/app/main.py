from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import speech
from app.services.whisper_service import load_whisper_model
import logging
import os

# Dynamically locate and inject FFmpeg path if not already in system PATH
import shutil
if not shutil.which("ffmpeg"):
    user_home = os.path.expanduser("~")
    winget_ffmpeg_dir = os.path.join(
        user_home,
        r"AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    )
    if os.path.exists(winget_ffmpeg_dir):
        for root_dir, dirs, files in os.walk(winget_ffmpeg_dir):
            if "ffmpeg.exe" in files:
                if root_dir not in os.environ.get("PATH", ""):
                    os.environ["PATH"] += os.pathsep + root_dir
                break

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Road SOS - Speech Service")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(speech.router, tags=["Speech"])

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing Speech Service...")
    # Pre-load the Whisper model globally
    try:
        load_whisper_model()
    except Exception as e:
        logger.error(f"Failed to load Whisper model on startup: {e}")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "speech-service"}
