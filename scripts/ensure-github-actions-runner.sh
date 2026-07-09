#!/usr/bin/env bash
# Keep the GitHub Actions self-hosted runner (believe-vps) online after reboot.
# Run once on the VPS as believeinunity:
#   bash /home/believeinunity/public_html/scripts/ensure-github-actions-runner.sh
#
# If jobs fail with "Access to the path '/home' is denied", run as root first:
#   sudo bash /home/believeinunity/public_html/scripts/fix-github-runner-home-acl.sh
set -euo pipefail

RUNNER_USER="${RUNNER_USER:-believeinunity}"
RUNNER_DIR="${RUNNER_DIR:-/home/believeinunity/actions-runner}"
LOG_DIR="${LOG_DIR:-/home/believeinunity/logs}"
SERVICE_NAME="github-actions-runner"

if [ "$(id -un)" != "${RUNNER_USER}" ]; then
  echo "Run as ${RUNNER_USER} (current: $(id -un))"
  exit 1
fi

mkdir -p "${LOG_DIR}"
if [ ! -x "${RUNNER_DIR}/run.sh" ]; then
  echo "Runner not found at ${RUNNER_DIR}/run.sh — install the runner first."
  exit 1
fi

UNIT_PATH="${HOME}/.config/systemd/user/${SERVICE_NAME}.service"
mkdir -p "$(dirname "${UNIT_PATH}")"

cat > "${UNIT_PATH}" <<EOF
[Unit]
Description=GitHub Actions self-hosted runner (believe-vps)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${RUNNER_DIR}
ExecStart=${RUNNER_DIR}/run.sh
Restart=always
RestartSec=10
Environment=HOME=${HOME}

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable "${SERVICE_NAME}"
systemctl --user restart "${SERVICE_NAME}" || true

if command -v loginctl >/dev/null 2>&1; then
  loginctl enable-linger "${RUNNER_USER}" 2>/dev/null || true
fi

if systemctl --user is-active --quiet "${SERVICE_NAME}"; then
  echo "Runner service active (systemd user unit)."
else
  echo "systemd user unit not active — falling back to nohup + crontab @reboot"
  pkill -f 'Runner.Listener' 2>/dev/null || true
  sleep 2
  nohup "${RUNNER_DIR}/run.sh" >> "${LOG_DIR}/gh-runner.log" 2>&1 &
  (crontab -l 2>/dev/null | grep -v github-actions-runner || true
   echo "@reboot sleep 30 && cd ${RUNNER_DIR} && nohup ./run.sh >> ${LOG_DIR}/gh-runner.log 2>&1 &") | crontab -
fi

pgrep -af 'Runner.Listener' || echo "Warning: Runner.Listener not running yet"
