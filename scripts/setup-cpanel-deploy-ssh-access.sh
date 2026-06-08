#!/usr/bin/env bash
# One-time VPS setup so GitHub Actions can SSH deploy (CSF + per-runner HTTPS allow).
# Run as root in WHM -> Terminal:
#   curl -fsSL https://raw.githubusercontent.com/codinglabe/believe-app/development/scripts/setup-cpanel-deploy-ssh-access.sh | bash
#
# Or from an existing checkout on the server:
#   bash scripts/setup-cpanel-deploy-ssh-access.sh
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-c3ers}"
DEPLOY_PATH="${DEPLOY_PATH:-/home/${DEPLOY_USER}/public_html}"
SCRIPT_SRC="${SCRIPT_SRC:-${DEPLOY_PATH}/scripts/allow-runner-ip.sh}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (WHM -> Terminal)." >&2
  exit 1
fi

if [ ! -f "${SCRIPT_SRC}" ]; then
  echo "Missing ${SCRIPT_SRC}. Deploy app code first or set SCRIPT_SRC." >&2
  exit 1
fi

echo "==> Allow all GitHub Actions IPv4 ranges in CSF (permanent)"
bash "${DEPLOY_PATH}/scripts/allow-github-actions-csf.sh"

echo "==> Install per-runner allow script for HTTPS preflight"
install -m 0755 "${SCRIPT_SRC}" /usr/local/bin/allow-runner-ip.sh

SUDOERS="/etc/sudoers.d/${DEPLOY_USER}-deploy-allow"
echo "${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/local/bin/allow-runner-ip.sh *" > "${SUDOERS}"
chmod 440 "${SUDOERS}"
visudo -cf "${SUDOERS}" >/dev/null

TOKEN="${DEPLOY_RUNNER_ALLOW_TOKEN:-}"
if [ -z "${TOKEN}" ]; then
  TOKEN="$(openssl rand -hex 32)"
fi

ENV_FILE="${DEPLOY_PATH}/.env"
if [ -f "${ENV_FILE}" ]; then
  if grep -q '^DEPLOY_RUNNER_ALLOW_TOKEN=' "${ENV_FILE}"; then
    sed -i "s|^DEPLOY_RUNNER_ALLOW_TOKEN=.*|DEPLOY_RUNNER_ALLOW_TOKEN=${TOKEN}|" "${ENV_FILE}"
  else
    printf '\nDEPLOY_RUNNER_ALLOW_TOKEN=%s\n' "${TOKEN}" >> "${ENV_FILE}"
  fi
  echo "==> Wrote DEPLOY_RUNNER_ALLOW_TOKEN to ${ENV_FILE}"
else
  echo "::warning::${ENV_FILE} not found — add DEPLOY_RUNNER_ALLOW_TOKEN manually."
fi

echo ""
echo "Done. Next steps:"
echo "1) GitHub repo -> Settings -> Secrets -> Actions -> New secret"
echo "   Name:  DEPLOY_RUNNER_ALLOW_TOKEN"
echo "   Value: ${TOKEN}"
echo "2) Re-run the Deploy development workflow."
echo ""
echo "Verify HTTPS allow endpoint (from any machine):"
echo "  curl -sS -X POST https://501c3ers.com/internal/deploy/allow-runner-ip \\"
echo "    -H \"Authorization: Bearer ${TOKEN}\" -H \"Content-Type: application/json\" \\"
echo "    -d '{\"ip\":\"1.2.3.4\"}'"
