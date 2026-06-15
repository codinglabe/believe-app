#!/usr/bin/env bash
# Install local developer SSH public key on the Hostinger VPS.
# Run as root on the VPS (WHM Terminal or: ssh root@72.60.226.88):
#
#   bash /home/c3ers/public_html/scripts/install-local-ssh-key-on-vps.sh
#
# Optional: pass a public key file or literal key as first argument.
set -euo pipefail

PUBKEY="${1:-}"
KEY_LABEL="believe-wallet-local"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root." >&2
  exit 1
fi

if [ -z "${PUBKEY}" ]; then
  for candidate in \
    "/home/c3ers/public_html/.ssh-local/believe_wallet_local_ed25519.pub" \
    "/root/believe_wallet_local_ed25519.pub"; do
    if [ -f "${candidate}" ]; then
      PUBKEY="$(cat "${candidate}")"
      break
    fi
  done
fi

if [ -z "${PUBKEY}" ]; then
  echo "Paste your LOCAL public key (one line, ssh-ed25519 ...), then press Ctrl+D:"
  PUBKEY="$(cat)"
fi

PUBKEY="$(echo "${PUBKEY}" | tr -d '\r' | head -1 | sed 's/[[:space:]]*$//')"
if ! echo "${PUBKEY}" | grep -qE '^(ssh-ed25519|ssh-rsa|ecdsa-sha2-)'; then
  echo "ERROR: not a valid SSH public key line." >&2
  exit 1
fi

install_for_user() {
  local user="$1"
  local home
  home="$(getent passwd "${user}" | cut -d: -f6)"
  if [ -z "${home}" ] || [ ! -d "${home}" ]; then
    echo "SKIP: user ${user} not found"
    return 0
  fi

  local ssh_dir="${home}/.ssh"
  local auth_keys="${ssh_dir}/authorized_keys"
  mkdir -p "${ssh_dir}"
  chmod 700 "${ssh_dir}"
  touch "${auth_keys}"
  chmod 600 "${auth_keys}"

  if grep -qF "${PUBKEY}" "${auth_keys}" 2>/dev/null; then
    echo "OK: key already present for ${user}"
    return 0
  fi

  echo "${PUBKEY} ${KEY_LABEL}" >> "${auth_keys}"
  chown -R "${user}:${user}" "${ssh_dir}"
  echo "OK: installed key for ${user} (${auth_keys})"
}

echo "Installing local dev SSH key on VPS..."
install_for_user root
install_for_user believeinunity
install_for_user c3ers

echo ""
echo "Done. From your PC test:"
echo "  ssh believe-vps   whoami    # root"
echo "  ssh believe-prod  whoami    # believeinunity"
echo "  ssh believe-dev   whoami    # c3ers"
