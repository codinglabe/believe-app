#!/bin/bash
# Remove dev/docs artifacts from public_html (run on server after deploy or manually).
set -euo pipefail
APP_DIR="${1:-$(pwd)}"
cd "$APP_DIR"
rm -rf docs tests node_modules .deploy deploy .ssh-deploy .ssh-deploy-prod .phpunit.cache bootstrap/ssr 2>/dev/null || true
rm -f CLAUDE.md README.md COMMAND_IN_PRODUCTION.md phpunit.xml .editorconfig eslint.config.js \
  .prettierignore .prettierrc .gitattributes .gitignore Homestead.yaml Homestead.json \
  tsconfig.json components.json package.json package-lock.json vite.config.ts 2>/dev/null || true
rm -f .env.backup .env.before-sync .env.production .env.backup- 2>/dev/null || true
rm -f resources/js/components/wallet/*.md resources/js/components/merchant/README.md 2>/dev/null || true
echo "Pruned non-runtime files in ${APP_DIR}"
