#!/usr/bin/env bash
# Allow GitHub Actions runners to SSH into this Hostinger/cPanel VPS (CSF).
# Run on the server as root: bash scripts/allow-github-actions-csf.sh
set -euo pipefail

SSH_PORT="${SSH_PORT:-22}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (WHM root or sudo)."
  exit 1
fi

if ! command -v csf >/dev/null 2>&1; then
  echo "CSF not found. If you use Imunify360/firewalld, allow TCP ${SSH_PORT} from https://api.github.com/meta (actions IPv4)."
  exit 1
fi

echo "Fetching GitHub Actions IPv4 ranges..."
mapfile -t cidrs < <(
  curl -fsS --max-time 30 https://api.github.com/meta \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('\n'.join(x for x in d.get('actions',[]) if ':' not in x))"
)

if [ "${#cidrs[@]}" -eq 0 ]; then
  echo "Could not load GitHub Actions IP ranges."
  exit 1
fi

ALLOW_FILE="/etc/csf/csf.allow"
touch "${ALLOW_FILE}"
added=0
for cidr in "${cidrs[@]}"; do
  if ! grep -qF "${cidr}" "${ALLOW_FILE}" 2>/dev/null; then
    echo "${cidr} # GitHub Actions deploy" >> "${ALLOW_FILE}"
    added=$((added + 1))
  fi
  csf -a "${cidr}" "GitHub Actions deploy" 2>/dev/null || true
done

echo "Added ${added} new entries to ${ALLOW_FILE} (${#cidrs[@]} total GitHub Actions IPv4 ranges)."
csf -r 2>/dev/null || service csf restart 2>/dev/null || true
echo "Done. Re-run GitHub Actions deploy workflow."