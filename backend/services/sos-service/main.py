import sys
import os
import asyncio
import httpx
from datetime import datetime

# Add shared package to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../shared')))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from config import (
    PORT, TELEGRAM_BOT_TOKEN, AUTHORITY_CHAT_IDS,
    USER_NAME, USER_PHONE, USER_MEDICAL_NOTES, USER_ADDRESS,
    SMS_NUMBERS
)

app = FastAPI(title="SOS Dispatch Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class LocationData(BaseModel):
    latitude: float
    longitude: float
    accuracy: float
    timestamp: int
    batteryLevel: Optional[int] = None
    deviceModel: Optional[str] = None

def build_telegram_message(data: LocationData) -> str:
    # Convert timestamp (ms) to IST format
    dt = datetime.fromtimestamp(data.timestamp / 1000.0)
    time_str = dt.strftime("%d %b %Y, %H:%M:%S")

    maps_link = f"https://maps.google.com/?q={data.latitude},{data.longitude}"
    osm_link  = f"https://www.openstreetmap.org/?mlat={data.latitude}&mlon={data.longitude}&zoom=16"

    battery = f"{data.batteryLevel}%" if data.batteryLevel is not None else "Unknown"
    device = data.deviceModel if data.deviceModel else "Unknown"

    return f"""🚨 *SOS EMERGENCY ALERT* 🚨

👤 *Person in Distress*
• Name: {USER_NAME}
• Phone: {USER_PHONE}
• Medical Notes: {USER_MEDICAL_NOTES}
• Home Address: {USER_ADDRESS}

📍 *Live Location*
• Latitude: `{data.latitude:.6f}`
• Longitude: `{data.longitude:.6f}`
• Accuracy: ±{round(data.accuracy)} metres
• [Open in Google Maps]({maps_link})
• [Open in OpenStreetMap]({osm_link})

🕐 *Time of Alert*
• {time_str} (IST)

📱 *Device Info*
• Model: {device}
• Battery: {battery}

⚠️ _This is an automated SOS. Please respond immediately._"""

@app.get("/health")
def health():
    return {"status": "ok", "service": "sos-service"}

@app.get("/config")
def get_config():
    """
    Returns config for the frontend so it can dispatch native SMS and display settings
    """
    return {
        "user_info": {
            "name": USER_NAME,
            "phone": USER_PHONE,
            "medicalNotes": USER_MEDICAL_NOTES,
            "address": USER_ADDRESS
        },
        "sms_numbers": SMS_NUMBERS
    }

@app.post("/telegram")
async def dispatch_telegram(data: LocationData):
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "YOUR_BOT_TOKEN_HERE":
        raise HTTPException(status_code=500, detail="Telegram bot token not configured.")

    text = build_telegram_message(data)
    errors = []

    async with httpx.AsyncClient() as client:
        for chat_id in AUTHORITY_CHAT_IDS:
            if not chat_id or chat_id.startswith("YOUR_CHAT_ID"):
                continue
            
            try:
                # Send text
                res = await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": "Markdown",
                        "disable_web_page_preview": False
                    }
                )
                if not res.is_success:
                    errors.append(f"Chat {chat_id}: {res.text}")
                
                # Send location pin
                await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendLocation",
                    json={
                        "chat_id": chat_id,
                        "latitude": data.latitude,
                        "longitude": data.longitude
                    }
                )
            except Exception as e:
                errors.append(f"Chat {chat_id}: {str(e)}")

    if errors:
        return {"success": False, "errors": errors}
    
    return {"success": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
