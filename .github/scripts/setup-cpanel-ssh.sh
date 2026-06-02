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
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-45}"
SSH_MAX_ATTEMPTS="${SSH_MAX_ATTEMPTS:-24}"
SSH_RETRY_SLEEP="${SSH_RETRY_SLEEP:-8}"

mkdir -p "${SSH_DIR}"
chmod 700 "${SSH_DIR}"
printf '%s\n' "${SSH_PRIVATE_KEY}" > "${SSH_DIR}/cpanel_deploy"
chmod 600 "${SSH_DIR}/cpanel_deploy"

RUNNER_IP="$(curl -4 -fsS --max-time 10 https://ifconfig.me 2>/dev/null || curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || echo unknown)"
echo "GitHub Actions runner public IPv4: ${RUNNER_IP}"
echo "If SSH keeps timing out, allowlist this IP in Hostinger VPS / WHM firewall for port ${SSH_PORT}."

ssh-keyscan -T 10 -p "${SSH_PORT}" -H "${SSH_CONNECT_HOST}" >> "${SSH_DIR}/known_hosts" 2>/dev/null || true
ssh-keyscan -T 10 -p "${SSH_PORT}" -H "${DEPLOY_HOST}" >> "${SSH_DIR}/known_hosts" 2>/dev/null || true
if [ -n "${SSH_IPV6_HOST:-}" ]; then
  ssh-keyscan -T 10 -p "${SSH_PORT}" -H "${SSH_IPV6_HOST}" >> "${SSH_DIR}/known_hosts" 2>/dev/null || true
fi

if [ -n "${GITHUB_ENV:-}" ]; then
  {
    echo "SSH_DIR=${SSH_DIR}"
    echo "SSH_CMD=ssh -F ${SSH_DIR}/config -o BatchMode=yes -o ConnectTimeout=${SSH_CONNECT_TIMEOUT} -4"
    echo "RSYNC_RSH=ssh -F ${SSH_DIR}/config -o BatchMode=yes -o ConnectTimeout=${SSH_CONNECT_TIMEOUT} -4"
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
    '  ServerAliveInterval 15' \
    '  ServerAliveCountMax 8' \
    '  AddressFamily inet' \
    '  IPQoS throughput' \
    '  TCPKeepAlive yes' \
    > "${SSH_DIR}/config"
  chmod 600 "${SSH_DIR}/config"
}

tcp_probe() {
  local host="$1"
  timeout 8 bash -c "cat < /dev/null > /dev/tcp/${host}/${SSH_PORT}" 2>/dev/null
}

run_ssh_test() {
  ssh -4 -F "${SSH_DIR}/config" \
    -o BatchMode=yes \
    -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" \
    cpanel-deploy "echo SSH_OK && whoami && hostname && pwd"
}

# IPv4 first — hostname last (avoids broken IPv6 "Network is unreachable" on runners).
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
for attempt in $(seq 1 "${SSH_MAX_ATTEMPTS}"); do
  host="${SSH_HOSTS[$(( (attempt - 1) % ${#SSH_HOSTS[@]} ))]}"
  write_ssh_host "${host}"

  probe_host="${host}"
  if [[ "${host}" == \[*\] ]]; then
    probe_host="${host#[}"
    probe_host="${probe_host%]}"
  fi

  if ! tcp_probe "${probe_host}"; then
    echo "::warning::TCP port ${SSH_PORT} not reachable on ${host} (attempt ${attempt}/${SSH_MAX_ATTEMPTS})"
    sleep "${SSH_RETRY_SLEEP}"
    continue
  fi

  if run_ssh_test; then
    echo "SSH connected on attempt ${attempt} (${host})"
    connected=1
    break
  fi

  echo "::warning::SSH attempt ${attempt}/${SSH_MAX_ATTEMPTS} failed for ${host}; retrying in ${SSH_RETRY_SLEEP}s..."
  sleep "${SSH_RETRY_SLEEP}"
done

if [ "${connected}" -ne 1 ]; then
  echo "::error::SSH to ${DEPLOY_USER}@${SSH_CONNECT_HOST}:${SSH_PORT} failed after ${SSH_MAX_ATTEMPTS} attempts (tried: ${SSH_HOSTS[*]}). Runner IP was ${RUNNER_IP} — allowlist GitHub Actions IPs in Hostinger or re-run the workflow."
  exit 1
fi
