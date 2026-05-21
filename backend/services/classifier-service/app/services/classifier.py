import os
import json
from openai import AsyncOpenAI
from app.models import ClassifyResponse
from app.services.rules import fallback_classify

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

if GROQ_API_KEY:
    client = AsyncOpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1"
    )
else:
    client = None

# System prompt forcing structured JSON
SYSTEM_PROMPT = """You are an emergency triage classification system.
You will receive a transcription of an emergency voice call or user text.
Analyze the prompt and accurately determine:
1. Is it an emergency?
2. What broad categories are involved? (medical, police, roadside)
3. What specific facilities are needed? Choose ONLY from this strict list:
   hospital, trauma_center, clinic, ambulance, police, fire_station, towing, roadside_assistance, tyre_shop, car_repair, fuel_station, showroom

CRITICAL INSTRUCTIONS: 
- Mapping of facilities to categories:
  * 'medical' -> hospital, trauma_center, clinic, ambulance, fire_station
  * 'police' -> police
  * 'roadside' -> towing, roadside_assistance, tyre_shop, car_repair, fuel_station, showroom
- Multiple emergencies can exist concurrently. If it's a crime scene with injuries, both 'police' and 'medical' are required.
- You must provide a clear 'explanation' string summarizing your reasoning.
- You must return a valid JSON object matching this schema exactly:
{
  "is_emergency": boolean,
  "broad_categories": [string],
  "specific_facilities": [string],
  "explanation": string,
  "confidence_score": float
}
"""

async def classify_text(text: str) -> ClassifyResponse:
    if not client:
        print("No GROQ_API_KEY found, falling back to rules engine.")
        return fallback_classify(text)
        
    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant", 
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"User Prompt: {text}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        
        result_str = response.choices[0].message.content
        data = json.loads(result_str)
        
        broad = set(data.get("broad_categories", []))
        specific = data.get("specific_facilities", [])
        
        # Post-process to ensure correct mapping
        medical_set = {"hospital", "trauma_center", "clinic", "ambulance", "fire_station"}
        police_set = {"police"}
        roadside_set = {"towing", "roadside_assistance", "tyre_shop", "car_repair", "fuel_station", "showroom"}
        
        for fac in specific:
            if fac in medical_set:
                broad.add("medical")
            elif fac in police_set:
                broad.add("police")
            elif fac in roadside_set:
                broad.add("roadside")
                
        # Force is_emergency to True if they need any assistance, so frontend auto-fetches
        is_emergency = data.get("is_emergency", True)
        if broad:
            is_emergency = True
        
        return ClassifyResponse(
            is_emergency=is_emergency,
            broad_categories=list(broad),
            specific_facilities=specific,
            explanation=data.get("explanation", "Groq LLM inferred the categories."),
            confidence_score=data.get("confidence_score", 0.9),
            engine_used="llm"
        )
    except Exception as e:
        print(f"LLM Classification failed: {e}")
        # Fallback to rules if LLM fails (e.g. rate limit, bad schema)
        return fallback_classify(text)
