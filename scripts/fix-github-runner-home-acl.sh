#!/usr/bin/env bash
# GitHub Actions runner v2.335+ requires read+execute on /home (and each parent dir).
# cPanel sets /home to 711 with ACL mask --x, which blocks readdir for believeinunity.
# Run once as root on the VPS (or after cPanel resets /home permissions):
#   sudo bash /home/believeinunity/public_html/scripts/fix-github-runner-home-acl.sh
set -euo pipefail

RUNNER_USER="${RUNNER_USER:-believeinunity}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (current: $(id -un))"
  exit 1
fi

if ! id "${RUNNER_USER}" &>/dev/null; then
  echo "User ${RUNNER_USER} not found"
  exit 1
fi

setfacl -m "u:${RUNNER_USER}:r-x,m:r-x" /home

if su - "${RUNNER_USER}" -c 'ls /home >/dev/null'; then
  echo "OK: ${RUNNER_USER} can list /home (ACL mask r-x)."
  getfacl /home | grep -E "user:${RUNNER_USER}|mask::"
else
  echo "Failed: ${RUNNER_USER} still cannot list /home"
  exit 1
fi
