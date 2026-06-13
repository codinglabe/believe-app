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

# EPEL systemd unit reads /etc/turnserver/turnserver.conf (see coturn.service).
CONF_PRIMARY="/etc/turnserver/turnserver.conf"
CONF_ALT="/etc/coturn/turnserver.conf"
mkdir -p /etc/turnserver /etc/coturn /var/log/turnserver /var/run/turnserver

# Optional TLS for turns:501c3ers.com:5349 (cPanel AutoSSL / Let's Encrypt)
TLS_CERT=""
TLS_PKEY=""
for cert_pair in \
  "/var/cpanel/ssl/apache_tls/${TURN_REALM}/combined" \
  "/etc/letsencrypt/live/${TURN_REALM}/fullchain.pem" \
  "/etc/ssl/certs/${TURN_REALM}.crt"; do
  if [[ -f "${cert_pair}" ]]; then
    if [[ "${cert_pair}" == *combined ]]; then
      TLS_CERT="${cert_pair}"
      TLS_PKEY="/var/cpanel/ssl/apache_tls/${TURN_REALM}/${TURN_REALM}.key"
    elif [[ "${cert_pair}" == *fullchain.pem ]]; then
      TLS_CERT="${cert_pair}"
      TLS_PKEY="/etc/letsencrypt/live/${TURN_REALM}/privkey.pem"
    else
      TLS_CERT="${cert_pair}"
      TLS_PKEY="/etc/ssl/private/${TURN_REALM}.key"
    fi
    [[ -f "${TLS_PKEY}" ]] && break
    TLS_CERT=""
    TLS_PKEY=""
  fi
done

TLS_LINES=""
if [[ -n "${TLS_CERT}" && -n "${TLS_PKEY}" ]]; then
  TLS_LINES=$'tls-listening-port=5349\ncert='"${TLS_CERT}"$'\npkey='"${TLS_PKEY}"$'\n'
  echo "TLS enabled with cert: ${TLS_CERT}"
else
  echo "TLS not configured (UDP turn:3478 works without TLS)."
fi

cat > "${CONF_PRIMARY}" <<EOF
# Believe In Unity — self-hosted TURN/STUN (${TURN_REALM})
listening-port=3478
listening-ip=0.0.0.0
relay-ip=${PUBLIC_IP}
external-ip=${PUBLIC_IP}
realm=${TURN_REALM}
server-name=turn.${TURN_REALM}
pidfile=/var/run/turnserver/turnserver.pid
fingerprint
lt-cred-mech
user=${TURN_USER}:${TURN_PASS}
min-port=49152
max-port=65535
no-multicast-peers
mobility
total-quota=0
bps-capacity=0
stale-nonce=600
log-file=/var/log/turnserver/turnserver.log
simple-log
no-stdout-log
${TLS_LINES}EOF

cp -f "${CONF_PRIMARY}" "${CONF_ALT}"
chown turnserver:turnserver "${CONF_PRIMARY}" "${CONF_ALT}" 2>/dev/null || true
chmod 640 "${CONF_PRIMARY}" "${CONF_ALT}"
chown -R turnserver:turnserver /var/log/turnserver /var/run/turnserver 2>/dev/null || true
chmod 755 /var/log/turnserver /var/run/turnserver

# Ensure systemd env file exists (coturn.service uses EnvironmentFile=-/etc/sysconfig/turnserver)
mkdir -p /etc/sysconfig
if [[ ! -f /etc/sysconfig/turnserver ]]; then
  echo 'EXTRA_OPTIONS=""' > /etc/sysconfig/turnserver
fi

# Stop orphan daemons from earlier manual installs (multiple listeners on 3478).
systemctl stop coturn 2>/dev/null || true
systemctl stop turnserver 2>/dev/null || true
pkill -x turnserver 2>/dev/null || true
sleep 1

SERVICE=""
if systemctl list-unit-files 2>/dev/null | grep -q '^coturn\.service'; then
  SERVICE="coturn"
elif systemctl list-unit-files 2>/dev/null | grep -q '^turnserver\.service'; then
  SERVICE="turnserver"
fi

if [[ -n "${SERVICE}" ]]; then
  systemctl daemon-reload
  systemctl enable "${SERVICE}"
  systemctl restart "${SERVICE}"
else
  echo "ERROR: coturn systemd unit not found after package install"
  exit 1
fi

# CSF (cPanel) — open TURN ports if CSF is present
if command -v csf >/dev/null 2>&1; then
  for rule in "3478" "5349" "49152:65535"; do
    csf -a "${rule}" 2>/dev/null || true
  done
  csf -r 2>/dev/null || true
  echo "CSF rules added for TURN ports."
fi

# firewalld (AlmaLinux 9 Hostinger VPS) — required for external TURN relay
if command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --permanent --add-port=3478/udp 2>/dev/null || true
  firewall-cmd --permanent --add-port=3478/tcp 2>/dev/null || true
  firewall-cmd --permanent --add-port=49152-65535/udp 2>/dev/null || true
  firewall-cmd --reload 2>/dev/null || true
  echo "firewalld TURN ports opened (3478 udp/tcp, 49152-65535 udp)."
fi

sleep 2

if ! systemctl is-active --quiet "${SERVICE}"; then
  echo "ERROR: ${SERVICE} is not active — journal output:"
  journalctl -u "${SERVICE}" -n 30 --no-pager || true
  exit 1
fi

LISTENERS="$(ss -lunH sport = :3478 2>/dev/null | wc -l | tr -d ' ')"
if [[ "${LISTENERS}" -ge 1 ]]; then
  echo "COTURN_OK: ${SERVICE} active, UDP 3478 listener(s): ${LISTENERS}"
  systemctl status "${SERVICE}" --no-pager -l | head -15 || true
  ss -lun | grep ':3478 ' || true
else
  echo "WARNING: ${SERVICE} active but UDP 3478 not listening — check firewall"
  journalctl -u "${SERVICE}" -n 20 --no-pager || true
  exit 1
fi

echo "Test relay (optional): turnutils_uclient -v -u ${TURN_USER} -w '***' ${PUBLIC_IP}"
