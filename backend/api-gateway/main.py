import os
import shutil
import uuid
import base64
from fastapi import FastAPI, Request, Response, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import httpx

app = FastAPI(title="Road SOS API Gateway", version="1.0.0")

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.websocket("/ws/ping")
async def websocket_ping(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for base64 file upload
class Base64FileUpload(BaseModel):
    file: str
    filename: str
    mimeType: str

PORT = int(os.environ.get("PORT", 8000))

# Hardcoded defaults matching current local setup
HOSPITAL_SERVICE_URL = os.environ.get("HOSPITAL_SERVICE_URL", "http://localhost:8001")
ROADSIDE_SERVICE_URL = os.environ.get("ROADSIDE_SERVICE_URL", "http://localhost:8002")
CONTACTS_SERVICE_URL = os.environ.get("CONTACTS_SERVICE_URL", "http://localhost:8003")
CLASSIFIER_SERVICE_URL = os.environ.get("CLASSIFIER_SERVICE_URL", "http://localhost:8004")
ROUTE_SERVICE_URL = os.environ.get("ROUTE_SERVICE_URL", "http://localhost:8005")
SPEECH_SERVICE_URL = os.environ.get("SPEECH_SERVICE_URL", "http://localhost:8006")
SOS_SERVICE_URL = os.environ.get("SOS_SERVICE_URL", "http://localhost:8007")

@app.get("/health")
def health():
    return {"status": "ok", "service": "api-gateway"}

async def proxy_request(method: str, url: str, request: Request, json_data=None):
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            # We intentionally drop request headers here to avoid Host/Origin issues,
            # but in a real gateway, you might filter and forward specific headers.
            response = await client.request(
                method=method,
                url=url,
                params=request.query_params,
                json=json_data
            )
            # Filter out content-encoding, content-length to avoid chunking conflicts
            headers = {k: v for k, v in response.headers.items() if k.lower() not in ("content-encoding", "content-length", "transfer-encoding")}
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=headers
            )
        except httpx.RequestError as exc:
            return Response(status_code=502, content=f'{{"error": "Bad Gateway: {exc}"}}', media_type="application/json")

@app.post("/nearby/medical")
async def nearby_medical(request: Request):
    json_data = await request.json()
    return await proxy_request("POST", f"{HOSPITAL_SERVICE_URL}/nearby", request, json_data=json_data)

@app.post("/nearby/roadside")
async def nearby_roadside(request: Request):
    json_data = await request.json()
    return await proxy_request("POST", f"{ROADSIDE_SERVICE_URL}/nearby", request, json_data=json_data)

@app.get("/contacts")
async def contacts(request: Request):
    return await proxy_request("GET", f"{CONTACTS_SERVICE_URL}/contacts", request)

@app.get("/sos/config")
async def sos_config(request: Request):
    return await proxy_request("GET", f"{SOS_SERVICE_URL}/config", request)

@app.post("/sos/telegram")
async def sos_telegram(request: Request):
    json_data = await request.json()
    return await proxy_request("POST", f"{SOS_SERVICE_URL}/telegram", request, json_data=json_data)

@app.post("/route")
async def route(request: Request):
    json_data = await request.json()
    return await proxy_request("POST", f"{ROUTE_SERVICE_URL}/route", request, json_data=json_data)

@app.post("/classify")
async def classify(request: Request):
    json_data = await request.json()
    return await proxy_request("POST", f"{CLASSIFIER_SERVICE_URL}/classify", request, json_data=json_data)

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            file_content = await file.read()
            files = {'file': (file.filename, file_content, file.content_type)}
            response = await client.post(
                f"{SPEECH_SERVICE_URL}/transcribe",
                files=files
            )
            headers = {k: v for k, v in response.headers.items() if k.lower() not in ("content-encoding", "content-length", "transfer-encoding")}
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=headers
            )
        except httpx.RequestError as exc:
            return Response(status_code=502, content=f'{{"error": "Bad Gateway: {exc}"}}', media_type="application/json")

@app.post("/upload")
async def upload_file(request: Request):
    """Handle both multipart form-data and JSON base64 file uploads"""
    content_type = request.headers.get("content-type", "")
    
    try:
        if "application/json" in content_type:
            # Handle JSON base64 upload
            body = await request.json()
            data = Base64FileUpload(**body)
            
            # Decode base64
            file_data = base64.b64decode(data.file)
            
            # Determine file extension
            ext = os.path.splitext(data.filename)[1]
            if not ext:
                if "png" in data.mimeType:
                    ext = ".png"
                elif "gif" in data.mimeType:
                    ext = ".gif"
                else:
                    ext = ".jpg"
            
            unique_filename = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            with open(file_path, "wb") as f:
                f.write(file_data)
        else:
            # Handle multipart form-data upload (legacy)
            form = await request.form()
            file = form.get("file")
            
            if not file or not file.filename:
                return {"success": False, "error": "No file uploaded"}
            
            ext = os.path.splitext(file.filename)[1]
            if not ext:
                ext = ".jpg"
            
            unique_filename = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        
        host = request.headers.get("host", f"localhost:8000")
        url = f"http://{host}/uploads/{unique_filename}"
        return {
            "success": True,
            "url": url,
            "file_url": url
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)

