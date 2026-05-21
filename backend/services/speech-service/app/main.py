from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import speech
from app.services.whisper_service import load_whisper_model
import logging
import os

# Dynamically inject FFmpeg path so we don't need a VSCode/system restart
ffmpeg_path = r"C:\Users\sanga\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin"
if ffmpeg_path not in os.environ.get("PATH", ""):
    os.environ["PATH"] += os.pathsep + ffmpeg_path

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
