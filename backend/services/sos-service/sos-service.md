# SOS Service

**Port:** `8007`

A backend microservice responsible for centralizing emergency dispatch configurations and routing emergency alerts securely via Telegram. By moving this logic to the backend, the mobile application no longer requires hardcoded API tokens or personal user data in its source code.

**Dispatch Pipeline:**
1. **Configuration Retrieval**: The frontend calls this service on startup to securely load emergency SMS numbers and user profile data.
2. **Telegram Dispatch**: Upon triggering an SOS, the frontend sends the user's GPS coordinates to this service, which formats an urgent markdown message and dispatches it directly to the Telegram API using a secure bot token.

## Prerequisites

- Python 3.10+
- A Telegram Bot Token (created via @BotFather on Telegram)

## First-time Setup

**macOS / Linux / zsh:**
```bash
cd backend/services/sos-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Windows (PowerShell):**
```powershell
cd backend\services\sos-service
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your details:
- `TELEGRAM_BOT_TOKEN`: Your bot token.
- `TELEGRAM_CHAT_IDS`: Comma-separated list of authority chat IDs.
- `SMS_NUMBERS`: Comma-separated list of phone numbers.
- `USER_NAME`, `USER_PHONE`, `USER_MEDICAL_NOTES`, `USER_ADDRESS`: Details of the person using the app.

## Run

**macOS / Linux / zsh:**
```bash
cd backend/services/sos-service
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8007
```

**Windows (PowerShell):**
```powershell
cd backend\services\sos-service
venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8007
```

*Note: `--host 0.0.0.0` is required so your phone can connect over local Wi-Fi.*

## API Reference

### `GET /config`

Returns the configured user details and SMS emergency contacts.

**Expected Response (Success):**
```json
{
  "user_info": {
    "name": "Jane Doe",
    "phone": "+91 98765 43210",
    "medicalNotes": "None",
    "address": "123 Main St, City, Country"
  },
  "sms_numbers": [
    "+919876543210",
    "+911234567890"
  ]
}
```

### `POST /telegram`

Accepts JSON payload with location data and dispatches an alert to all configured Telegram chat IDs. It also sends a live location pin.

| Field | Type | Description |
|---|---|---|
| `latitude` | Float | GPS Latitude |
| `longitude` | Float | GPS Longitude |
| `accuracy` | Float | GPS Accuracy (meters) |
| `timestamp` | Integer | Epoch timestamp of the alert |
| `batteryLevel` | Float | Device battery level (Optional) |
| `deviceModel` | String | Device model name (Optional) |

**Expected Response (Success):**
```json
{
  "success": true,
  "errors": []
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8007` | Listening port |
| `TELEGRAM_BOT_TOKEN` | — | API Token from @BotFather |
| `TELEGRAM_CHAT_IDS` | — | Comma-separated target chat IDs |
| `SMS_NUMBERS` | — | Comma-separated SMS contacts |
| `USER_NAME` | `Your Name` | Name of the person in distress |
| `USER_PHONE` | `+91 00000 00000` | Phone of the person in distress |
| `USER_MEDICAL_NOTES`| `None` | Relevant medical information |
| `USER_ADDRESS` | `123 Main St...` | Home address of the user |

## Troubleshooting

- **Telegram message not arriving**: Ensure your `TELEGRAM_BOT_TOKEN` is correct. You must also ensure that the recipient accounts have started a conversation with your bot first, otherwise the bot cannot send them messages.
- **Connection refused / Timeout**: Ensure your backend is running with `--host 0.0.0.0` and that your phone and laptop are on the exact same Wi-Fi network.
