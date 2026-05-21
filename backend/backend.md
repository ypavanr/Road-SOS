# Backend

Contains the API gateway, microservices, and shared utilities for Road SOS.

## Structure

```
backend/
├── api-gateway/         # Single entry point — routes requests to services
├── services/
│   ├── hospital-service/      # Finds and ranks nearby hospitals
│   ├── speech-service/        # Handles voice input / speech-to-text
│   ├── classifier-service/    # Classifies emergency type from input
│   ├── notification-service/  # Sends alerts (SMS, push, email)
│   └── location-service/      # Resolves and tracks user location
└── shared/              # Common utilities, types, and constants
```
