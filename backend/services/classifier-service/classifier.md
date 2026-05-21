# Classifier Service

**Port:** `8004`  
**Status:** ✅ Implemented

Receives transcribed speech or typed text from the user and classifies the type of emergency. Supports multiple simultaneous emergency types (e.g. road accident with injuries → medical + police + roadside). Used by the frontend to filter and display only the relevant facilities.

---

## How It Works

```
User Voice/Text
      │
      ▼
 classifier-service /classify
      │
      ├─ Primary Engine  → Groq LLaMA 3 (llama3-8b-8192) via API
      └─ Fallback Engine → Local keyword rule-based classifier
```

The service always falls back to the local rule engine if:
- `GROQ_API_KEY` is not set
- The Groq API is unavailable or rate-limited
- The LLM returns a malformed response

---

## Setup

### 1. Get a Groq API Key (Free)
1. Go to [https://console.groq.com](https://console.groq.com) and sign up.
2. Navigate to **API Keys** and create a new key.

### 2. Configure Environment

**macOS / Linux / zsh:**
```bash
cd backend/services/classifier-service
cp .env.example .env
# Edit .env and paste your GROQ_API_KEY
```

**Windows (PowerShell):**
```powershell
cd backend\services\classifier-service
copy .env.example .env
# Open .env in notepad and paste your GROQ_API_KEY
```

`.env` file contents:
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
PORT=8004
```

### 3. Install & Run

**macOS / Linux / zsh:**
```bash
cd backend/services/classifier-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload
```

**Windows (PowerShell):**
```powershell
cd backend\services\classifier-service
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload
```

---

## Health Check

```bash
curl http://localhost:8004/health
# → {"status":"ok","service":"classifier-service"}
```

---

## API: POST /classify

**Request Body:**
```json
{ "text": "Your emergency description here" }
```

**Response Schema:**
```json
{
  "is_emergency": true,
  "broad_categories": ["medical", "roadside"],
  "specific_facilities": ["ambulance", "trauma_center", "towing"],
  "explanation": "User described a road accident with physical injuries...",
  "confidence_score": 0.96,
  "engine_used": "llm"
}
```

| Field | Type | Description |
|---|---|---|
| `is_emergency` | bool | Whether the input describes an emergency |
| `broad_categories` | list[str] | One or more of: `medical`, `police`, `roadside` |
| `specific_facilities` | list[str] | Exact facility types needed (maps 1:1 to facility `type` field in hospital/roadside services) |
| `explanation` | str | LLM or rule engine reasoning |
| `confidence_score` | float | 0.0–1.0 confidence |
| `engine_used` | str | `"llm"` or `"rules"` |

---

## Test Cases

### Test 1: Accident with injuries (multi-type)
```bash
curl -X POST http://localhost:8004/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "I hit a divider on the highway, my car is smashed and my chest hurts."}'
```
**Expected:** `medical + roadside`, facilities: `ambulance, trauma_center, towing`

---

### Test 2: Tyre puncture only
```bash
curl -X POST http://localhost:8004/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "My tyre burst and I am stuck on the road."}'
```
**Expected:** `roadside`, facilities: `tyre_shop, roadside_assistance`

---

### Test 3: Fuel emergency
```bash
curl -X POST http://localhost:8004/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "I ran out of petrol in the middle of nowhere."}'
```
**Expected:** `roadside`, facilities: `fuel_station, roadside_assistance`

---

### Test 4: Crime scene
```bash
curl -X POST http://localhost:8004/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "Someone is trying to rob me at gunpoint."}'
```
**Expected:** `police`, facilities: `police`

---

### Test 5: Crime scene with injured victim
```bash
curl -X POST http://localhost:8004/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "There is a robbery happening and someone has been stabbed."}'
```
**Expected:** `police + medical`, facilities: `police, ambulance, hospital`

---

### Test 6: Vehicle breakdown
```bash
curl -X POST http://localhost:8004/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "My car engine stopped suddenly and wont start."}'
```
**Expected:** `roadside`, facilities: `car_repair, roadside_assistance`

---

## Facility Type Reference

The `specific_facilities` values map directly to the `type` field returned by the hospital and roadside services:

| Facility Type | Service | Description |
|---|---|---|
| `hospital` | hospital-service | General hospital |
| `trauma_center` | hospital-service | Emergency/trauma ward |
| `clinic` | hospital-service | Small clinic |
| `ambulance` | hospital-service | Ambulance station |
| `police` | hospital-service | Police station |
| `fire_station` | hospital-service | Fire station |
| `towing` | roadside-service | Towing/crane service |
| `roadside_assistance` | roadside-service | General breakdown help |
| `tyre_shop` | roadside-service | Tyre / puncture shop |
| `car_repair` | roadside-service | Mechanic / car repair |
| `fuel_station` | roadside-service | Petrol / fuel station |
| `showroom` | roadside-service | Vehicle showroom/dealer |

---

## Interactive API Docs

Once running:  
`http://localhost:8004/docs`
