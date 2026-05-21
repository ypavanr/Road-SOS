# Roadside Service

**Port:** `8002`

Finds nearby roadside assistance from a given GPS coordinate. Returns towing services, tyre/puncture shops, car repair workshops, and fuel stations with contact details and driving ETAs.

**Data source:** OpenStreetMap via Overpass API, SQLite cache (offline fallback).

## Prerequisites

- Python 3.10+

## First-time Setup

```bash
cd backend/services/roadside-service
bash setup.sh
```

This creates a virtual environment, installs dependencies, creates the `cache/` directory, and copies `.env.example` → `.env`.

## Run

```bash
cd backend/services/roadside-service
source .venv/bin/activate
python main.py
```

The service starts on `http://0.0.0.0:8002`.

## Test

**Health check:**
```bash
curl http://localhost:8002/health
# → {"status":"ok","service":"roadside-service"}
```

**Find nearby roadside services:**
```bash
curl -s -X POST http://localhost:8002/nearby \
  -H "Content-Type: application/json" \
  -d '{"lat": 12.9716, "lon": 77.5946, "radius_m": 5000}' \
  | python3 -m json.tool
```

Expected response: list of tyre shops, fuel stations, repair workshops sorted by driving ETA, each with `name`, `type`, `distance_km`, `eta_text`, `contact`, `address`, `specialties` (services offered).

## API Reference

### `POST /nearby`

| Field | Type | Default | Description |
|---|---|---|---|
| `lat` | float | required | User latitude |
| `lon` | float | required | User longitude |
| `radius_m` | int | 10000 | Search radius in metres (max 15 000) |
| `force_refresh` | bool | false | Bypass cache and re-query Overpass |

**Facility types returned:** `towing`, `roadside_assistance`, `tyre_shop`, `car_repair`, `fuel_station`

## Environment Variables

See `.env.example`. Key variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8002` | Listening port |
| `CACHE_TTL_SECONDS` | `3600` | Cache freshness window |
| `OSRM_BASE_URL` | public OSRM | Routing engine for ETAs |

## Shared Dependencies

Imports `models`, `routing`, `cache`, `overpass_base`, and `utils` from `backend/shared/`. Changes to those files require a service restart.
