#!/usr/bin/env bash
# Open stdio to c3ers@127.0.0.1 for GitHub Actions ProxyCommand (run on believeinunity VPS).
set -euo pipefail
KEY="${C3ERS_DEPLOY_KEY:-/home/believeinunity/.ssh/c3ers_deploy}"
exec ssh -i "${KEY}" \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=no \
  -o IdentitiesOnly=yes \
  -W "${1}:${2}" \
  c3ers@127.0.0.1
