import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../shared')))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import PORT, SEARCH_RADIUS_M, CACHE_DB_PATH, CACHE_TTL_SECONDS
from models import NearbyRequest, NearbyResponse, Facility
from services.overpass import fetch_facilities
from routing import haversine_km, compute_etas
from cache import FacilityCache
from utils import deduplicate_by_proximity

_cache: FacilityCache = None

def _is_gender_specific(facility: Facility, patient_gender: str) -> bool:
    if not patient_gender or patient_gender.lower() == "unknown":
        return False
        
    name = facility.name.lower()
    specs = [s.lower() for s in facility.specialties]
    
    women_keywords = ["women", "maternity", "maternal", "gynecology", "gynaecology"]
    men_keywords = ["men", "mens", "andrology"]
    
    if patient_gender.lower() == "male":
        # Check if it's a women's hospital
        if any(kw in name for kw in women_keywords):
            return True
        if any(kw in spec for spec in specs for kw in women_keywords):
            return True
            
    elif patient_gender.lower() == "female":
        # Check if it's a men's hospital/clinic
        if any(kw in name for kw in men_keywords):
            return True
        if any(kw in spec for spec in specs for kw in men_keywords):
            return True
            
    return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _cache
    _cache = FacilityCache(CACHE_DB_PATH, CACHE_TTL_SECONDS)
    _cache.purge_expired()
    yield


app = FastAPI(title="Hospital Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "hospital-service"}


@app.post("/nearby", response_model=NearbyResponse)
async def nearby(req: NearbyRequest):
    radius_m = min(req.radius_m, 20000)

    cached_data, is_fresh = None, False
    if not req.force_refresh:
        cached_data, is_fresh = _cache.get(req.lat, req.lon, radius_m)

    if is_fresh and cached_data is not None:
        facilities = _enrich(req.lat, req.lon, cached_data)
        if req.patient_gender:
            facilities = [f for f in facilities if not _is_gender_specific(f, req.patient_gender)]
            
        return NearbyResponse(
            facilities=facilities, total=len(facilities), cached=True,
            lat=req.lat, lon=req.lon, radius_m=radius_m,
        )

    try:
        facilities = await fetch_facilities(req.lat, req.lon, radius_m)
    except Exception as e:
        if cached_data is not None:
            facilities = _enrich(req.lat, req.lon, cached_data)
            if req.patient_gender:
                facilities = [f for f in facilities if not _is_gender_specific(f, req.patient_gender)]
                
            return NearbyResponse(
                facilities=facilities, total=len(facilities), cached=True,
                lat=req.lat, lon=req.lon, radius_m=radius_m,
            )
        raise HTTPException(status_code=503, detail=f"Overpass API unavailable: {e}")

    if not facilities:
        return NearbyResponse(
            facilities=[], total=0, cached=False,
            lat=req.lat, lon=req.lon, radius_m=radius_m,
        )

    for f in facilities:
        f.distance_km = round(haversine_km(req.lat, req.lon, f.lat, f.lon), 3)

    facilities = deduplicate_by_proximity(facilities)
    
    # Filter gender specific hospitals before sorting and truncating
    if req.patient_gender:
        facilities = [f for f in facilities if not _is_gender_specific(f, req.patient_gender)]
        
    facilities.sort(key=lambda f: f.distance_km)
    facilities = facilities[:30]

    facilities = await compute_etas(req.lat, req.lon, facilities)
    facilities.sort(key=lambda f: f.eta_minutes if f.eta_minutes is not None else 9999)

    _cache.save(req.lat, req.lon, radius_m, facilities)

    return NearbyResponse(
        facilities=facilities, total=len(facilities), cached=False,
        lat=req.lat, lon=req.lon, radius_m=radius_m,
    )


def _enrich(lat: float, lon: float, facilities: list) -> list:
    for f in facilities:
        f.distance_km = haversine_km(lat, lon, f.lat, f.lon)
    facilities.sort(key=lambda f: f.eta_minutes if f.eta_minutes is not None else 9999)
    return facilities


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", host="0.0.0.0", port=PORT, reload=True,
        reload_dirs=[".", "../../shared"],
    )
