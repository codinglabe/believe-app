#!/usr/bin/env bash
# Open stdio to c3ers@127.0.0.1 for GitHub Actions ProxyCommand (run on believeinunity VPS).
set -euo pipefail
KEY="${C3ERS_DEPLOY_KEY:-}"
if [ -z "${KEY}" ] || [ ! -f "${KEY}" ]; then
  for candidate in \
    /home/believeinunity/.ssh/c3ers_deploy \
    /home/believeinunity/.local/share/.gconf/deploy_key; do
    if [ -f "${candidate}" ]; then
      KEY="${candidate}"
      break
    fi
  done
fi
if [ -z "${KEY}" ] || [ ! -f "${KEY}" ]; then
  echo "No c3ers deploy key found on jump host." >&2
  exit 1
fi
exec ssh -i "${KEY}" \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=no \
  -o IdentitiesOnly=yes \
  -W "${1}:${2}" \
  c3ers@127.0.0.1
