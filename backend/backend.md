# Backend — Road SOS

Python microservices built with FastAPI. Each service runs independently on its own port and can be started without the others.

## Services

| Service | Port | Status | Description |
|---|---|---|---|
| `hospital-service` | 8001 | ✅ Ready | Hospitals, trauma centers, police, ambulance, fire stations |
| `roadside-service` | 8002 | ✅ Ready | Towing, tyre shops, car repair, fuel stations, showrooms |
| `emergency-contacts-service` | 8003 | ✅ Ready | Emergency numbers for all Indian states + global countries |
| `classifier-service` | 8004 | ✅ Ready | AI triage — classifies emergency type from text/speech (Groq LLM + rule fallback) |
| `notification-service` | 8005 | 🔲 Planned | Push, SMS, and email alerts |
| `speech-service` | 8006 | ✅ Ready | Speech-to-text transcription (Sarvam AI + Whisper fallback) |
| `api-gateway` | 8000 | ✅ Ready | Single entry point — routes all frontend requests to microservices |

## Running All Services

Open a **separate terminal for each service**:

### macOS / Linux / zsh

```bash
# Terminal 1 — hospital-service
cd backend/services/hospital-service && source .venv/bin/activate && python main.py

# Terminal 2 — roadside-service
cd backend/services/roadside-service && source .venv/bin/activate && python main.py

# Terminal 3 — emergency-contacts-service
cd backend/services/emergency-contacts-service && source .venv/bin/activate && python main.py

# Terminal 4 — classifier-service
cd backend/services/classifier-service && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8004

# Terminal 5 — speech-service
cd backend/services/speech-service && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8006

# Terminal 6 — api-gateway  ← start this last
cd backend/api-gateway && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000
```

> **Shortcut (macOS only):** From the project root, run `./start_services.sh` to launch everything at once.

### Windows (PowerShell)

Open each in a **new PowerShell window**:

```powershell
# Terminal 1 — hospital-service
cd backend\services\hospital-service; .venv\Scripts\Activate.ps1; python main.py

# Terminal 2 — roadside-service
cd backend\services\roadside-service; .venv\Scripts\Activate.ps1; python main.py

# Terminal 3 — emergency-contacts-service
cd backend\services\emergency-contacts-service; .venv\Scripts\Activate.ps1; python main.py

# Terminal 4 — classifier-service
cd backend\services\classifier-service; venv\Scripts\Activate.ps1; uvicorn app.main:app --host 0.0.0.0 --port 8004

# Terminal 5 — speech-service
cd backend\services\speech-service; venv\Scripts\Activate.ps1; uvicorn app.main:app --host 0.0.0.0 --port 8006

# Terminal 6 — api-gateway  ← start this last
cd backend\api-gateway; venv\Scripts\Activate.ps1; uvicorn main:app --host 0.0.0.0 --port 8000
```

> **Note (Windows):** If you get a script execution error, run this once in PowerShell as Administrator:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## Quick Health Check (all services)

**macOS / Linux / zsh:**
```bash
for port in 8000 8001 8002 8003 8004 8006; do
  echo -n "Port $port: "
  curl -s http://localhost:$port/health
  echo
done
```

**Windows (PowerShell):**
```powershell
foreach ($port in @(8000, 8001, 8002, 8003, 8004, 8006)) {
  Write-Host "Port ${port}: " -NoNewline
  curl -s http://localhost:$port/health
  Write-Host ""
}
```

## Shared Package

`backend/shared/` contains modules imported by all services (`models`, `routing`, `cache`, `overpass_base`, `utils`). It is not installed — each service adds it to `sys.path` at startup. See `backend/shared/shared.md` for details.

## Structure

```
backend/
├── shared/                        # Shared Python package
│   ├── models.py
│   ├── overpass_base.py
│   ├── routing.py
│   ├── cache.py
│   └── utils.py
├── services/
│   ├── hospital-service/          # Port 8001
│   ├── roadside-service/          # Port 8002
│   ├── emergency-contacts-service/ # Port 8003
│   ├── classifier-service/        # Planned
│   ├── speech-service/            # Planned
│   ├── location-service/          # Planned
│   └── notification-service/      # Planned
└── api-gateway/                   # Planned
```
