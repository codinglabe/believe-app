#!/bin/bash
set -euo pipefail
cd "${1:-/home/c3ers/public_html}"
KEY=$(grep '^REVERB_APP_KEY=' .env | cut -d= -f2-)
HOST=$(grep '^REVERB_HOST=' .env | cut -d= -f2- | tr -d '"')
PORT=$(grep '^REVERB_PORT=' .env | cut -d= -f2- | tr -d ' ')
SCHEME=$(grep '^REVERB_SCHEME=' .env | cut -d= -f2- | tr -d ' ')
sed -i "s|^VITE_REVERB_APP_KEY=.*|VITE_REVERB_APP_KEY=${KEY}|" .env
sed -i "s|^VITE_REVERB_HOST=.*|VITE_REVERB_HOST=${HOST}|" .env
sed -i "s|^VITE_REVERB_PORT=.*|VITE_REVERB_PORT=${PORT}|" .env
sed -i "s|^VITE_REVERB_SCHEME=.*|VITE_REVERB_SCHEME=${SCHEME}|" .env
grep '^VITE_REVERB' .env
