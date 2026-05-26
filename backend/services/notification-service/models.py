from pydantic import BaseModel
from typing import List

class UpdateLocationRequest(BaseModel):
    token: str
    geohash: str

class TriggerSOSRequest(BaseModel):
    geohashes: List[str]
    message: str
    title: str = "⚠️ URGENT: Road-SOS Alert!"
    url: str = None
