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
# Usage: start_service <label> <port> <dir> <venv_dir> <run_cmd>
start_service() {
  local LABEL=$1 PORT=$2 DIR=$3 VENV=$4 CMD=$5
  local LOG="/tmp/road_sos_${PORT}.log"

  if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
    warn "$LABEL already running on port $PORT — skipping."
    return
  fi

  info "Starting $LABEL on port $PORT..."
  (
    cd "$DIR"
    source "$VENV/bin/activate"
    eval "$CMD" > "$LOG" 2>&1 &
    echo $! > "/tmp/road_sos_${PORT}.pid"
  )
  sleep 1
  if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
    success "$LABEL started (log: $LOG)"
  else
    error "$LABEL failed to start. Check $LOG for details."
  fi
}

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}   🚨  Road SOS — Service Launcher       ${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
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

# ── 5. Speech Service (port 8006) ────────────────────────────
# Note: loads Whisper model on startup — needs extra time
info "Starting speech-service on port 8006 (loading Whisper model, please wait ~5s)..."
LOG="/tmp/road_sos_8006.log"
if lsof -ti tcp:8006 >/dev/null 2>&1; then
  warn "speech-service already running on port 8006 — skipping."
else
  (
    cd "$ROOT/backend/services/speech-service"
    source venv/bin/activate
    uvicorn app.main:app --host 0.0.0.0 --port 8006 > "$LOG" 2>&1 &
    echo $! > /tmp/road_sos_8006.pid
  )
  sleep 5
  if lsof -ti tcp:8006 >/dev/null 2>&1; then
    success "speech-service started (log: $LOG)"
  else
    error "speech-service failed to start. Check $LOG for details."
  fi
fi

# ── 6. API Gateway (port 8000) ───────────────────────────────
start_service \
  "api-gateway" 8000 \
  "$ROOT/backend/api-gateway" \
  "$ROOT/backend/api-gateway/venv" \
  "uvicorn main:app --host 0.0.0.0 --port 8000"

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
  "speech-service|8006"
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
echo -e "${GREEN}All services launched! Open Expo to test the mobile app.${NC}"
echo ""
