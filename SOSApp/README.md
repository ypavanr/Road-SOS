# 🚨 SOS Emergency App

A React Native (Expo) app that sends a full emergency alert via a Telegram Bot to one or more authority contacts the moment you press the SOS button.

---

## What the SOS message contains

| Field | Detail |
|---|---|
| **Name / Phone** | From config |
| **Blood Group** | From config |
| **Medical notes** | Allergies, conditions |
| **GPS Coordinates** | Lat / Lon from device GPS |
| **Location accuracy** | ±N metres |
| **Google Maps link** | One-tap navigation for responders |
| **OpenStreetMap link** | Backup map link |
| **Timestamp** | Date + time in IST |
| **Device model** | iPhone / Android model |
| **Battery level** | So responders know if phone may die |
| **Home address** | Static fallback if GPS is poor |

Plus a separate Telegram **location pin** (interactive map preview) is sent automatically.

---

## Quick Start

### 1 — Prerequisites
```
Node 18+, npm/yarn, Expo CLI
npm install -g expo-cli
```

### 2 — Install dependencies
```bash
cd SOSApp
npm install
```

### 3 — Create your Telegram bot
1. Open Telegram → search **@BotFather**
2. Send `/newbot` and follow prompts
3. Copy the **Bot Token** (looks like `123456789:ABC-DEF1234...`)

### 4 — Get authority Chat IDs
- Each person / group that should receive alerts needs to message **@userinfobot** on Telegram
- For a **group**: add your bot to the group, then use the group's negative ID (e.g. `-1001234567890`)

### 5 — Configure the app
Open **`src/config/config.js`** and fill in:

```js
export const TELEGRAM_CONFIG = {
  BOT_TOKEN: '123456789:YOUR-REAL-TOKEN',
  AUTHORITY_CHAT_IDS: [
    '987654321',       // your personal number
    '-1001234567890',  // police group
  ],
};

export const USER_INFO = {
  name:         'Priya Sharma',
  phone:        '+91-98765-43210',
  bloodGroup:   'O+',
  medicalNotes: 'Diabetic, carries insulin',
  address:      '12, MG Road, Bengaluru 560001',
};
```

### 6 — Run
```bash
npx expo start          # scan QR with Expo Go app
# or
npx expo run:android    # build for Android
npx expo run:ios        # build for iOS (Mac required)
```

---

## Project Structure

```
SOSApp/
├── App.js                          ← Root + navigation
├── app.json                        ← Expo config + permissions
├── package.json
├── src/
│   ├── config/
│   │   └── config.js               ← ⚠️  EDIT THIS FIRST
│   ├── screens/
│   │   ├── SOSScreen.js            ← Main SOS button UI
│   │   └── SettingsScreen.js       ← Setup guide + field preview
│   └── services/
│       ├── telegramService.js      ← Sends text + location pin
│       └── locationService.js      ← GPS + battery + device info
```

---

## Permissions required

| Permission | Why |
|---|---|
| `ACCESS_FINE_LOCATION` | Precise GPS coordinates |
| `VIBRATE` | Haptic feedback on SOS trigger |
| `BATTERY_STATS` | Include battery % in message |

---

## How the countdown works

1. User presses SOS → **5-second countdown** starts with pulsing animation + vibration
2. User can **tap again to cancel** during countdown
3. After countdown → GPS fix → Telegram messages sent to all Chat IDs
4. Success: green state + confirmation vibration pattern
5. Failure: error shown with **Retry** button

---

## Security notes

- The Bot Token is stored in `config.js` — **do not commit this to public repos**
- Consider using `expo-secure-store` for production to store the token encrypted
- The bot can only send to Chat IDs you explicitly list — no one else can receive messages

---

## Building for production (standalone APK / IPA)

```bash
npm install -g eas-cli
eas login
eas build --platform android   # or ios
```

---

## License
MIT — use freely, stay safe 🙏
