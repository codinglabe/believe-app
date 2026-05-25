#!/bin/bash
# Production performance — run on server in app root (believeinunity or c3ers).
set -euo pipefail
cd "${1:-$(pwd)}"
PHP="${PHP:-/usr/local/bin/php}"

echo "Optimizing Laravel at $(pwd) ..."
$PHP artisan config:cache
$PHP artisan event:cache
$PHP artisan view:cache
$PHP artisan route:cache
$PHP artisan about | grep -E 'Config|Events|Routes|Views|Debug'

echo "Done. Ensure .env has APP_DEBUG=false and LOG_LEVEL=error on production."
