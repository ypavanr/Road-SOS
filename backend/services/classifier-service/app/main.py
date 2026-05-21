import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

from app.models import ClassifyRequest, ClassifyResponse
from app.services.classifier import classify_text

PORT = int(os.environ.get("PORT", 8004))

app = FastAPI(title="Road SOS Classifier Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "classifier-service"}

@app.post("/classify", response_model=ClassifyResponse)
async def classify(request: ClassifyRequest):
    return await classify_text(request.text)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
