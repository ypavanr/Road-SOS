# Shared Package

Common Python modules used by all backend services. Lives at `backend/shared/` and is added to each service's `sys.path` at startup — no install step needed.

## Modules

| File | What it provides |
|---|---|
| `models.py` | Pydantic models: `Facility`, `Address`, `ContactInfo`, `NearbyRequest`, `NearbyResponse`, `EmergencyContact`, `EmergencyContactsResponse` |
| `overpass_base.py` | Overpass API HTTP client with mirror fallback, OSM tag parsers (`parse_address`, `parse_contact`, `extract_lat_lon`, `build_query`) |
| `routing.py` | OSRM Table API for batch driving ETAs + haversine fallback at 40 km/h |
| `cache.py` | `FacilityCache` class — SQLite-backed cache with TTL and offline stale serving |
| `utils.py` | `deduplicate_by_proximity` — removes OSM node/way duplicates within 60 m |

## How Services Use It

Each service's `main.py` inserts the shared path before any imports:

```python
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../shared')))
```

After that, modules import as if they were local:

```python
from models import Facility, NearbyRequest
from routing import haversine_km, compute_etas
from cache import FacilityCache
from utils import deduplicate_by_proximity
```

## Adding a New Service

1. Create `backend/services/your-service/main.py` with the `sys.path.insert` block above.
2. Define service-specific Overpass queries in `services/overpass.py`, importing helpers from `overpass_base`.
3. Instantiate `FacilityCache` in the lifespan handler.
4. Follow the same `requirements.txt` and `setup.sh` pattern as existing services.

## Changing Shared Code

Uvicorn's `--reload` watches each service's own directory only. To watch shared files too, each service's `main.py` passes `reload_dirs=[".", "../../shared"]` to `uvicorn.run`. Any edit to a shared file will trigger a reload of all running services automatically.
