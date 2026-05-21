import math
from typing import List
from models import Facility


def _data_score(f: Facility) -> int:
    """Count non-null fields — used to prefer the richer duplicate."""
    return sum(1 for v in [
        f.contact.phone, f.contact.phone_alt, f.contact.website,
        f.contact.email, f.address.full, f.opening_hours,
    ] if v)


def _haversine_m(lat1, lon1, lat2, lon2) -> float:
    R = 6_371_000.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def deduplicate_by_proximity(facilities: List[Facility], threshold_m: float = 60.0) -> List[Facility]:
    """
    Remove duplicate OSM entries for the same physical location.

    OSM often maps a building as both a node and a way, producing two entries
    within a few metres of each other. We keep the one with more data.
    Threshold of 60 m catches node/way duplicates without merging distinct branches.
    """
    # Sort richest data first so the better entry is always the "winner"
    sorted_f = sorted(facilities, key=_data_score, reverse=True)

    kept: List[Facility] = []
    for f in sorted_f:
        too_close = any(
            _haversine_m(f.lat, f.lon, k.lat, k.lon) < threshold_m
            for k in kept
        )
        if not too_close:
            kept.append(f)
    return kept
