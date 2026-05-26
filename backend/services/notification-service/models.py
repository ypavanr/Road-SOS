from pydantic import BaseModel
from typing import List

class UpdateLocationRequest(BaseModel):
    token: str
    geohash: str

class TriggerSOSRequest(BaseModel):
    geohashes: List[str]
    target_phones: List[str] = []
    message: str
    contact_message: str = None
    title: str = "⚠️ URGENT: Road-SOS Alert!"
    url: str = None
