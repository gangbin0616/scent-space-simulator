#!/bin/bash
set -u

cd "$(dirname "$0")" || exit 1
APP_DIR="$(pwd)"
PID_FILE="$APP_DIR/.scent-space-server.pid"
PORT_FILE="$APP_DIR/.scent-space-server.port"
LOG_FILE="$APP_DIR/.scent-space-server.log"

clear
echo "Scent Space Simulator 서버 실행"
echo "--------------------------------"

if [ ! -f "$APP_DIR/index.html" ]; then
  echo "오류: index.html을 찾을 수 없습니다."
  echo "압축을 푼 폴더 안에서 이 파일을 실행해 주세요."
  sleep 8
  exit 1
fi

if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    PORT="$(cat "$PORT_FILE" 2>/dev/null || echo 4173)"
    echo "이미 실행 중입니다. 브라우저를 다시 엽니다."
    open "http://127.0.0.1:$PORT/#home"
    echo ""
    echo "주소: http://127.0.0.1:$PORT/"
    echo "이 창은 닫아도 됩니다."
    sleep 6
    exit 0
  fi
fi

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  if python - <<'PY' >/dev/null 2>&1
import sys
raise SystemExit(0 if sys.version_info[0] == 3 else 1)
PY
  then
    PYTHON_BIN="$(command -v python)"
  fi
fi

if [ -z "$PYTHON_BIN" ]; then
  echo "오류: Python 3을 찾을 수 없습니다."
  echo "가장 쉬운 방법: 이 폴더의 '1_실행하기.html'을 더블클릭하세요."
  echo "서버 방식이 꼭 필요하면 https://www.python.org/downloads/ 에서 Python 3을 설치하세요."
  sleep 12
  exit 1
fi

PORT=4173
while lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
  if [ "$PORT" -gt 4190 ]; then
    echo "오류: 4173-4190 포트가 모두 사용 중입니다."
    echo "다른 실행 창을 닫거나 '3_Mac_서버_끄기.command'를 실행한 뒤 다시 시도하세요."
    sleep 12
    exit 1
  fi
done

nohup "$PYTHON_BIN" -m http.server "$PORT" --bind 127.0.0.1 --directory "$APP_DIR" > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
sleep 1

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "오류: 서버 실행에 실패했습니다."
  echo "아래 로그를 확인하세요:"
  cat "$LOG_FILE" 2>/dev/null || true
  sleep 12
  exit 1
fi

echo "$SERVER_PID" > "$PID_FILE"
echo "$PORT" > "$PORT_FILE"

open "http://127.0.0.1:$PORT/#home"
echo "실행 완료."
echo ""
echo "주소: http://127.0.0.1:$PORT/"
echo "3D 화면: http://127.0.0.1:$PORT/#viewer"
echo ""
echo "끄는 법: '3_Mac_서버_끄기.command'를 더블클릭하세요."
echo "이 창은 닫아도 됩니다."
sleep 8
