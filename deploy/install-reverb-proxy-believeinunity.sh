#!/bin/bash
# Run as root on production VPS (WHM terminal or: sudo bash install-reverb-proxy-believeinunity.sh)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/etc/nginx/conf.d/users/believeinunity/believeinunity.org"
TARGET_FILE="${TARGET_DIR}/reverb.conf"

mkdir -p "$TARGET_DIR"
cp "${SCRIPT_DIR}/nginx-reverb-believeinunity.conf" "$TARGET_FILE"
chmod 644 "$TARGET_FILE"

nginx -t
systemctl reload nginx 2>/dev/null || /scripts/restartsrv_httpd 2>/dev/null || service nginx reload

echo "Installed ${TARGET_FILE} and reloaded nginx."
