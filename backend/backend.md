# Backend — Road SOS

Python microservices built with FastAPI. Each service runs independently on its own port and can be started without the others.

## Services

| Service | Port | Status | Description |
|---|---|---|---|
| `hospital-service` | 8001 | ✅ Ready | Hospitals, trauma centers, police, ambulance, fire stations |
| `roadside-service` | 8002 | ✅ Ready | Towing, tyre shops, car repair, fuel stations |
| `emergency-contacts-service` | 8003 | ✅ Ready | Static India emergency numbers (112, 100, 108, 1033…) |
| `classifier-service` | TBD | 🔲 Planned | Classifies emergency type from text/speech |
| `speech-service` | TBD | 🔲 Planned | Speech-to-text transcription |
| `location-service` | 8004 | 🔲 Planned | Live location tracking and sharing |
| `notification-service` | 8005 | 🔲 Planned | Push, SMS, and email alerts |
| `api-gateway` | 8000 | 🔲 Planned | Single entry point, routing, auth |

## Running All Ready Services

Open **three separate terminals**:

```bash
# Terminal 1 — hospital-service
cd backend/services/hospital-service
bash setup.sh          # first time only
source .venv/bin/activate
python main.py

# Terminal 2 — roadside-service
cd backend/services/roadside-service
bash setup.sh          # first time only
source .venv/bin/activate
python main.py

# Terminal 3 — emergency-contacts-service
cd backend/services/emergency-contacts-service
bash setup.sh          # first time only
source .venv/bin/activate
python main.py
```

## Quick Health Check (all at once)

```bash
for port in 8001 8002 8003; do
  echo -n "Port $port: "
  curl -s http://localhost:$port/health
  echo
done
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
