import asyncio
import math
import os
import time
from typing import Dict, List

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

PORT = int(os.environ.get("PORT", 8005))
OSRM_BASE_URL = os.environ.get("OSRM_BASE_URL", "http://router.project-osrm.org")
CACHE_TTL = int(os.environ.get("ROUTE_CACHE_TTL", 300))  # 5-minute TTL

app = FastAPI(title="Road SOS Route Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---

class RouteRequest(BaseModel):
    source_lat: float
    source_lon: float
    dest_lat: float
    dest_lon: float


class RouteCoord(BaseModel):
    latitude: float
    longitude: float


class RouteResponse(BaseModel):
    distance_km: float
    eta_minutes: float
    eta_text: str
    polyline: List[RouteCoord]
    source: str = "osrm"  # 'osrm' | 'fallback'


# --- In-memory route cache ---

_cache: Dict[str, tuple] = {}  # key -> (timestamp, RouteResponse)


def _cache_key(req: RouteRequest) -> str:
    return f"{req.source_lat:.4f}:{req.source_lon:.4f}:{req.dest_lat:.4f}:{req.dest_lon:.4f}"


def _fmt_eta(minutes: float) -> str:
    if minutes < 1:
        return "< 1 min"
    if minutes < 60:
        return f"{int(round(minutes))} min"
    h = int(minutes // 60)
    m = int(round(minutes % 60))
    return f"{h}h {m}m"


# --- OSRM fetch ---

async def _fetch_osrm(req: RouteRequest) -> RouteResponse:
    coords = f"{req.source_lon},{req.source_lat};{req.dest_lon},{req.dest_lat}"
    url = (
        f"{OSRM_BASE_URL}/route/v1/driving/{coords}"
        "?overview=full&geometries=geojson"
    )
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    if data.get("code") != "Ok" or not data.get("routes"):
        raise ValueError(f"OSRM error: {data.get('code', 'unknown')}")

    route = data["routes"][0]
    dist_km = round(route["distance"] / 1000.0, 2)
    eta_min = round(route["duration"] / 60.0, 1)
    # OSRM GeoJSON coords are [lon, lat]
    polyline = [
        RouteCoord(latitude=c[1], longitude=c[0])
        for c in route["geometry"]["coordinates"]
    ]
    return RouteResponse(
        distance_km=dist_km,
        eta_minutes=eta_min,
        eta_text=_fmt_eta(eta_min),
        polyline=polyline,
        source="osrm",
    )


def _haversine_fallback(req: RouteRequest) -> RouteResponse:
    dlat = math.radians(req.dest_lat - req.source_lat)
    dlon = math.radians(req.dest_lon - req.source_lon)
    a = math.sin(dlat / 2) ** 2 + (
        math.cos(math.radians(req.source_lat))
        * math.cos(math.radians(req.dest_lat))
        * math.sin(dlon / 2) ** 2
    )
    dist_km = 6371.0 * 2 * math.asin(math.sqrt(a))
    road_est_km = round(dist_km * 1.35, 2)  # road-distance multiplier
    eta_min = round((road_est_km / 40.0) * 60.0, 1)
    return RouteResponse(
        distance_km=road_est_km,
        eta_minutes=eta_min,
        eta_text=_fmt_eta(eta_min) + " (est.)",
        polyline=[
            RouteCoord(latitude=req.source_lat, longitude=req.source_lon),
            RouteCoord(latitude=req.dest_lat, longitude=req.dest_lon),
        ],
        source="fallback",
    )


# --- Endpoints ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "route-service"}


@app.post("/route", response_model=RouteResponse)
async def get_route(req: RouteRequest):
    key = _cache_key(req)

    # Serve from cache if fresh
    if key in _cache:
        ts, cached = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return cached

    # Try OSRM with one retry
    for attempt in range(2):
        try:
            result = await _fetch_osrm(req)
            _cache[key] = (time.time(), result)
            return result
        except Exception as exc:
            print(f"[route-service] OSRM attempt {attempt + 1} failed: {exc}")
            if attempt == 0:
                await asyncio.sleep(1)

    # Graceful degradation: straight-line haversine estimate
    result = _haversine_fallback(req)
    _cache[key] = (time.time(), result)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
