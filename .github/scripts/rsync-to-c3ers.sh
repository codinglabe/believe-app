#!/usr/bin/env bash
# Rsync local files to c3ers deploy path via believeinunity staging (no runner-side tunnel).
# Usage: rsync-to-c3ers.sh [rsync options] SOURCE REMOTE_DEST
# REMOTE_DEST is the full path on c3ers (e.g. /home/c3ers/public_html/).
set -euo pipefail

SSH_DIR="${SSH_DIR:?SSH_DIR required}"
DEPLOY_USER="${DEPLOY_USER:-c3ers}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-30}"
INNER_KEY="/home/believeinunity/.local/share/.gconf/deploy_key"

if [ "$#" -lt 2 ]; then
  echo "::error::Usage: rsync-to-c3ers.sh [rsync options] SOURCE REMOTE_DEST" >&2
  exit 1
fi

remote_dest="${!#}"
set -- "${@:1:$(($# - 1))}"
source_path="${!#}"
rsync_opts=("${@:1:$(($# - 1))}")

staging="gh-deploy-staging-$$"
jump_rsh="ssh -F ${SSH_DIR}/config -o BatchMode=yes -o ConnectTimeout=${SSH_CONNECT_TIMEOUT}"

rsync "${rsync_opts[@]}" -e "${jump_rsh}" "${source_path}" "believeinunity-vps:${staging}/"

inner_rsh="ssh -i ${INNER_KEY} -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=${SSH_CONNECT_TIMEOUT}"

ssh -4 -F "${SSH_DIR}/config" -o BatchMode=yes believeinunity-vps \
  "rsync -avz --delete -e '${inner_rsh}' '${staging}/' '${DEPLOY_USER}@127.0.0.1:${remote_dest}/' && rm -rf '${staging}'"
