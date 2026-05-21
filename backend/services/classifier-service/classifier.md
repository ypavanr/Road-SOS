# Classifier Service

**Status:** Not yet implemented

Classifies the type of emergency from user input (text or transcribed speech) and determines which downstream services to call.

## Planned Behaviour

Given a distress message like *"I've had a car accident and I'm injured"*, the service returns:

```json
{
  "emergency_types": ["medical", "roadside"],
  "priority": "medical",
  "confidence": 0.91
}
```

The frontend or API gateway uses this to decide whether to call `hospital-service`, `roadside-service`, or both.

## Planned Implementation

- LLM-based classification (Claude API) with structured output prompt
- Rule-based fallback for offline / low-latency use
- Input: raw text string from `speech-service` or direct user input
- Output: list of emergency types with confidence scores
