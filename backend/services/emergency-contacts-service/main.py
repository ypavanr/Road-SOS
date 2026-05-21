import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../shared')))

import json
from typing import Optional
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import EmergencyContact, EmergencyContactsResponse

PORT = int(os.getenv("PORT", 8003))
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

_data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "contacts.json")
with open(_data_path) as f:
    CONTACTS_DB = json.load(f)

app = FastAPI(title="Emergency Contacts Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "emergency-contacts-service"}


@app.get("/contacts", response_model=EmergencyContactsResponse)
async def contacts(lat: Optional[float] = None, lon: Optional[float] = None):
    country_code = "IN"
    state_name: Optional[str] = None

    # Reverse geocode to detect country/state when coordinates are provided
    if lat is not None and lon is not None:
        country_code, state_name = await _reverse_geocode(lat, lon)

    country_data = CONTACTS_DB.get(country_code.upper()) or CONTACTS_DB.get("IN")
    national = [EmergencyContact(**c, country=country_code.upper()) for c in country_data["national"]]

    state_contacts = []
    if state_name:
        state_specific = country_data.get("states", {}).get(state_name, [])
        # Deduplicate: skip state contacts whose number already appears in national
        national_numbers = {c.number for c in national}
        state_contacts = [
            EmergencyContact(**c, country=country_code.upper())
            for c in state_specific
            if c["number"] not in national_numbers
        ]

    all_contacts = national + state_contacts

    return EmergencyContactsResponse(
        contacts=all_contacts,
        country=country_code.upper(),
        state=state_name,
    )


async def _reverse_geocode(lat: float, lon: float) -> tuple[str, Optional[str]]:
    try:
        async with httpx.AsyncClient(timeout=5, headers={"User-Agent": "RoadSOS/1.0"}) as client:
            resp = await client.get(
                NOMINATIM_URL,
                params={"format": "json", "lat": lat, "lon": lon, "zoom": 8},
            )
            resp.raise_for_status()
            data = resp.json()
            addr = data.get("address", {})
            country_code = addr.get("country_code", "in").upper()
            state = addr.get("state") or addr.get("province")
            return country_code, state
    except Exception:
        return "IN", None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
