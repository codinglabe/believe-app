#!/usr/bin/env bash
# Install/configure coturn on Hostinger VPS (AlmaLinux 9 + cPanel). Run as root:
#   sudo bash scripts/install-coturn-vps.sh /home/c3ers/public_html/.env
set -euo pipefail

ENV_FILE="${1:-/home/c3ers/public_html/.env}"
TURN_REALM="${WEBRTC_TURN_REALM:-501c3ers.com}"
TURN_USER="${WEBRTC_TURN_USERNAME:-believe501c3}"
TURN_PASS="${WEBRTC_TURN_CREDENTIAL:-}"
PUBLIC_IP="${WEBRTC_TURN_PUBLIC_IP:-72.60.226.88}"

if [[ -f "${ENV_FILE}" ]]; then
  while IFS='=' read -r key value; do
    [[ "${key}" =~ ^#.*$ || -z "${key}" ]] && continue
    value="${value%\"}"
    value="${value#\"}"
    case "${key}" in
      WEBRTC_TURN_USERNAME) TURN_USER="${value}" ;;
      WEBRTC_TURN_CREDENTIAL) TURN_PASS="${value}" ;;
      WEBRTC_TURN_REALM) TURN_REALM="${value}" ;;
      WEBRTC_TURN_PUBLIC_IP) PUBLIC_IP="${value}" ;;
    esac
  done < <(grep -E '^WEBRTC_TURN_(USERNAME|CREDENTIAL|REALM|PUBLIC_IP)=' "${ENV_FILE}" || true)
fi

if [[ -z "${TURN_PASS}" ]]; then
  echo "ERROR: WEBRTC_TURN_CREDENTIAL missing in ${ENV_FILE}"
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: run as root (sudo bash $0)"
  exit 1
fi

echo "Installing coturn on ${PUBLIC_IP} (realm ${TURN_REALM})..."

if ! command -v turnserver >/dev/null 2>&1; then
  dnf install -y epel-release || true
  dnf install -y coturn || yum install -y coturn
fi

mkdir -p /etc/coturn
cat > /etc/coturn/turnserver.conf <<EOF
# Believe In Unity — self-hosted TURN/STUN (${TURN_REALM})
listening-port=3478
tls-listening-port=5349
listening-ip=${PUBLIC_IP}
relay-ip=${PUBLIC_IP}
external-ip=${PUBLIC_IP}
realm=${TURN_REALM}
server-name=turn.${TURN_REALM}
fingerprint
lt-cred-mech
user=${TURN_USER}:${TURN_PASS}
min-port=49152
max-port=65535
no-cli
no-multicast-peers
no-loopback-peers
mobility
total-quota=0
bps-capacity=0
stale-nonce=600
log-file=/var/log/turnserver/turnserver.log
simple-log
EOF

mkdir -p /var/log/turnserver
chmod 755 /var/log/turnserver

if systemctl list-unit-files | grep -q '^coturn\.service'; then
  systemctl enable coturn
  systemctl restart coturn
elif systemctl list-unit-files | grep -q '^turnserver\.service'; then
  systemctl enable turnserver
  systemctl restart turnserver
else
  turnserver -c /etc/coturn/turnserver.conf --daemon
fi

# CSF (cPanel) — open TURN ports if CSF is present
if command -v csf >/dev/null 2>&1; then
  for rule in \
    "3478" "5349" "49152:65535"; do
    csf -a "${rule}" 2>/dev/null || true
  done
  csf -r 2>/dev/null || true
  echo "CSF rules added for TURN ports."
fi

if ss -lun | grep -q ':3478 '; then
  echo "COTURN_OK: listening on UDP 3478"
else
  echo "WARNING: coturn may not be listening on 3478 — check firewall and journalctl -u coturn"
  exit 1
fi
