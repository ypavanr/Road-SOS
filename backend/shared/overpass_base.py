import httpx
from typing import List, Tuple, Optional
from models import Address, ContactInfo

# Try mirrors in order; first one that succeeds wins
_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

_HEADERS = {
    "User-Agent": "RoadSOS/1.0 (open-source emergency response; https://github.com/road-sos)",
    "Accept": "application/json, */*",
    "Accept-Language": "en",
}


def extract_lat_lon(element: dict) -> Tuple[Optional[float], Optional[float]]:
    if element["type"] == "node":
        return element.get("lat"), element.get("lon")
    elif element["type"] in ("way", "relation"):
        center = element.get("center", {})
        return center.get("lat"), center.get("lon")
    return None, None


def parse_address(tags: dict) -> Address:
    street = tags.get("addr:street")
    housenumber = tags.get("addr:housenumber")
    if street and housenumber:
        street = f"{housenumber} {street}"
    elif not street:
        street = tags.get("addr:full")

    city = tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village")
    state = tags.get("addr:state")
    postcode = tags.get("addr:postcode")
    country = tags.get("addr:country")

    parts = [p for p in [street, city, state, postcode, country] if p]
    full = ", ".join(parts) if any([street, city, state]) else None

    return Address(
        street=street, city=city, state=state,
        postcode=postcode, country=country, full=full,
    )


def parse_contact(tags: dict) -> ContactInfo:
    return ContactInfo(
        phone=tags.get("phone") or tags.get("contact:phone"),
        phone_alt=tags.get("phone_2") or tags.get("contact:phone_2"),
        email=tags.get("email") or tags.get("contact:email"),
        website=tags.get("website") or tags.get("contact:website") or tags.get("url"),
        fax=tags.get("fax") or tags.get("contact:fax"),
    )


def build_query(queries: List[str], lat: float, lon: float, radius_m: int) -> str:
    parts = ["[out:json][timeout:30];", "("]
    for q in queries:
        parts.append(f"  {q}(around:{radius_m},{lat},{lon});")
    parts += [");", "out center tags;"]
    return "\n".join(parts)


async def fetch_raw(query: str, timeout: int = 35) -> List[dict]:
    last_exc = None
    for mirror in _MIRRORS:
        try:
            async with httpx.AsyncClient(
                timeout=timeout,
                headers=_HEADERS,
                follow_redirects=True,
            ) as client:
                resp = await client.post(mirror, data={"data": query})
                resp.raise_for_status()
                return resp.json().get("elements", [])
        except Exception as exc:
            last_exc = exc
            continue
    raise RuntimeError(f"All Overpass mirrors failed. Last error: {last_exc}")
