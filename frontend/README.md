# Frontend — Road SOS Mobile App

React Native app built with Expo. Shows the user's live GPS location and lets them find nearby emergency services (hospitals, police, roadside assistance) with driving ETAs and tap-to-call contacts.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| Expo Go (phone) | latest | App Store / Play Store |

You do **not** need to install Xcode or Android Studio. Expo Go runs the app directly on your physical device.

## First-time Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Open `.env` and set your laptop's LAN IP address:

```bash
# Find your IP
ipconfig getifaddr en0        # macOS
ip route get 1 | awk '{print $7; exit}'  # Linux
ipconfig | findstr IPv4       # Windows
```

Edit `.env`:
```
EXPO_PUBLIC_BASE_IP=192.168.x.x   # ← replace with your actual IP
```

> Your phone and laptop must be on the **same Wi-Fi network**.

## Run

```bash
npx expo start
```

A QR code appears in the terminal.

- **iOS** — Open the Camera app and scan the QR code.
- **Android** — Open Expo Go and scan the QR code from within the app.

The app loads on your device. Allow location permission when prompted.

## Test the App

1. The app opens showing your live GPS coordinates.
2. Make sure all three backend services are running (see each service's README).
3. Tap **Find Nearby Help**.
4. Three sections load in parallel:
   - **Emergency Numbers** — horizontal strip of quick-dial buttons (112, 100, 108, 1033, etc.)
   - **Medical & Safety** — hospitals, trauma centers, police stations, fire stations with ETAs
   - **Roadside Assistance** — towing services, tyre shops, fuel stations, car repair with ETAs
5. Tap any phone number chip or card to dial it directly.
6. Pull down to refresh with updated location.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Network request failed" | Check `EXPO_PUBLIC_BASE_IP` in `.env` matches `ipconfig getifaddr en0` output |
| QR code doesn't scan | Make sure phone and laptop are on the same Wi-Fi network |
| Location permission denied | Go to phone Settings → Apps → Expo Go → Permissions → Location → Allow |
| App shows blank screen | Check terminal for JS errors; run `npx expo start --clear` to reset cache |
| All fetch errors | Verify all backend services are running on ports 8001, 8002, 8003 |

## Project Structure

```
frontend/
├── App.js          Main app — location, fetching, UI
├── config.js       Service URLs (reads from .env)
├── .env.example    Template — copy to .env and set your IP
└── package.json
```
