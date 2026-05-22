#!/bin/bash
# Keep dedicated mail-queue workers running (password reset, etc.).
# Each worker processes one job at a time (--sleep=0).
# Install: ~/bin/queue-mail-ensure-running.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/home/believeinunity/public_html}"
PHP_BIN="${PHP_BIN:-/usr/local/bin/php}"
LOG_DIR="${LOG_DIR:-/home/believeinunity/logs}"
MAIL_QUEUE="${MAIL_QUEUE:-mail}"
MAIL_QUEUE_WORKERS="${MAIL_QUEUE_WORKERS:-2}"
LOCK_FILE="${LOG_DIR}/queue-mail-ensure.lock"

mkdir -p "$LOG_DIR"

# Prevent overlapping cron runs
exec 200>"${LOCK_FILE}"
flock -n 200 || exit 0

count_mail_workers() {
  local count
  # Match actual cPanel PHP path (ea-php84), not only /usr/local/bin/php
  count="$(pgrep -u "$(id -u)" -fc "artisan queue:work --queue=${MAIL_QUEUE}" 2>/dev/null || true)"
  if [[ -z "${count}" || ! "${count}" =~ ^[0-9]+$ ]]; then
    echo 0
  else
    echo "${count}"
  fi
}

start_mail_worker() {
  local index="$1"
  cd "$APP_DIR"
  nohup "$PHP_BIN" artisan queue:work \
    --queue="${MAIL_QUEUE}" \
    --sleep=0 \
    --tries=3 \
    --timeout=90 \
    --max-time=3600 \
    >>"${LOG_DIR}/queue-mail-worker-${index}.log" 2>&1 &
  echo "$(date -Is) started mail worker #${index} pid=$! queue=${MAIL_QUEUE}" >>"${LOG_DIR}/queue-mail.log"
}

running="$(count_mail_workers)"
target="${MAIL_QUEUE_WORKERS}"

if [[ "${running}" -ge "${target}" ]]; then
  exit 0
fi

needed=$((target - running))
for i in $(seq 1 "${needed}"); do
  start_mail_worker "$((running + i))"
done
