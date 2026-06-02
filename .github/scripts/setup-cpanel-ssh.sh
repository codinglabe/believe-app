#!/usr/bin/env bash
# Reliable cPanel SSH for GitHub Actions (IPv4-first, multi-host retries).
# Required env: SSH_PRIVATE_KEY, DEPLOY_USER, DEPLOY_HOST, SSH_DIR
# Optional env: SSH_CONNECT_HOST (default 72.60.226.88), SSH_IPV6_HOST, SSH_PORT (22)
set -euo pipefail

if [ -z "${SSH_PRIVATE_KEY:-}" ]; then
  echo "::error::SSH_PRIVATE_KEY is empty (set CPANEL_SSH_KEY secret)."
  exit 1
fi

SSH_PORT="${SSH_PORT:-22}"
SSH_CONNECT_HOST="${SSH_CONNECT_HOST:-72.60.226.88}"

mkdir -p "${SSH_DIR}"
chmod 700 "${SSH_DIR}"
printf '%s\n' "${SSH_PRIVATE_KEY}" > "${SSH_DIR}/cpanel_deploy"
chmod 600 "${SSH_DIR}/cpanel_deploy"

ssh-keyscan -T 15 -p "${SSH_PORT}" -H "${SSH_CONNECT_HOST}" >> "${SSH_DIR}/known_hosts" 2>/dev/null || true
ssh-keyscan -T 15 -p "${SSH_PORT}" -H "${DEPLOY_HOST}" >> "${SSH_DIR}/known_hosts" 2>/dev/null || true
if [ -n "${SSH_IPV6_HOST:-}" ]; then
  ssh-keyscan -T 15 -p "${SSH_PORT}" -H "${SSH_IPV6_HOST}" >> "${SSH_DIR}/known_hosts" 2>/dev/null || true
fi

if [ -n "${GITHUB_ENV:-}" ]; then
  {
    echo "SSH_DIR=${SSH_DIR}"
    echo "SSH_CMD=ssh -F ${SSH_DIR}/config -o BatchMode=yes -o ConnectTimeout=60 -o AddressFamily=any"
    echo "RSYNC_RSH=ssh -F ${SSH_DIR}/config -o BatchMode=yes -o ConnectTimeout=60 -o AddressFamily=any"
  } >> "${GITHUB_ENV}"
fi

format_ssh_hostname() {
  local host="$1"
  if [[ "${host}" == *:* && "${host}" != \[*\] ]]; then
    printf '[%s]' "${host}"
  else
    printf '%s' "${host}"
  fi
}

write_ssh_host() {
  local host="$1"
  local formatted
  formatted="$(format_ssh_hostname "${host}")"
  printf '%s\n' \
    'Host cpanel-deploy' \
    "  HostName ${formatted}" \
    "  User ${DEPLOY_USER}" \
    "  Port ${SSH_PORT}" \
    "  IdentityFile ${SSH_DIR}/cpanel_deploy" \
    '  IdentitiesOnly yes' \
    '  StrictHostKeyChecking accept-new' \
    '  ServerAliveInterval 30' \
    '  ServerAliveCountMax 6' \
    '  AddressFamily any' \
    > "${SSH_DIR}/config"
  chmod 600 "${SSH_DIR}/config"
}

SSH_TEST="ssh -F ${SSH_DIR}/config -o BatchMode=yes -o ConnectTimeout=60 -o AddressFamily=any cpanel-deploy \"echo SSH_OK && whoami && hostname && pwd\""

SSH_HOSTS=()
for candidate in "${SSH_CONNECT_HOST}" "${DEPLOY_HOST}" "${SSH_IPV6_HOST:-}"; do
  if [ -n "${candidate}" ]; then
    already=0
    for existing in "${SSH_HOSTS[@]:-}"; do
      if [ "${existing}" = "${candidate}" ]; then
        already=1
        break
      fi
    done
    if [ "${already}" -eq 0 ]; then
      SSH_HOSTS+=("${candidate}")
    fi
  fi
done

if [ "${#SSH_HOSTS[@]}" -eq 0 ]; then
  echo "::error::No SSH hosts configured (SSH_CONNECT_HOST / DEPLOY_HOST)."
  exit 1
fi

connected=0
for attempt in $(seq 1 18); do
  host="${SSH_HOSTS[$(( (attempt - 1) % ${#SSH_HOSTS[@]} ))]}"
  write_ssh_host "${host}"
  if [[ "${host}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    if eval "${SSH_TEST}"; then
      echo "SSH connected on attempt ${attempt} (${host})"
      connected=1
      break
    fi
  elif ssh -4 -F "${SSH_DIR}/config" -o BatchMode=yes -o ConnectTimeout=60 cpanel-deploy "echo SSH_OK && whoami && hostname && pwd"; then
    echo "SSH connected on attempt ${attempt} (${host}, IPv4)"
    connected=1
    break
  elif eval "${SSH_TEST}"; then
    echo "SSH connected on attempt ${attempt} (${host})"
    connected=1
    break
  fi
  echo "::warning::SSH attempt ${attempt} failed for ${host}; retrying in 10s..."
  sleep 10
done

if [ "${connected}" -ne 1 ]; then
  echo "::error::SSH to ${DEPLOY_USER}@${SSH_CONNECT_HOST}:${SSH_PORT} failed after 18 attempts (tried: ${SSH_HOSTS[*]})."
  exit 1
fi
