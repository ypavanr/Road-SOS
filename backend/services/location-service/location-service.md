# Location Service

**Status:** Not yet implemented

Resolves, tracks, and shares the user's location during an active emergency event.

## Planned Behaviour

- Accepts live GPS coordinates from the frontend
- Generates a shareable location link (e.g. for sending to responders)
- Stores location history for an active incident session
- Reverse geocodes coordinates to a human-readable address using Nominatim

## Planned Implementation

- FastAPI service on port `8004`
- WebSocket endpoint for live location streaming
- Nominatim integration for reverse geocoding
- Short-lived session tokens for shareable links
