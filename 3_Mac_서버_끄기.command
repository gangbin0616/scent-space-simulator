#!/bin/bash
set -u

cd "$(dirname "$0")" || exit 1
APP_DIR="$(pwd)"
PID_FILE="$APP_DIR/.scent-space-server.pid"
PORT_FILE="$APP_DIR/.scent-space-server.port"
QUIET="${1:-}"

if [ "$QUIET" != "--quiet" ]; then
  clear
  echo "Scent Space Simulator 서버 끄기"
  echo "--------------------------------"
fi

STOPPED=0

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    STOPPED=1
  fi
fi

if [ "$STOPPED" -eq 0 ] && [ -f "$PORT_FILE" ]; then
  PORT="$(cat "$PORT_FILE" 2>/dev/null || echo 4173)"
  for PID in $(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null); do
    CMD="$(ps -p "$PID" -o command= 2>/dev/null || true)"
    if echo "$CMD" | grep -q "http.server"; then
      kill "$PID" 2>/dev/null || true
      STOPPED=1
    fi
  done
fi

rm -f "$PID_FILE" "$PORT_FILE"

if [ "$QUIET" != "--quiet" ]; then
  if [ "$STOPPED" -eq 1 ]; then
    echo "서버를 껐습니다."
  else
    echo "켜져 있는 서버가 없습니다. 이미 꺼진 상태입니다."
  fi
  echo "브라우저 창은 직접 닫으면 됩니다."
  sleep 6
fi
