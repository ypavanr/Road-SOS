// Copy .env.example → .env and set EXPO_PUBLIC_BASE_IP to your laptop's LAN IP.
// Find it: run `ipconfig getifaddr en0` in a terminal (macOS).
// Both your phone and laptop must be on the same Wi-Fi network.

const BASE_IP = process.env.EXPO_PUBLIC_BASE_IP;

if (!BASE_IP || BASE_IP === "192.168.x.x") {
  console.warn(
    "[config] EXPO_PUBLIC_BASE_IP is not set. " +
    "Copy frontend/.env.example to frontend/.env and set your LAN IP."
  );
}

export const API_GATEWAY_URL = `http://${BASE_IP}:8000`;
