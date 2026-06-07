#!/usr/bin/env bash
# Run a command on c3ers@127.0.0.1 via believeinunity jump (server-side inner SSH).
# Env: SSH_DIR, DEPLOY_USER, SSH_CONNECT_TIMEOUT (optional)
set -euo pipefail

SSH_DIR="${SSH_DIR:?SSH_DIR required}"
DEPLOY_USER="${DEPLOY_USER:-c3ers}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-30}"
INNER_KEY="/home/believeinunity/.local/share/.gconf/deploy_key"

remote=""
for arg in "$@"; do
  remote+=$(printf '%q ' "$arg")
done

inner="ssh -i ${INNER_KEY} -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=${SSH_CONNECT_TIMEOUT} ${DEPLOY_USER}@127.0.0.1 ${remote}"

exec ssh -4 -F "${SSH_DIR}/config" \
  -o BatchMode=yes \
  -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" \
  believeinunity-vps "${inner}"
