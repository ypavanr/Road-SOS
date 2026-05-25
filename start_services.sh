#!/usr/bin/env bash
# Road SOS — Start all backend services
# Run this from the project root: ./start_services.sh
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Helper: start a service ───────────────────────────────────
# Usage: start_service <label> <port> <dir> <venv_dir> <run_cmd> [sleep_time]
start_service() {
  local LABEL=$1 PORT=$2 DIR=$3 VENV=$4 CMD=$5 SLEEP_TIME=${6:-1}
  local LOG="/tmp/road_sos_${PORT}.log"

  if command -v lsof >/dev/null 2>&1; then
    if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
      warn "$LABEL already running on port $PORT — skipping."
      return
    fi
  fi

  info "Starting $LABEL on port $PORT..."
  (
    cd "$DIR"

    # 1. Cross-platform VENV activation (Windows uses Scripts, Mac/Linux uses bin)
    if [ -f "$VENV/Scripts/activate" ]; then
      source "$VENV/Scripts/activate"
    elif [ -f "$VENV/bin/activate" ]; then
      source "$VENV/bin/activate"
    else
      warn "Virtual environment not found at $VENV. Creating one now..."
      python -m venv "$VENV" || python3 -m venv "$VENV"
      if [ -f "$VENV/Scripts/activate" ]; then
        source "$VENV/Scripts/activate"
      else
        source "$VENV/bin/activate"
      fi
    fi

    # 2. Automatically install/update requirements
    if [ -f "requirements.txt" ]; then
      # -q hides output unless there is an error
      pip install -r requirements.txt -q
    fi

    # 3. Start the service
    eval "$CMD" > "$LOG" 2>&1 &
    echo $! > "/tmp/road_sos_${PORT}.pid"
  )
  sleep $SLEEP_TIME
  
  if command -v lsof >/dev/null 2>&1; then
    if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
      success "$LABEL started (log: $LOG)"
    else
      error "$LABEL failed to start. Check $LOG for details."
    fi
  else
    success "$LABEL started (log: $LOG) - Port checking skipped (lsof missing)"
  fi
}

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}   🚨  Road SOS — Service Launcher       ${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

# ── Auto-update EXPO_PUBLIC_BASE_IP in frontend/.env ───────────
LOCAL_IP=$(python3 -c "
import socket
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(('10.255.255.255', 1))
    print(s.getsockname()[0])
except Exception:
    print('127.0.0.1')
finally:
    s.close()
" 2>/dev/null)

if [ -n "$LOCAL_IP" ] && [ "$LOCAL_IP" != "127.0.0.1" ]; then
  ENV_FILE="$ROOT/frontend/.env"
  if [ -f "$ENV_FILE" ]; then
    info "Auto-updating EXPO_PUBLIC_BASE_IP to $LOCAL_IP in frontend/.env"
    if grep -q "^EXPO_PUBLIC_BASE_IP=" "$ENV_FILE"; then
      awk -v ip="$LOCAL_IP" '/^EXPO_PUBLIC_BASE_IP=/{print "EXPO_PUBLIC_BASE_IP="ip; next} 1' "$ENV_FILE" > "${ENV_FILE}.tmp"
      mv "${ENV_FILE}.tmp" "$ENV_FILE"
    else
      echo "EXPO_PUBLIC_BASE_IP=$LOCAL_IP" >> "$ENV_FILE"
    fi
  else
    warn "frontend/.env not found, creating one with EXPO_PUBLIC_BASE_IP=$LOCAL_IP"
    echo "EXPO_PUBLIC_BASE_IP=$LOCAL_IP" > "$ENV_FILE"
  fi
else
  warn "Could not determine local IP automatically."
fi
echo ""

# ── 1. Hospital Service (port 8001) ──────────────────────────
start_service \
  "hospital-service" 8001 \
  "$ROOT/backend/services/hospital-service" \
  "$ROOT/backend/services/hospital-service/.venv" \
  "python main.py"

# ── 2. Roadside Service (port 8002) ──────────────────────────
start_service \
  "roadside-service" 8002 \
  "$ROOT/backend/services/roadside-service" \
  "$ROOT/backend/services/roadside-service/.venv" \
  "python main.py"

# ── 3. Emergency Contacts Service (port 8003) ─────────────────
start_service \
  "emergency-contacts-service" 8003 \
  "$ROOT/backend/services/emergency-contacts-service" \
  "$ROOT/backend/services/emergency-contacts-service/.venv" \
  "python main.py"

# ── 4. Classifier Service (port 8004) ─────────────────────────
start_service \
  "classifier-service" 8004 \
  "$ROOT/backend/services/classifier-service" \
  "$ROOT/backend/services/classifier-service/venv" \
  "uvicorn app.main:app --host 0.0.0.0 --port 8004"

# ── 4b. Route Service (port 8005) ─────────────────────────────
start_service \
  "route-service" 8005 \
  "$ROOT/backend/services/route-service" \
  "$ROOT/backend/services/route-service/.venv" \
  "uvicorn main:app --host 0.0.0.0 --port 8005"

# ── 5. Speech Service (port 8006) ────────────────────────────
# Note: loads Whisper model on startup — needs extra time
info "Starting speech-service on port 8006 (loading Whisper model, please wait ~5s)..."
start_service \
  "speech-service" 8006 \
  "$ROOT/backend/services/speech-service" \
  "$ROOT/backend/services/speech-service/venv" \
  "uvicorn app.main:app --host 0.0.0.0 --port 8006" \
  5

# ── 6. API Gateway (port 8000) ───────────────────────────────
start_service \
  "api-gateway" 8000 \
  "$ROOT/backend/api-gateway" \
  "$ROOT/backend/api-gateway/venv" \
  "uvicorn main:app --host 0.0.0.0 --port 8000"

# ── 7. SOS Service (port 8007) ───────────────────────────────
start_service \
  "sos-service" 8007 \
  "$ROOT/backend/services/sos-service" \
  "$ROOT/backend/services/sos-service/.venv" \
  "python main.py"

# ── Health Check Summary ──────────────────────────────────────
echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}   Health Check Summary${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"

services=(
  "api-gateway|8000"
  "hospital-service|8001"
  "roadside-service|8002"
  "emergency-contacts-service|8003"
  "classifier-service|8004"
  "route-service|8005"
  "speech-service|8006"
  "sos-service|8007"
)

for entry in "${services[@]}"; do
  IFS="|" read -r name port <<< "$entry"
  RESULT=$(curl -s --max-time 2 "http://localhost:${port}/health" 2>/dev/null)
  if echo "$RESULT" | grep -q '"ok"'; then
    success "$name  :${port}  ✓"
  else
    error  "$name  :${port}  ✗  (not responding)"
  fi
done

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}   Quick Test Commands${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""
echo "Test classifier (tire burst + injuries):"
echo "  curl -X POST http://localhost:8000/classify \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"text\": \"My tyre burst and I crashed, chest hurts\"}'"
echo ""
echo "Test nearby medical facilities (Bengaluru coords):"
echo "  curl -X POST http://localhost:8000/nearby/medical \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"lat\": 12.9716, \"lon\": 77.5946, \"radius_m\": 5000}'"
echo ""
echo "Test emergency contacts:"
echo "  curl 'http://localhost:8000/contacts?lat=12.9716&lon=77.5946'"
echo ""
echo "Test route service (Bengaluru coords):"
echo "  curl -X POST http://localhost:8000/route \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"source_lat\": 12.97, \"source_lon\": 77.59, \"dest_lat\": 12.98, \"dest_lon\": 77.60}'"
echo ""
echo -e "${GREEN}All services launched! Open Expo to test the mobile app.${NC}"
echo ""

echo -e "${YELLOW}Streaming live logs from all services... (Press Ctrl+C to stop watching logs)${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
tail -f /tmp/road_sos_*.log
