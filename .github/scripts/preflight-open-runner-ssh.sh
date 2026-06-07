#!/usr/bin/env bash
# Ask the live site to whitelist this GitHub Actions runner for SSH (CSF), then probe port 22.
# Requires repository secret DEPLOY_RUNNER_ALLOW_TOKEN matching server .env DEPLOY_RUNNER_ALLOW_TOKEN.
set -euo pipefail

APP_URL="${APP_URL:-https://501c3ers.com}"
SSH_PORT="${SSH_PORT:-22}"
SSH_CONNECT_HOST="${SSH_CONNECT_HOST:-72.60.226.88}"
TOKEN="${DEPLOY_RUNNER_ALLOW_TOKEN:-}"

RUNNER_IP="$(curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || echo unknown)"
echo "Runner IPv4: ${RUNNER_IP} -> ${SSH_CONNECT_HOST}:${SSH_PORT}"

if [ "${RUNNER_IP}" = "unknown" ]; then
  echo "::warning::Could not detect runner public IPv4."
elif [ -n "${TOKEN}" ]; then
  echo "Requesting server CSF allow for ${RUNNER_IP} via ${APP_URL} ..."
  http_code="$(
    curl -4 -fsS --max-time 30 -o /tmp/deploy-allow-response.txt -w '%{http_code}' \
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
    sleep 3
  elif [ "${http_code}" = "404" ]; then
    echo "::warning::Deploy allow endpoint not deployed yet — run allow-github-actions-csf.sh once on the VPS as root."
  else
    echo "::warning::Deploy allow endpoint returned HTTP ${http_code} (check DEPLOY_RUNNER_ALLOW_TOKEN on server and in GitHub secrets)."
    cat /tmp/deploy-allow-response.txt 2>/dev/null || true
    echo ""
  fi
else
  echo "::warning::DEPLOY_RUNNER_ALLOW_TOKEN not set — skipping automatic CSF allow (run scripts/allow-github-actions-csf.sh on VPS as root once)."
fi

if timeout 8 bash -c "cat < /dev/null > /dev/tcp/${SSH_CONNECT_HOST}/${SSH_PORT}" 2>/dev/null; then
  echo "TCP ${SSH_PORT} reachable on ${SSH_CONNECT_HOST}"
else
  echo "::warning::TCP ${SSH_PORT} not reachable on ${SSH_CONNECT_HOST} from this runner (CSF/firewall may still block SSH auth)."
fi
