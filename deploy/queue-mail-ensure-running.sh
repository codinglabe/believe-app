#!/bin/bash
# Keep dedicated mail-queue workers running (password reset, etc.).
# Each worker processes one job at a time (--sleep=0). Scale MAIL_QUEUE_WORKERS for bursts.
# Install: ~/bin/queue-mail-ensure-running.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/home/believeinunity/public_html}"
PHP_BIN="${PHP_BIN:-/usr/local/bin/php}"
LOG_DIR="${LOG_DIR:-/home/believeinunity/logs}"
MAIL_QUEUE="${MAIL_QUEUE:-mail}"
# Parallel workers; each sends one email per job in FIFO order on the mail queue.
MAIL_QUEUE_WORKERS="${MAIL_QUEUE_WORKERS:-5}"

mkdir -p "$LOG_DIR"

count_mail_workers() {
  local count
  count="$(pgrep -f "${PHP_BIN}.*artisan queue:work --queue=${MAIL_QUEUE}" 2>/dev/null | wc -l | tr -d '[:space:]')"
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
