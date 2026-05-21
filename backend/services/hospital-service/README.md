# Hospital Service

Finds and ranks nearby emergency facilities (hospitals, trauma centers, police stations, ambulance services, fire stations) from a user's GPS coordinates. Returns full contact details, address, and driving ETA for each facility.

## Data Sources

| Source | What it provides |
|---|---|
| OpenStreetMap / Overpass API | Primary: hospitals, police, ambulance, fire stations with tags |
| OSRM (routing engine) | Driving ETA via Table API (1 batch request per call) |
| Local SQLite cache | Offline fallback; serves stale data when APIs are unavailable |
| ABDM HFR (optional) | India govt hospital registry — requires Bearer token |

## Setup & Run

**macOS / Linux / zsh:**
```bash
cd backend/services/hospital-service
bash setup.sh
source .venv/bin/activate
python main.py
```

**Windows (PowerShell):**
```powershell
cd backend\services\hospital-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
mkdir -p cache
python main.py
```

Service starts on `http://0.0.0.0:8001`.

## API

### `GET /health`
Returns `{"status": "ok"}`.

### `POST /nearby`
Find nearby emergency facilities.

**Request body:**
```json
{
  "lat": 12.9716,
  "lon": 77.5946,
  "radius_m": 10000,
  "force_refresh": false
}
```

**Response:**
```json
{
  "facilities": [
    {
      "id": "osm:node:123456",
      "name": "Victoria Hospital",
      "type": "hospital",
      "lat": 12.968,
      "lon": 77.571,
      "address": {
        "street": "Fort Rd",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postcode": "560002",
        "country": "IN",
        "full": "Fort Rd, Bengaluru, Karnataka, 560002, IN"
      },
      "contact": {
        "phone": "+91-80-2670-1150",
        "email": null,
        "website": null
      },
      "distance_km": 1.4,
      "eta_minutes": 4.2,
      "eta_text": "4 min",
      "emergency": true,
      "beds": 1300,
      "specialties": ["trauma", "neurology"]
    }
  ],
  "total": 14,
  "cached": false,
  "lat": 12.9716,
  "lon": 77.5946,
  "radius_m": 10000
}
```

**Facility types:** `hospital`, `trauma_center`, `clinic`, `police`, `ambulance`, `fire_station`

## Caching

- SQLite at `cache/hospital_cache.db`
- Cache key: grid-rounded lat/lon (~1 km) + radius
- TTL: 1 hour (fresh) / 24 hours (stale, served offline)
- `force_refresh: true` bypasses cache

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8001` | Port to listen on |
| `CACHE_DB_PATH` | `cache/hospital_cache.db` | SQLite file path |
| `CACHE_TTL_SECONDS` | `3600` | Cache freshness window |
| `MAX_ROUTING_BATCH` | `30` | Max facilities per OSRM request |
| `OSRM_BASE_URL` | `http://router.project-osrm.org` | OSRM instance |
| `OVERPASS_TIMEOUT` | `30` | Overpass API timeout (seconds) |
| `ABDM_ENABLED` | `false` | Enable ABDM HFR integration |
| `ABDM_ACCESS_TOKEN` | — | Bearer token for ABDM API |
