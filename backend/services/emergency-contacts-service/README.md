# Emergency Contacts Service

**Port:** `8003`

Returns static India emergency numbers (112, 100, 101, 108, 1033, etc.) as a structured list of quick-dial contacts. Optionally uses Nominatim reverse geocoding to append state-specific numbers based on the caller's location.

No database, no Overpass queries — starts instantly.

## Prerequisites

- Python 3.10+

## First-time Setup

```bash
cd backend/services/emergency-contacts-service
bash setup.sh
```

## Run

```bash
cd backend/services/emergency-contacts-service
source .venv/bin/activate
python main.py
```

The service starts on `http://0.0.0.0:8003`.

## Test

**Health check:**
```bash
curl http://localhost:8003/health
# → {"status":"ok","service":"emergency-contacts-service"}
```

**All India numbers (no location):**
```bash
curl -s http://localhost:8003/contacts | python3 -m json.tool
```

**With location (adds state-specific numbers):**
```bash
curl -s "http://localhost:8003/contacts?lat=12.9716&lon=77.5946" | python3 -m json.tool
```

Expected response: list of contacts with `name`, `number`, `type`, `description`. State field shows which state was detected (e.g. `"Karnataka"`).

## API Reference

### `GET /contacts`

| Query param | Type | Required | Description |
|---|---|---|---|
| `lat` | float | no | User latitude — triggers state detection |
| `lon` | float | no | User longitude — triggers state detection |

**Contact types returned:** `emergency`, `police`, `ambulance`, `fire`, `highway`, `women`, `child`, `disaster`, `medical`

## Adding More Numbers

Edit `data/contacts.json`. Structure:

```json
{
  "IN": {
    "national": [ { "name": "...", "number": "...", "type": "...", "description": "..." } ],
    "states": {
      "Karnataka": [ { ... } ]
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8003` | Listening port |
