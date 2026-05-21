import os
from fastapi import FastAPI, Request, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI(title="Road SOS API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PORT = int(os.environ.get("PORT", 8000))

# Hardcoded defaults matching current local setup
HOSPITAL_SERVICE_URL = os.environ.get("HOSPITAL_SERVICE_URL", "http://localhost:8001")
ROADSIDE_SERVICE_URL = os.environ.get("ROADSIDE_SERVICE_URL", "http://localhost:8002")
CONTACTS_SERVICE_URL = os.environ.get("CONTACTS_SERVICE_URL", "http://localhost:8003")
CLASSIFIER_SERVICE_URL = os.environ.get("CLASSIFIER_SERVICE_URL", "http://localhost:8004")
SPEECH_SERVICE_URL = os.environ.get("SPEECH_SERVICE_URL", "http://localhost:8006")

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

@app.post("/classify")
async def classify(request: Request):
    json_data = await request.json()
    return await proxy_request("POST", f"{CLASSIFIER_SERVICE_URL}/classify", request, json_data=json_data)

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            files = {'file': (file.filename, file.file, file.content_type)}
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
