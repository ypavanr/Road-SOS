# Notification Service

**Status:** Not yet implemented

Sends real-time alerts to users and emergency contacts when a distress event is triggered.

## Planned Behaviour

- Send push notification to emergency contacts: *"[Name] has triggered an SOS at [location]"*
- SMS fallback via Twilio or AWS SNS for contacts without the app
- Email alert with location map link
- Notify the user when a responder acknowledges the alert

## Planned Implementation

- FastAPI service on port `8005`
- Expo Push Notifications API for in-app alerts
- Twilio SDK for SMS
- SendGrid / SES for email
- Event-driven: triggered by an incident creation event from the API gateway
