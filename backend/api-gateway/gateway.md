# API Gateway

**Port:** `8000` (planned)  
**Status:** Not yet implemented

Single entry point for all frontend requests. Will route to individual microservices, handle authentication, and enforce rate limiting.

## Planned Responsibilities

- Route `/nearby/medical` → `hospital-service:8001`
- Route `/nearby/roadside` → `roadside-service:8002`
- Route `/contacts` → `emergency-contacts-service:8003`
- Route `/classify` → `classifier-service` (planned)
- Route `/transcribe` → `speech-service` (planned)
- Auth middleware (JWT or API key)
- Rate limiting per IP

## Current Workaround

The frontend calls each microservice directly using the URLs defined in `frontend/config.js`. This works for local development but should be replaced by the gateway before production.
