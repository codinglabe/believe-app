#!/usr/bin/env bash
# Reliable cPanel SSH for GitHub Actions (IPv4-only, minimal noise).
# Required env: SSH_PRIVATE_KEY, DEPLOY_USER, SSH_DIR
# Optional env: DEPLOY_HOST, SSH_CONNECT_HOST, SSH_PORT (22), SSH_MAX_ATTEMPTS (6), SSH_RETRY_SLEEP (5),
#   SSH_USE_TCP_PROBE (false), SSH_USE_DEPLOY_HOST (false)
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-c3ers}"
DEPLOY_HOST="${DEPLOY_HOST:-501c3ers.com}"
SSH_PORT="${SSH_PORT:-22}"
SSH_CONNECT_HOST="${SSH_CONNECT_HOST:-72.60.226.88}"
SSH_USE_JUMP="${SSH_USE_JUMP:-false}"
SSH_JUMP_USER="${SSH_JUMP_USER:-believeinunity}"
SSH_JUMP_HOST="${SSH_JUMP_HOST:-72.60.226.88}"
SSH_INNER_KEY_PATH="${SSH_INNER_KEY_PATH:-/home/believeinunity/.ssh/c3ers_deploy}"
SSH_C3ERS_PROXY_PATH="${SSH_C3ERS_PROXY_PATH:-/home/believeinunity/bin/c3ers-proxy}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-30}"
SSH_MAX_ATTEMPTS="${SSH_MAX_ATTEMPTS:-10}"
SSH_RETRY_SLEEP="${SSH_RETRY_SLEEP:-8}"
SSH_USE_TCP_PROBE="${SSH_USE_TCP_PROBE:-false}"
SSH_USE_DEPLOY_HOST="${SSH_USE_DEPLOY_HOST:-true}"
SSH_ALLOW_IPV6="${SSH_ALLOW_IPV6:-false}"

if [ -z "${SSH_PRIVATE_KEY:-}" ]; then
  echo "::error::SSH_PRIVATE_KEY is empty (set CPANEL_SSH_KEY secret)."
  exit 1
fi

mkdir -p "${SSH_DIR}"
chmod 700 "${SSH_DIR}"

# Normalize private key (strip CR; support literal \n in GitHub secret).
if printf '%s' "${SSH_PRIVATE_KEY}" | grep -q '\\n'; then
  printf '%b\n' "${SSH_PRIVATE_KEY}" | tr -d '\r' > "${SSH_DIR}/cpanel_deploy"
else
  printf '%s\n' "${SSH_PRIVATE_KEY}" | tr -d '\r' > "${SSH_DIR}/cpanel_deploy"
fi
chmod 600 "${SSH_DIR}/cpanel_deploy"

if ! grep -q 'BEGIN.*PRIVATE KEY' "${SSH_DIR}/cpanel_deploy"; then
  echo "::error::CPANEL_SSH_KEY does not look like an OpenSSH private key (missing BEGIN PRIVATE KEY)."
  exit 1
fi

RUNNER_IP="$(curl -4 -fsS --max-time 8 https://api.ipify.org 2>/dev/null || echo unknown)"
if [ "${SSH_USE_JUMP}" = "true" ]; then
  echo "Runner IPv4: ${RUNNER_IP} -> ${SSH_JUMP_USER}@${SSH_JUMP_HOST}:${SSH_PORT} -> ${DEPLOY_USER}@127.0.0.1"
else
  echo "Runner IPv4: ${RUNNER_IP} -> ${DEPLOY_USER}@${SSH_CONNECT_HOST}:${SSH_PORT}"
fi

request_runner_allow() {
  local token="${DEPLOY_RUNNER_ALLOW_TOKEN:-}"
  local app_url="${APP_URL:-https://501c3ers.com}"
  if [ -z "${token}" ] || [ "${RUNNER_IP}" = "unknown" ]; then
    return 1
  fi
  echo "Requesting CSF allow for ${RUNNER_IP} before SSH..."
  local http_code
  http_code="$(
    curl -4 -sS --max-time 30 -o /tmp/deploy-allow-response.txt -w '%{http_code}' \
      -X POST "${app_url%/}/internal/deploy/allow-runner-ip" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -d "{\"ip\":\"${RUNNER_IP}\"}" || echo "000"
  )"
  if [ "${http_code}" = "200" ]; then
    cat /tmp/deploy-allow-response.txt 2>/dev/null || true
    echo ""
    sleep 3
    return 0
  fi
  echo "::warning::Runner allow request returned HTTP ${http_code}"
  cat /tmp/deploy-allow-response.txt 2>/dev/null || true
  echo ""
  return 1
}

