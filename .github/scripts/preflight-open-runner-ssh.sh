#!/usr/bin/env bash
# Open SSH for this GitHub Actions runner (CSF allow via HTTPS), then verify port 22.
# Requires repository secret DEPLOY_RUNNER_ALLOW_TOKEN matching server .env DEPLOY_RUNNER_ALLOW_TOKEN
# after one-time: bash scripts/setup-cpanel-deploy-ssh-access.sh (as root on VPS).
set -euo pipefail

APP_URL="${APP_URL:-https://501c3ers.com}"
SSH_PORT="${SSH_PORT:-22}"
SSH_CONNECT_HOST="${SSH_CONNECT_HOST:-72.60.226.88}"
TOKEN="${DEPLOY_RUNNER_ALLOW_TOKEN:-}"
PROBE_RETRIES="${PROBE_RETRIES:-12}"
PROBE_SLEEP="${PROBE_SLEEP:-2}"

RUNNER_IP="$(curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || echo unknown)"
echo "Runner IPv4: ${RUNNER_IP} -> ${SSH_CONNECT_HOST}:${SSH_PORT}"

print_fix_instructions() {
  echo "::error::GitHub Actions cannot reach SSH on ${SSH_CONNECT_HOST}:${SSH_PORT} (runner ${RUNNER_IP})."
  echo "::error::CSF/firewall is blocking deploy SSH."
  echo ""
  echo "::error::ONE-TIME fix — WHM -> Terminal as root:"
  echo "::error::  curl -fsSL https://raw.githubusercontent.com/codinglabe/believe-app/development/scripts/setup-cpanel-deploy-ssh-access.sh | bash"
  echo ""
  echo "::error::Then add GitHub repo secret (Settings -> Secrets -> Actions):"
  echo "::error::  Name:  DEPLOY_RUNNER_ALLOW_TOKEN"
  echo "::error::  Value: (token printed by the setup script — same as server .env)"
  echo ""
  echo "::error::Re-run the deploy workflow."
}

tcp_reachable() {
  timeout 8 bash -c "cat < /dev/null > /dev/tcp/${SSH_CONNECT_HOST}/${SSH_PORT}" 2>/dev/null
}

request_server_allow() {
  if [ "${RUNNER_IP}" = "unknown" ]; then
    echo "::warning::Could not detect runner public IPv4."
    return 1
  fi
  if [ -z "${TOKEN}" ]; then
    return 1
  fi

  echo "Requesting CSF allow for ${RUNNER_IP} via ${APP_URL} ..."
  local http_code
  http_code="$(
    curl -4 -sS --max-time 45 -o /tmp/deploy-allow-response.txt -w '%{http_code}' \
      -X POST "${APP_URL%/}/internal/deploy/allow-runner-ip" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -d "{\"ip\":\"${RUNNER_IP}\"}" || echo "000"
  )"

  if [ "${http_code}" = "200" ]; then
    cat /tmp/deploy-allow-response.txt 2>/dev/null || true
    echo ""
    echo "Server acknowledged runner IP allow request."
    return 0
  fi

  if [ "${http_code}" = "404" ]; then
    echo "::error::Deploy allow endpoint returned 404 (not_configured). Run setup-cpanel-deploy-ssh-access.sh on the VPS as root once."
  elif [ "${http_code}" = "401" ]; then
    echo "::error::Deploy allow endpoint unauthorized — DEPLOY_RUNNER_ALLOW_TOKEN must match server .env exactly."
  elif [ "${http_code}" = "500" ]; then
    echo "::error::Deploy allow endpoint failed (sudo/csf). Run setup-cpanel-deploy-ssh-access.sh on the VPS as root."
    cat /tmp/deploy-allow-response.txt 2>/dev/null || true
    echo ""
  else
    echo "::error::Deploy allow endpoint returned HTTP ${http_code}."
    cat /tmp/deploy-allow-response.txt 2>/dev/null || true
    echo ""
  fi
  return 1
}

wait_for_ssh_port() {
  local attempt
  for attempt in $(seq 1 "${PROBE_RETRIES}"); do
    if tcp_reachable; then
      echo "TCP ${SSH_PORT} reachable on ${SSH_CONNECT_HOST} (attempt ${attempt}/${PROBE_RETRIES})"
      return 0
    fi
    if [ "${attempt}" -lt "${PROBE_RETRIES}" ]; then
      echo "Waiting for SSH port (${attempt}/${PROBE_RETRIES})..."
      sleep "${PROBE_SLEEP}"
    fi
  done
  return 1
}

# Already open (permanent GitHub Actions CSF allow on VPS) — no token needed.
if tcp_reachable; then
  echo "SSH port already reachable — skipping CSF allow."
  exit 0
fi

if [ -z "${TOKEN}" ]; then
  echo "::error::DEPLOY_RUNNER_ALLOW_TOKEN is not set in GitHub Secrets."
  print_fix_instructions
  exit 1
fi

if ! request_server_allow; then
  print_fix_instructions
  exit 1
fi

sleep 2

if wait_for_ssh_port; then
  exit 0
fi

print_fix_instructions
exit 1
