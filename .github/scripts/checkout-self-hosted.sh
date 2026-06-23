#!/usr/bin/env bash
# Fast checkout for self-hosted VPS runner: persistent bare mirror + git archive.
# Avoids actions/checkout re-downloading the repo from GitHub every job (~3–6 min).
set -euo pipefail

: "${GITHUB_SHA:?GITHUB_SHA required}"
: "${GITHUB_WORKSPACE:?GITHUB_WORKSPACE required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN required}"

MIRROR="${HOME}/.cache/believe-app-mirror.git"
REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

mkdir -p "$(dirname "${MIRROR}")" "${GITHUB_WORKSPACE}"

if [ ! -d "${MIRROR}/objects" ]; then
  echo "Initializing bare mirror at ${MIRROR}"
  git init --bare "${MIRROR}"
  git -C "${MIRROR}" remote add origin "${REPO_URL}"
else
  git -C "${MIRROR}" remote set-url origin "${REPO_URL}"
fi

echo "Fetching ${GITHUB_SHA} (depth=1)..."
git -C "${MIRROR}" fetch --depth=1 --no-tags origin "${GITHUB_SHA}"

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
