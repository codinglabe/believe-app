#!/bin/bash
# Run as root on VPS — align worker timeouts with longest app jobs.
# default: up to 2h (Excel export, Dropbox/YouTube, large uploads)
# irs-import: up to 3h (ProcessIrsBmfSource)
# mail: 90s (password reset)
set -euo pipefail

patch_ini() {
  local file="$1"
  sed -i 's/--queue=default --sleep=3 --tries=3 --timeout=900 --max-time=3600/--queue=default --sleep=3 --tries=3 --timeout=7200 --max-time=7200/g' "$file"
  sed -i 's/--queue=irs-import --memory=512 --sleep=3 --tries=2 --timeout=600 --max-time=3600/--queue=irs-import --memory=512 --sleep=3 --tries=2 --timeout=10800 --max-time=10800/g' "$file"
  sed -i 's/stopwaitsecs=3600/stopwaitsecs=7200/g' "$file"
  # irs-import program block stopwaitsecs may be 600
  sed -i '/laravel-queue-irs/,/^\[/ s/stopwaitsecs=600/stopwaitsecs=10800/' "$file"
}

for f in /etc/supervisord.d/laravel-queue-c3ers.ini /etc/supervisord.d/laravel-queue-believeinunity.ini; do
  patch_ini "$f"
done

supervisorctl reread
supervisorctl update
supervisorctl restart 'laravel-queue-c3ers:*' 'laravel-queue-believeinunity:*'
echo "Supervisor queue timeouts updated."
