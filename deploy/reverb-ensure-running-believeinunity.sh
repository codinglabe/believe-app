#!/bin/bash
# Keep Laravel Reverb running on production (believeinunity.org). Install: ~/bin/reverb-ensure-running.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/home/believeinunity/public_html}"
PHP_BIN="${PHP_BIN:-/usr/local/bin/php}"
LOG_DIR="${LOG_DIR:-/home/believeinunity/logs}"
PID_FILE="${PID_FILE:-/home/believeinunity/logs/reverb.pid}"
HOST="${REVERB_SERVER_HOST:-127.0.0.1}"
PORT="${REVERB_SERVER_PORT:-8080}"

mkdir -p "$LOG_DIR" /home/believeinunity/bin

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  pgrep -f "artisan reverb:start.*--port=${PORT}" >/dev/null 2>&1
}

if is_running; then
  exit 0
fi

cd "$APP_DIR"
nohup "$PHP_BIN" artisan reverb:start --host="$HOST" --port="$PORT" >>"$LOG_DIR/reverb.log" 2>&1 &
echo $! >"$PID_FILE"
echo "$(date -Is) started reverb pid=$(cat "$PID_FILE") host=${HOST} port=${PORT}" >>"$LOG_DIR/reverb.log"
