import math
import os
import httpx
from typing import List, Optional
from models import Facility

OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "http://router.project-osrm.org")
MAX_ROUTING_BATCH = int(os.getenv("MAX_ROUTING_BATCH", 30))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def _haversine_eta_minutes(distance_km: float) -> float:
    return (distance_km / 40.0) * 60.0


def _fmt_eta(minutes: float) -> str:
    if minutes < 1:
        return "< 1 min"
    if minutes < 60:
        return f"{int(round(minutes))} min"
    h = int(minutes // 60)
    m = int(round(minutes % 60))
    return f"{h}h {m}m"


async def compute_etas(src_lat: float, src_lon: float, facilities: List[Facility]) -> List[Facility]:
    if not facilities:
        return facilities
    batches = [facilities[i:i + MAX_ROUTING_BATCH] for i in range(0, len(facilities), MAX_ROUTING_BATCH)]
    results: List[Facility] = []
    for batch in batches:
        results.extend(await _osrm_batch(src_lat, src_lon, batch))
    return results


async def _osrm_batch(src_lat: float, src_lon: float, facilities: List[Facility]) -> List[Facility]:
    coords = f"{src_lon},{src_lat}" + "".join(f";{f.lon},{f.lat}" for f in facilities)
    destinations = ";".join(str(i + 1) for i in range(len(facilities)))
    url = (
        f"{OSRM_BASE_URL}/table/v1/driving/{coords}"
        f"?sources=0&destinations={destinations}&annotations=duration,distance"
    )

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

        if data.get("code") != "Ok":
            raise ValueError(f"OSRM error: {data.get('code')}")

        durations = data["durations"][0]
        distances = data.get("distances", [[None] * len(facilities)])[0]

        for i, facility in enumerate(facilities):
            duration_sec: Optional[float] = durations[i] if durations else None
            dist_m: Optional[float] = distances[i] if distances else None

            if duration_sec is not None:
                eta_min = duration_sec / 60.0
                if dist_m is not None:
                    facility.distance_km = dist_m / 1000.0
            else:
                eta_min = _haversine_eta_minutes(facility.distance_km)

            facility.eta_minutes = round(eta_min, 1)
            facility.eta_text = _fmt_eta(eta_min)

    except Exception:
        for facility in facilities:
            eta_min = _haversine_eta_minutes(facility.distance_km)
            facility.eta_minutes = round(eta_min, 1)
            facility.eta_text = _fmt_eta(eta_min) + " (est.)"

    return facilities
