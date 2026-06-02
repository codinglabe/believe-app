#!/usr/bin/env bash
# Upsert KEY=value pairs in a Laravel .env file (idempotent). Used by deploy workflows.
set -euo pipefail

ENV_FILE="${1:?Usage: sync-server-env-keys.sh /path/to/.env KEY=value [KEY=value ...]}"
shift

upsert_env() {
  local key="$1"
  local val="$2"

  if grep -q "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "${ENV_FILE}"
  else
    printf '\n%s=%s\n' "${key}" "${val}" >> "${ENV_FILE}"
  fi
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    *=*)
      upsert_env "${1%%=*}" "${1#*=}"
      ;;
    *)
      echo "Invalid argument (expected KEY=value): $1" >&2
      exit 1
      ;;
  esac
  shift
done

echo "Synced server .env keys in ${ENV_FILE}"
