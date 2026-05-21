from pydantic import BaseModel
from typing import Optional, List


class ContactInfo(BaseModel):
    phone: Optional[str] = None
    phone_alt: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    fax: Optional[str] = None


class Address(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    country: Optional[str] = None
    full: Optional[str] = None


class Facility(BaseModel):
    id: str
    name: str
    # medical: hospital | trauma_center | clinic | ambulance
    # safety:  police | fire_station
    # roadside: towing | roadside_assistance | tyre_shop | car_repair | fuel_station
    type: str
    lat: float
    lon: float
    address: Address
    contact: ContactInfo
    distance_km: float
    eta_minutes: Optional[float] = None
    eta_text: Optional[str] = None
    opening_hours: Optional[str] = None
    emergency: bool = False
    beds: Optional[int] = None
    specialties: List[str] = []  # for roadside: services offered
    source: str = "openstreetmap"


class NearbyRequest(BaseModel):
    lat: float
    lon: float
    radius_m: int = 10000
    force_refresh: bool = False


class NearbyResponse(BaseModel):
    facilities: List[Facility]
    total: int
    cached: bool
    lat: float
    lon: float
    radius_m: int


class EmergencyContact(BaseModel):
    name: str
    number: str
    type: str  # emergency | police | ambulance | fire | highway | women | child | disaster | medical
    description: str
    country: str = "IN"
    always_available: bool = True


class EmergencyContactsResponse(BaseModel):
    contacts: List[EmergencyContact]
    country: str
    state: Optional[str] = None
