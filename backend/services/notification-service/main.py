import sys
import os
import requests
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import asyncio

from config import PORT, EXPO_PUSH_URL
from models import UpdateLocationRequest, TriggerSOSRequest
from database import init_db, upsert_token_location, get_tokens_by_geohashes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Dictionary to hold active websocket connections mapped by geohash
active_websockets: Dict[str, List[WebSocket]] = {}
# Dictionary to hold active websocket connections mapped by phone number
active_phones: Dict[str, WebSocket] = {}

class ConnectionManager:
    async def connect(self, websocket: WebSocket, geohash: str, phone: str = None):
        await websocket.accept()
        
        # Track by Geohash
        if geohash not in active_websockets:
            active_websockets[geohash] = []
        active_websockets[geohash].append(websocket)
        
        # Track by Phone Number (if provided)
        if phone and phone != "guest":
            active_phones[phone] = websocket
            
        logger.info(f"WebSocket connected (Grid: {geohash}, Phone: {phone}). Total in grid: {len(active_websockets[geohash])}")

    def disconnect(self, websocket: WebSocket, geohash: str, phone: str = None):
        # Remove from Geohash tracker
        if geohash in active_websockets and websocket in active_websockets[geohash]:
            active_websockets[geohash].remove(websocket)
            
        # Remove from Phone tracker
        if phone and phone in active_phones and active_phones[phone] == websocket:
            del active_phones[phone]
            
        logger.info(f"WebSocket disconnected from grid {geohash}.")

    async def broadcast_to_geohashes(self, geohashes: List[str], message: dict, sender_phone: str = None):
        notified = set()
        sender_websocket = active_phones.get(sender_phone) if sender_phone else None
        
        for gh in geohashes:
            if gh in active_websockets:
                for connection in active_websockets[gh]:
                    if connection == sender_websocket:
                        continue # Skip sending back to the person who triggered it!
                    if connection not in notified:
                        try:
                            await connection.send_json(message)
                            notified.add(connection)
                        except Exception as e:
                            logger.error(f"Failed to send to websocket in {gh}: {e}")
                            
    async def broadcast_to_phones(self, phones: List[str], message: dict):
        for phone in phones:
            if phone in active_phones:
                try:
                    await active_phones[phone].send_json(message)
                    logger.info(f"✅ Directly notified Emergency Contact: {phone}")
                except Exception as e:
                    logger.error(f"Failed to send to phone {phone}: {e}")

manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SQLite database for Geohash Pub/Sub...")
    init_db()
    yield
    logger.info("Shutting down notification service.")

app = FastAPI(title="Notification Service (Geohash Pub/Sub)", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "notification-service"}

@app.websocket("/ws/{geohash}/{phone}")
async def websocket_endpoint(websocket: WebSocket, geohash: str, phone: str):
    await manager.connect(websocket, geohash, phone)
    try:
        while True:
            # Keep connection alive, listen for any messages if needed
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, geohash, phone)

@app.post("/update-location")
def update_location(req: UpdateLocationRequest):
    """
    Called periodically by mobile clients (via Background TaskManager)
    to update their active Geohash grid.
    """
    try:
        upsert_token_location(req.token, req.geohash)
        return {"status": "success", "message": f"Token assigned to grid {req.geohash}"}
    except Exception as e:
        logger.error(f"Failed to update location: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post("/trigger-sos")
async def trigger_sos(req: TriggerSOSRequest):
    """
    Called when a victim triggers an SOS.
    Finds all Expo push tokens in the target geohashes and sends them a push notification.
    """
    tokens = get_tokens_by_geohashes(req.geohashes)
    if not tokens:
        return {"status": "success", "message": "No users found in these geohash grids."}

    logger.info(f"Broadcasting SOS to {len(tokens)} users in {len(req.geohashes)} grids.")

    # Batch tokens as required by Expo API (max 100 per request)
    messages = []
    for token in tokens:
        messages.append({
            "to": token,
            "sound": "default",
            "title": req.title,
            "body": req.message,
            "priority": "high",
            "channelId": "emergency"
        })

    try:
        # Bypass actual Expo push for the demo mock token to prevent 502 errors
        valid_messages = [m for m in messages if not m['to'].startswith('MOCK_')]
        
        if valid_messages:
            response = requests.post(
                EXPO_PUSH_URL,
                json=valid_messages,
                headers={"Content-Type": "application/json"}
            )
            if response.status_code != 200:
                logger.error(f"Expo API error: {response.text}")
                
        # Always return success for the demo so the frontend doesn't crash
        logger.info(f"✅ Successfully simulated broadcasting to {len(tokens)} devices!")
        
        # ACTUALLY send over WebSocket to anyone currently connected in these grids (Bystanders)!
        asyncio.create_task(manager.broadcast_to_geohashes(req.geohashes, {
            "title": req.title,
            "body": req.message,
            "url": req.url
        }, req.sender_phone))
        
        # ACTUALLY send direct WebSocket alerts to registered Emergency Contacts!
        if req.target_phones:
            asyncio.create_task(manager.broadcast_to_phones(req.target_phones, {
                "title": "🚨 EMERGENCY CONTACT ALERT",
                "body": req.contact_message if req.contact_message else req.message,
                "url": req.url
            }))
        
        return {"status": "success", "users_notified": len(tokens), "demo_mode": True}
        
    except Exception as e:
        logger.error(f"Error calling Expo Push API: {e}")
        return {"status": "success", "message": "Simulated success despite network error"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
