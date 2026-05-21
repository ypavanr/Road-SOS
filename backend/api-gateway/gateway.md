# API Gateway

**Port:** `8000`  
**Status:** ✅ Implemented

Single entry point for all frontend requests. Routes to microservices, aggregates responses, and shields direct service exposure.

---

## Architecture

```
Frontend (Expo)
      │
      ▼
 API Gateway :8000
      │
      ├─ POST /nearby/medical    → hospital-service      :8001
      ├─ POST /nearby/roadside   → roadside-service      :8002
      ├─ GET  /contacts          → emergency-contacts    :8003
      ├─ POST /classify          → classifier-service    :8004
      └─ POST /transcribe        → speech-service        :8006
```

---

## Setup & Run

**macOS / Linux / zsh:**
```bash
cd backend/api-gateway
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Windows (PowerShell):**
```powershell
cd backend\api-gateway
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Port to bind on |
| `HOSPITAL_SERVICE_URL` | `http://localhost:8001` | Hospital service URL |
| `ROADSIDE_SERVICE_URL` | `http://localhost:8002` | Roadside service URL |
| `CONTACTS_SERVICE_URL` | `http://localhost:8003` | Emergency contacts URL |
| `CLASSIFIER_SERVICE_URL` | `http://localhost:8004` | Classifier service URL |
| `SPEECH_SERVICE_URL` | `http://localhost:8006` | Speech service URL |

---

## Health Check

```bash
curl http://localhost:8000/health
# → {"status":"ok","service":"api-gateway"}
```

---

## Testing All Routes

### 1. Classify an Emergency Prompt
```bash
curl -X POST http://localhost:8000/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "I had a car accident and I am bleeding."}'
```

### 2. Fetch Nearby Medical Facilities
```bash
curl -X POST http://localhost:8000/nearby/medical \
  -H "Content-Type: application/json" \
  -d '{"lat": 12.9716, "lon": 77.5946, "radius_m": 5000}'
```

### 3. Fetch Nearby Roadside Facilities
```bash
curl -X POST http://localhost:8000/nearby/roadside \
  -H "Content-Type: application/json" \
  -d '{"lat": 12.9716, "lon": 77.5946, "radius_m": 5000}'
```

### 4. Fetch Emergency Contacts (auto-detects country from GPS)
```bash
curl "http://localhost:8000/contacts?lat=12.9716&lon=77.5946"
```

### 5. Transcribe an Audio File
```bash
curl -X POST http://localhost:8000/transcribe \
  -F "file=@/path/to/your/audio.m4a"
```

---

## Interactive API Docs

Once the gateway is running, open:  
`http://localhost:8000/docs`
