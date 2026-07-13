#!/usr/bin/env bash
# Isolate Redis for each site on the shared VPS (queues + cache + sessions).
# Without unique REDIS_PREFIX, both apps share APP_NAME-based keys and steal each other's jobs —
# YouTube upload jobs then "succeed" with a missing upload row and stay Queued forever.
#
# Run as root:
#   bash /home/believeinunity/public_html/scripts/fix-redis-prefix-isolation.sh
set -euo pipefail

PHP="${PHP_BIN:-/opt/cpanel/ea-php84/root/usr/bin/php}"

set_prefix() {
  local env_file="$1"
  local prefix="$2"
  local user="$3"
  local site_root
  site_root="$(dirname "${env_file}")"

  if [ ! -f "${env_file}" ]; then
    echo "Missing ${env_file}"
    return 1
  fi

  if grep -q '^REDIS_PREFIX=' "${env_file}"; then
    sed -i "s/^REDIS_PREFIX=.*/REDIS_PREFIX=${prefix}/" "${env_file}"
  else
    printf '\nREDIS_PREFIX=%s\n' "${prefix}" >> "${env_file}"
  fi

  chown "${user}:${user}" "${env_file}"
  echo "Set REDIS_PREFIX=${prefix} in ${env_file}"

  sudo -u "${user}" "${PHP}" "${site_root}/artisan" config:clear
  sudo -u "${user}" "${PHP}" "${site_root}/artisan" config:cache
}

set_prefix /home/believeinunity/public_html/.env believeinunity_ believeinunity
set_prefix /home/c3ers/public_html/.env c3ers_ c3ers

# Faster pickup for YouTube / default jobs (was --sleep=3).
for f in /etc/supervisord.d/laravel-queue-believeinunity.ini /etc/supervisord.d/laravel-queue-c3ers.ini; do
  if [ -f "$f" ]; then
    sed -i 's/--queue=default --sleep=3/--queue=default --sleep=1/g' "$f"
    sed -i 's/--queue=mail,default --sleep=3/--queue=mail,default --sleep=1/g' "$f"
  fi
done

supervisorctl reread
supervisorctl update
supervisorctl restart 'laravel-queue-believeinunity:*' 'laravel-queue-c3ers:*' || true

echo "Redis prefix isolation applied. Users may need to sign in again (session keys rotated)."
