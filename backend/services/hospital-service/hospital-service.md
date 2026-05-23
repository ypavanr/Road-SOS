# Hospital Service

**Port:** `8001`

Finds and ranks nearby emergency medical and safety facilities from a given GPS coordinate. Returns hospitals, trauma centers, police stations, ambulance services, and fire stations with full contact details and driving ETAs.

**Data sources:** OpenStreetMap via Overpass API (primary), SQLite cache (offline fallback), optional ABDM Health Facility Registry (India govt).

## Prerequisites

- Python 3.10+

## First-time Setup

**macOS / Linux / zsh:**
```bash
cd backend/services/hospital-service
bash setup.sh
```

**Windows (PowerShell):**
```powershell
cd backend\services\hospital-service
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
mkdir -p cache
```

This creates a virtual environment, installs dependencies, and creates the `cache/` directory.

## Run

**macOS / Linux / zsh:**
```bash
cd backend/services/hospital-service
source venv/bin/activate
python main.py
```

**Windows (PowerShell):**
```powershell
cd backend\services\hospital-service
venv\Scripts\Activate.ps1
python main.py
```

The service starts on `http://0.0.0.0:8001`.

## Test

**Health check:**
```bash
curl http://localhost:8001/health
# → {"status":"ok","service":"hospital-service"}
```

**Find nearby facilities** (replace lat/lon with your location):
```bash
curl -s -X POST http://localhost:8001/nearby \
  -H "Content-Type: application/json" \
  -d '{"lat": 12.9716, "lon": 77.5946, "radius_m": 10000}' \
  | python3 -m json.tool
```

Expected response: list of hospitals, police stations, trauma centers sorted by driving ETA, each with `name`, `type`, `distance_km`, `eta_text`, `contact`, `address`.

**Force a fresh fetch** (bypass cache):
```bash
curl -s -X POST http://localhost:8001/nearby \
  -H "Content-Type: application/json" \
  -d '{"lat": 12.9716, "lon": 77.5946, "radius_m": 10000, "force_refresh": true}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('total:', d['total'], '| cached:', d['cached'])"
```

## API Reference

### `POST /nearby`

| Field | Type | Default | Description |
|---|---|---|---|
| `lat` | float | required | User latitude |
| `lon` | float | required | User longitude |
| `radius_m` | int | 10000 | Search radius in metres (max 20 000) |
| `force_refresh` | bool | false | Bypass cache and re-query Overpass |

**Facility types returned:** `hospital`, `trauma_center`, `clinic`, `police`, `ambulance`, `fire_station`

## Environment Variables

See `.env.example` for all options. Key variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8001` | Listening port |
| `CACHE_TTL_SECONDS` | `3600` | How long cached results stay fresh |
| `OSRM_BASE_URL` | public OSRM | Routing engine for ETAs |
| `ABDM_ENABLED` | `false` | Enable India govt hospital registry |
| `ABDM_ACCESS_TOKEN` | — | Bearer token (register at abdm.gov.in) |

## Shared Dependencies

This service imports `models`, `routing`, `cache`, `overpass_base`, and `utils` from `backend/shared/`. Changes to those files require a service restart.
