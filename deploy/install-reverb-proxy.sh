#!/bin/bash
# Run as root on the VPS (WHM terminal or: sudo bash install-reverb-proxy.sh)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/etc/nginx/conf.d/users/c3ers/501c3ers.com"
TARGET_FILE="${TARGET_DIR}/reverb.conf"

mkdir -p "$TARGET_DIR"
cp "${SCRIPT_DIR}/nginx-reverb-501c3ers.conf" "$TARGET_FILE"
chmod 644 "$TARGET_FILE"

nginx -t
systemctl reload nginx 2>/dev/null || /scripts/restartsrv_httpd 2>/dev/null || service nginx reload

echo "Installed ${TARGET_FILE} and reloaded nginx."