request_runner_allow || true

ssh-keyscan -T 8 -p "${SSH_PORT}" -H "${SSH_CONNECT_HOST}" >> "${SSH_DIR}/known_hosts" 2>/dev/null || true
if [ "${SSH_USE_DEPLOY_HOST}" = "true" ] && [ -n "${DEPLOY_HOST}" ] && [ "${DEPLOY_HOST}" != "${SSH_CONNECT_HOST}" ]; then
  ssh-keyscan -T 8 -p "${SSH_PORT}" -H "${DEPLOY_HOST}" >> "${SSH_DIR}/known_hosts" 2>/dev/null || true
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

write_jump_only_config() {
  local jump_host
  jump_host="$(format_ssh_hostname "${SSH_JUMP_HOST}")"
  printf '%s\n' \
    'Host believeinunity-vps' \
    "  HostName ${jump_host}" \
    "  User ${SSH_JUMP_USER}" \
    "  Port ${SSH_PORT}" \
    "  IdentityFile ${SSH_DIR}/cpanel_deploy" \
    '  IdentitiesOnly yes' \
    '  StrictHostKeyChecking accept-new' \
    '  ServerAliveInterval 15' \
    '  ServerAliveCountMax 4' \
    '  AddressFamily inet' \
    '  IPQoS throughput' \
    '  TCPKeepAlive yes' \
    > "${SSH_DIR}/config"
  chmod 600 "${SSH_DIR}/config"
}

bootstrap_c3ers_on_jump() {
  write_jump_only_config
  if ! ssh -4 -F "${SSH_DIR}/config" -o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" \
    believeinunity-vps "echo JUMP_OK" >/dev/null 2>&1; then
    echo "::error::Cannot SSH to jump host ${SSH_JUMP_USER}@${SSH_JUMP_HOST}"
    return 1
  fi

  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local server_key="/home/believeinunity/.local/share/.gconf/deploy_key"
  local inner_key="/home/believeinunity/.ssh/c3ers_deploy"

  ssh -4 -F "${SSH_DIR}/config" -o BatchMode=yes believeinunity-vps "mkdir -p .ssh bin && chmod 700 .ssh bin"
  scp -F "${SSH_DIR}/config" -o BatchMode=yes "${script_dir}/c3ers-proxy.sh" believeinunity-vps:bin/c3ers-proxy
  ssh -4 -F "${SSH_DIR}/config" -o BatchMode=yes believeinunity-vps \
    "chmod 700 bin/c3ers-proxy && cp -f ${server_key} ${inner_key} && chmod 600 ${inner_key}"

  if ! ssh -4 -F "${SSH_DIR}/config" -o BatchMode=yes believeinunity-vps \
    "ssh -i ${inner_key} -o BatchMode=yes -o StrictHostKeyChecking=no c3ers@127.0.0.1 whoami" 2>/dev/null | grep -qx c3ers; then
    echo "::error::Inner hop failed on jump host (${inner_key} -> c3ers@127.0.0.1)."
    echo "::error::Ensure ${server_key} is authorized for c3ers@127.0.0.1 on the VPS."
    return 1
  fi

  echo "Jump host inner SSH OK (believeinunity -> c3ers@127.0.0.1)."
}

write_jump_ssh_config() {
  local jump_host
  jump_host="$(format_ssh_hostname "${SSH_JUMP_HOST}")"
  printf '%s\n' \
    'Host believeinunity-vps' \
    "  HostName ${jump_host}" \
    "  User ${SSH_JUMP_USER}" \
    "  Port ${SSH_PORT}" \
    "  IdentityFile ${SSH_DIR}/cpanel_deploy" \
    '  IdentitiesOnly yes' \
    '  StrictHostKeyChecking accept-new' \
    '  ServerAliveInterval 15' \
    '  ServerAliveCountMax 4' \
    '  AddressFamily inet' \
    '  IPQoS throughput' \
    '  TCPKeepAlive yes' \
    > "${SSH_DIR}/config"
  printf '%s\n' \
    'Host cpanel-deploy' \
    '  HostName 127.0.0.1' \
    "  User ${DEPLOY_USER}" \
    "  Port ${SSH_PORT}" \
    "  ProxyCommand ssh -F ${SSH_DIR}/config -o BatchMode=yes believeinunity-vps ${SSH_C3ERS_PROXY_PATH} %h %p" \
    '  StrictHostKeyChecking accept-new' \
    '  ServerAliveInterval 15' \
    '  ServerAliveCountMax 4' \
    '  AddressFamily inet' \
    >> "${SSH_DIR}/config"
  chmod 600 "${SSH_DIR}/config"
}

