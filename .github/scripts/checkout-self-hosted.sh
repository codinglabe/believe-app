#!/usr/bin/env bash
# Self-hosted VPS checkout: persistent mirror + flock (no actions/checkout ~5 min re-clone).
# First mirror init is slow (~5 min once). Later fetches are incremental (~5–30 s).
set -euo pipefail

: "${GITHUB_SHA:?GITHUB_SHA required}"
: "${GITHUB_WORKSPACE:?GITHUB_WORKSPACE required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN required}"

MIRROR="${HOME}/.cache/believe-app-mirror.git"
LOCK_FILE="${HOME}/.cache/believe-app-mirror.lock"
REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

mkdir -p "$(dirname "${MIRROR}")" "${GITHUB_WORKSPACE}"

# Drop stale git lock files left by crashed/concurrent fetches.
find "${MIRROR}" -maxdepth 1 -name '*.lock' -mmin +10 -delete 2>/dev/null || true

exec 9>"${LOCK_FILE}"
if ! flock -w 600 9; then
  echo "::error::Timed out waiting for mirror lock (${LOCK_FILE})"
  exit 1
fi

if [ ! -d "${MIRROR}/objects" ]; then
  echo "First-time mirror clone (one slow download, then fast incremental fetches)..."
  rm -rf "${MIRROR}"
  GIT_TERMINAL_PROMPT=0 git clone --mirror "${REPO_URL}" "${MIRROR}"
else
  git -C "${MIRROR}" remote set-url origin "${REPO_URL}"
fi

echo "Fetching ${GITHUB_SHA} into mirror..."
GIT_TERMINAL_PROMPT=0 git -C "${MIRROR}" fetch --prune --no-tags origin "${GITHUB_SHA}"

if ! git -C "${MIRROR}" cat-file -e "${GITHUB_SHA}^{commit}" 2>/dev/null; then
  echo "::error::Commit ${GITHUB_SHA} not found in mirror after fetch"
  exit 1
fi

echo "Exporting to ${GITHUB_WORKSPACE}..."
shopt -s dotglob nullglob
for item in "${GITHUB_WORKSPACE}"/* "${GITHUB_WORKSPACE}"/.[!.]* "${GITHUB_WORKSPACE}"/..?*; do
  [ -e "${item}" ] || continue
  rm -rf "${item}"
done

git -C "${MIRROR}" archive "${GITHUB_SHA}" | tar -x -C "${GITHUB_WORKSPACE}"

short_sha="$(git -C "${MIRROR}" rev-parse --short "${GITHUB_SHA}" 2>/dev/null || echo "${GITHUB_SHA:0:7}")"
size="$(du -sh "${GITHUB_WORKSPACE}" | awk '{print $1}')"
echo "Checkout OK: ${short_sha} (${size})"
