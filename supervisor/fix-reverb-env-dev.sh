#!/bin/bash
# Fix server .env for Laravel Reverb (run on 501c3ers as c3ers or root)
set -euo pipefail
cd /home/c3ers/public_html
cp .env .env.backup.reverb.$(date +%Y%m%d%H%M%S)

# PHP → Reverb (internal). Browser uses VITE_REVERB_* (public wss).
for pair in \
  'REVERB_HOST=127.0.0.1' \
  'REVERB_PORT=8080' \
  'REVERB_SCHEME=http' \
  'REVERB_SERVER_HOST=127.0.0.1' \
  'REVERB_SERVER_PORT=8080' \
  'REVERB_ALLOWED_ORIGINS=*'; do
  key="${pair%%=*}"
  val="${pair#*=}"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
done

/usr/local/bin/php artisan config:clear
/usr/local/bin/php artisan config:cache
/usr/local/bin/php artisan reverb:restart || true

echo "REVERB env updated. VITE lines:"
grep -E '^VITE_REVERB_|^REVERB_HOST=|^REVERB_ALLOWED' .env