write_ssh_host() {
  if [ "${SSH_USE_JUMP}" = "true" ]; then
    write_jump_ssh_config
    return
  fi

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
    '  ServerAliveCountMax 4' \
    '  AddressFamily inet' \
    '  IPQoS throughput' \
    '  TCPKeepAlive yes' \
    > "${SSH_DIR}/config"
  chmod 600 "${SSH_DIR}/config"
}

tcp_probe() {
  local host="$1"
  timeout 6 bash -c "cat < /dev/null > /dev/tcp/${host}/${SSH_PORT}" 2>/dev/null
}

run_ssh_test() {
  ssh -4 -F "${SSH_DIR}/config" \
    -o BatchMode=yes \
    -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" \
    cpanel-deploy "echo SSH_OK && whoami && hostname"
}

SSH_HOSTS=("${SSH_CONNECT_HOST}")
if [ "${SSH_USE_DEPLOY_HOST}" = "true" ] && [ -n "${DEPLOY_HOST}" ]; then
  if [ "${DEPLOY_HOST}" != "${SSH_CONNECT_HOST}" ]; then
    SSH_HOSTS+=("${DEPLOY_HOST}")
  fi
fi
if [ "${SSH_ALLOW_IPV6}" = "true" ] && [ -n "${SSH_IPV6_HOST:-}" ]; then
  SSH_HOSTS+=("${SSH_IPV6_HOST}")
fi

print_firewall_help() {
  echo "::error::SSH failed after ${SSH_MAX_ATTEMPTS} attempts (${DEPLOY_USER}@${SSH_CONNECT_HOST}:${SSH_PORT})."
  echo "::error::Runner IP ${RUNNER_IP} is blocked by CSF/firewall or the deploy key is wrong."
  echo "::error::ONE-TIME fix (WHM -> Terminal as root):"
  echo "::error::  curl -fsSL https://raw.githubusercontent.com/codinglabe/believe-app/development/scripts/setup-cpanel-deploy-ssh-access.sh | bash"
  echo "::error::Add DEPLOY_RUNNER_ALLOW_TOKEN to GitHub Secrets (printed by setup script)."
  if command -v curl >/dev/null 2>&1; then
    echo "GitHub Actions IPv4 ranges (first 8):"
    curl -fsS --max-time 15 https://api.github.com/meta 2>/dev/null \
      | python3 -c "import json,sys; d=json.load(sys.stdin); [print(x) for x in d.get('actions',[]) if ':' not in x][:8]" 2>/dev/null \
      || true
  fi
}

connected=0
last_err=""
if [ "${SSH_USE_JUMP}" = "true" ]; then
  bootstrap_c3ers_on_jump
fi

for attempt in $(seq 1 "${SSH_MAX_ATTEMPTS}"); do
  if [ "${SSH_USE_JUMP}" = "true" ]; then
    host="${SSH_JUMP_HOST}"
    write_jump_ssh_config
  else
    host="${SSH_HOSTS[$(( (attempt - 1) % ${#SSH_HOSTS[@]} ))]}"
    write_ssh_host "${host}"
  fi

  probe_host="${host}"
  if [[ "${host}" == \[*\] ]]; then
    probe_host="${host#[}"
    probe_host="${probe_host%]}"
  fi

  if [ "${attempt}" -eq 3 ] || [ "${attempt}" -eq 6 ]; then
    request_runner_allow || true
  fi

  if [ "${SSH_USE_TCP_PROBE}" = "true" ] && ! tcp_probe "${probe_host}"; then
    last_err="tcp_unreachable"
    if [ "${attempt}" -eq "${SSH_MAX_ATTEMPTS}" ] || [ "${attempt}" -eq 1 ]; then
      echo "Attempt ${attempt}/${SSH_MAX_ATTEMPTS}: port ${SSH_PORT} not reachable on ${host}"
    fi
    sleep "${SSH_RETRY_SLEEP}"
    continue
  fi

  if out="$(run_ssh_test 2>&1)"; then
    echo "${out}"
    echo "SSH connected on attempt ${attempt} (${host})"
    connected=1
    break
  fi
  last_err="${out}"
  if [ "${attempt}" -eq "${SSH_MAX_ATTEMPTS}" ] || [ "${attempt}" -eq 1 ]; then
    echo "Attempt ${attempt}/${SSH_MAX_ATTEMPTS} failed for ${host}"
    echo "${out}" | tail -8
  fi
  sleep "${SSH_RETRY_SLEEP}"
done

if [ "${connected}" -ne 1 ]; then
  if [ -n "${last_err}" ]; then
    echo "${last_err}" | tail -8
  fi
  print_firewall_help
  exit 1
fi
