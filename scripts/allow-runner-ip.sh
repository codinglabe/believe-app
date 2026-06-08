#!/usr/bin/env bash
# Whitelist one IPv4 for SSH (CSF). Called from GitHub Actions preflight via HTTPS.
#
# One-time server setup (as root):
#   install -m 0755 /home/c3ers/public_html/scripts/allow-runner-ip.sh /usr/local/bin/allow-runner-ip.sh
#   echo 'c3ers ALL=(root) NOPASSWD: /usr/local/bin/allow-runner-ip.sh *' > /etc/sudoers.d/c3ers-deploy-allow
#   chmod 440 /etc/sudoers.d/c3ers-deploy-allow
#
# Also run once: bash scripts/allow-github-actions-csf.sh
set -euo pipefail

IP="${1:-}"
if [ -z "${IP}" ]; then
  echo "Usage: allow-runner-ip.sh <ipv4>" >&2
  exit 1
fi

if ! [[ "${IP}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid IPv4: ${IP}" >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ] && [ -x /usr/local/bin/allow-runner-ip.sh ]; then
  exec sudo -n /usr/local/bin/allow-runner-ip.sh "${IP}"
fi

allow_with_csf() {
  local ip="$1"
  if ! command -v csf >/dev/null 2>&1; then
    return 1
  fi
  csf -a "${ip}" "GitHub Actions deploy runner" 2>/dev/null || true
  if ! csf -g "${ip}" 2>/dev/null | grep -q 'csf.allow'; then
    ALLOW_FILE="/etc/csf/csf.allow"
    if ! grep -qF "${ip}" "${ALLOW_FILE}" 2>/dev/null; then
      echo "${ip} # GitHub Actions deploy runner" >> "${ALLOW_FILE}"
    fi
  fi
  csf -r 2>/dev/null || true
  echo "CSF allowed ${ip}"
}

if [ "$(id -u)" -eq 0 ]; then
  allow_with_csf "${IP}"
  exit 0
fi

if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  sudo -n bash -c "$(declare -f allow_with_csf); allow_with_csf '${IP}'"
  exit 0
fi

echo "CSF not available or no permission to allow ${IP}" >&2
exit 1
