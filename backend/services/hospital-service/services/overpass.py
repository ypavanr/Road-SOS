from typing import List
from models import Facility
from overpass_base import (
    extract_lat_lon, parse_address, parse_contact, build_query, fetch_raw
)
from config import OVERPASS_TIMEOUT

FACILITY_QUERIES = [
    # Hospitals and trauma centers
    'node["amenity"="hospital"]',
    'way["amenity"="hospital"]',
    'node["healthcare"="hospital"]',
    'way["healthcare"="hospital"]',
    # Police
    'node["amenity"="police"]',
    'way["amenity"="police"]',
    # Ambulance
    'node["emergency"="ambulance_station"]',
    'way["emergency"="ambulance_station"]',
    'node["amenity"="ambulance_station"]',
    # Fire stations
    'node["amenity"="fire_station"]',
    'way["amenity"="fire_station"]',
    # Emergency clinics
    'node["healthcare"="clinic"]["emergency"="yes"]',
]


def _infer_type(tags: dict) -> str:
    emergency = tags.get("emergency", "").lower()
    healthcare = tags.get("healthcare", "").lower()
    amenity = tags.get("amenity", "").lower()

    if emergency in ("ambulance_station",) or amenity == "ambulance_station":
        return "ambulance"
    if amenity == "police":
        return "police"
    if amenity == "fire_station":
        return "fire_station"
    if healthcare == "hospital" or amenity == "hospital":
        trauma = tags.get("trauma", "") or tags.get("emergency", "")
        return "trauma_center" if trauma.lower() in ("yes", "trauma_center") else "hospital"
    if healthcare == "clinic":
        return "clinic"
    return "hospital"


def _parse_element(element: dict):
    tags = element.get("tags", {})
    lat, lon = extract_lat_lon(element)
    if lat is None or lon is None:
        return None

    name = (
        tags.get("name") or tags.get("name:en")
        or tags.get("official_name") or "Unnamed Facility"
    )

    beds_raw = tags.get("beds") or tags.get("capacity:beds")
    beds = None
    if beds_raw:
        try:
            beds = int(beds_raw)
        except ValueError:
            pass

    specialties_raw = tags.get("healthcare:speciality") or tags.get("speciality") or ""
    specialties = [s.strip() for s in specialties_raw.split(";") if s.strip()]

    return Facility(
        id=f"osm:{element['type']}:{element['id']}",
        name=name,
        type=_infer_type(tags),
        lat=lat,
        lon=lon,
        address=parse_address(tags),
        contact=parse_contact(tags),
        distance_km=0.0,
        opening_hours=tags.get("opening_hours"),
        emergency=tags.get("emergency", "").lower() in ("yes", "ambulance_station"),
        beds=beds,
        specialties=specialties,
        source="openstreetmap",
    )


async def fetch_facilities(lat: float, lon: float, radius_m: int) -> List[Facility]:
    query = build_query(FACILITY_QUERIES, lat, lon, radius_m)
    elements = await fetch_raw(query, timeout=OVERPASS_TIMEOUT + 5)

    seen, facilities = set(), []
    for element in elements:
        facility = _parse_element(element)
        if facility and facility.id not in seen:
            seen.add(facility.id)
            facilities.append(facility)
    return facilities
