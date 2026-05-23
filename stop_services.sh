#!/usr/bin/env bash
# Road SOS — Stop all backend services

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }

ports=(8000 8001 8002 8003 8004 8006 8007)

for port in "${ports[@]}"; do
  PID_FILE="/tmp/road_sos_${port}.pid"
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null; then
      info "Stopping service on port $port (PID: $PID)..."
      kill "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null
      success "Service on port $port stopped."
    else
      warn "Service on port $port (PID: $PID) was already stopped."
    fi
    rm -f "$PID_FILE"
  else
    # Fallback to lsof check
    PID=$(lsof -t -i:"$port" 2>/dev/null)
    if [ -not -z "$PID" ]; then
      info "Stopping service on port $port (PID: $PID)..."
      kill -9 "$PID" 2>/dev/null
      success "Service on port $port stopped."
    fi
  fi
done

