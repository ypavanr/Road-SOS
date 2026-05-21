# Speech Service

**Port:** `8006`

A multilingual voice-to-text microservice designed for emergency situations. It converts user-recorded audio (from the mobile app) into transcribed text. The transcribed text is intended to be passed to the classifier-service for automated emergency response mapping.

**Transcription Pipeline:**
1. **Audio Conversion**: Uses `FFmpeg` to normalize incoming `.m4a` / `.wav` files to `16000Hz, mono, PCM`.
2. **Primary Provider (Sarvam AI)**: Fast, multilingual speech-to-text optimized for Indian regional languages.
3. **Fallback Provider (OpenAI Whisper)**: Local, offline fallback utilizing the Whisper `base` model. Automatically triggers if the Sarvam API fails, rates limits, or is unconfigured.

## Prerequisites

- Python 3.10+
- **FFmpeg**: Required for audio conversion and Whisper processing.
  - Windows: Install via Winget: `winget install Gyan.FFmpeg`
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`
- (Optional) Sarvam AI API Key for fast, regional language support.

## First-time Setup

**macOS / Linux / zsh:**
```bash
cd backend/services/speech-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Windows (PowerShell):**
```powershell
cd backend\services\speech-service
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Open `.env` and add your `SARVAM_API_KEY` if you have one. If left blank, the service will gracefully fall back to the local Whisper model.

## Run

**macOS / Linux / zsh:**
```bash
cd backend/services/speech-service
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8006
```

**Windows (PowerShell):**
```powershell
cd backend\services\speech-service
venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8006
```

*Note: `--host 0.0.0.0` is required so your phone can connect over local Wi-Fi.*

## API Reference

### `POST /transcribe`

Accepts a raw audio file (`multipart/form-data`) and returns transcribed text.

| Field | Type | Description |
|---|---|---|
| `file` | File | The audio file payload (e.g., `.m4a`, `.wav`, `.mp3`). |

**Expected Response (Success):**
```json
{
  "success": true,
  "provider": "sarvam",
  "language": "en",
  "text": "I need an ambulance on Sarjapur road."
}
```

**Expected Response (Fallback):**
```json
{
  "success": true,
  "provider": "whisper",
  "language": "hi",
  "text": "Mujhe help chahiye."
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8006` | Listening port |
| `SARVAM_API_KEY` | — | Your API Key from Sarvam AI |
| `SARVAM_API_URL` | `https://api.sarvam.ai/speech-to-text-translate` | Sarvam API endpoint for Saaras v2.5 |

## Troubleshooting

- **Upload error: [TypeError: Network request failed]**: Ensure your backend is running with `--host 0.0.0.0`. Check `frontend/.env` to ensure `EXPO_PUBLIC_BASE_IP` matches your laptop's Wi-Fi IPv4 address.
- **Both Sarvam AI and Whisper fallback failed**: Ensure `ffmpeg` is installed correctly and is accessible in your system's PATH. Restart your terminal completely after installing FFmpeg.
- **Sarvam API error: 400 Bad Request**: Ensure `sarvam_service.py` is requesting the `"saaras:v2.5"` model, as `"saaras:v1"` was officially deprecated.

