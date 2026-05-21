from typing import List
from models import Facility
from overpass_base import (
    extract_lat_lon, parse_address, parse_contact, build_query, fetch_raw
)
from config import OVERPASS_TIMEOUT

ROADSIDE_QUERIES = [
    # Towing — explicit tag first
    'node["shop"="car_repair"]["service:vehicle:towing"="yes"]',
    'way["shop"="car_repair"]["service:vehicle:towing"="yes"]',
    'node["emergency"="roadside_assistance"]',
    'way["emergency"="roadside_assistance"]',
    'node["amenity"="vehicle_rescue"]',
    # Tyre / puncture shops
    'node["shop"="tyres"]',
    'way["shop"="tyres"]',
    'node["craft"="tyre_fitting"]',
    'node["shop"="motorcycle_repair"]',
    # General car repair and mechanics
    'node["shop"="car_repair"]',
    'way["shop"="car_repair"]',
    'node["craft"="car_repair"]',
    'way["craft"="car_repair"]',
    'node["craft"="mechanic"]',
    # Fuel stations
    'node["amenity"="fuel"]',
    'way["amenity"="fuel"]',
    # Showrooms / Dealerships
    'node["shop"="car"]',
    'way["shop"="car"]',
    'node["shop"="motorcycle"]',
    'way["shop"="motorcycle"]',
]


def _infer_type(tags: dict) -> str:
    shop = tags.get("shop", "").lower()
    craft = tags.get("craft", "").lower()
    amenity = tags.get("amenity", "").lower()
    emergency = tags.get("emergency", "").lower()
    name = tags.get("name", "").lower()
    towing = tags.get("service:vehicle:towing", "").lower()

    if emergency in ("roadside_assistance",) or amenity == "vehicle_rescue":
        return "roadside_assistance"
    if towing == "yes" or any(w in name for w in ("tow", "towing", "crane")):
        return "towing"
    if shop == "tyres" or craft == "tyre_fitting":
        return "tyre_shop"
    if amenity == "fuel":
        return "fuel_station"
    if shop in ("car", "motorcycle"):
        return "showroom"
    if shop in ("car_repair", "motorcycle_repair") or craft in ("car_repair", "mechanic", "motorcycle_repair"):
        return "car_repair"
    return "car_repair"


def _parse_element(element: dict):
    tags = element.get("tags", {})
    lat, lon = extract_lat_lon(element)
    if lat is None or lon is None:
        return None

    name = (
        tags.get("name") or tags.get("name:en")
        or tags.get("official_name") or "Unnamed"
    )

    # Collect services offered as specialties
    services = []
    if tags.get("service:vehicle:towing") == "yes":
        services.append("towing")
    if tags.get("service:vehicle:tyres") == "yes":
        services.append("tyres")
    if tags.get("service:vehicle:oil") == "yes":
        services.append("oil change")
    if tags.get("service:vehicle:battery") == "yes":
        services.append("battery")
    if tags.get("service:vehicle:body_repair") == "yes":
        services.append("body repair")
    brand = tags.get("brand") or tags.get("operator")
    if brand:
        services.append(brand)

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
        emergency=False,
        specialties=services,
        source="openstreetmap",
    )


async def fetch_facilities(lat: float, lon: float, radius_m: int) -> List[Facility]:
    query = build_query(ROADSIDE_QUERIES, lat, lon, radius_m)
    elements = await fetch_raw(query, timeout=OVERPASS_TIMEOUT + 5)

    seen, facilities = set(), []
    for element in elements:
        facility = _parse_element(element)
        if facility and facility.id not in seen:
            seen.add(facility.id)
            facilities.append(facility)
    return facilities
