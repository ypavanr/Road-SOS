from pydantic import BaseModel
from typing import List, Optional

class UpdateLocationRequest(BaseModel):
    token: str
    geohash: str

class TriggerSOSRequest(BaseModel):
    geohashes: List[str]
    target_phones: List[str] = []
    message: str
    contact_message: Optional[str] = None
    sender_phone: Optional[str] = None
    title: str = "⚠️ URGENT: Road-SOS Alert!"
    url: Optional[str] = None
