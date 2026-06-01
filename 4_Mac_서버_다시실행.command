#!/bin/bash
set -u

cd "$(dirname "$0")" || exit 1
APP_DIR="$(pwd)"

clear
echo "Scent Space Simulator 서버 다시 실행"
echo "------------------------------------"

bash "$APP_DIR/3_Mac_서버_끄기.command" --quiet
sleep 1
bash "$APP_DIR/2_Mac_서버로_실행.command"
