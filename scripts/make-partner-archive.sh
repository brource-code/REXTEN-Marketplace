#!/usr/bin/env bash
# Архив исходников для передачи партнёрам: без зависимостей, сборок, секретов и тяжёлых артефактов.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$HOME/rexten-source-partners-$(date +%Y-%m-%d).tar.gz}"
NAME="$(basename "$ROOT")"
PARENT="$(dirname "$ROOT")"

cd "$PARENT"

tar czf "$OUT" \
  --exclude="$NAME/.git" \
  --exclude="$NAME/node_modules" \
  --exclude="$NAME/**/node_modules" \
  --exclude="$NAME/backend/vendor" \
  --exclude="$NAME/frontend/.next" \
  --exclude="$NAME/frontend/out" \
  --exclude="$NAME/frontend/mobile/.expo" \
  --exclude="$NAME/frontend/mobile/dist" \
  --exclude="$NAME/.env" \
  --exclude="$NAME/.env.local" \
  --exclude="$NAME/.env.production" \
  --exclude="$NAME/.env.development" \
  --exclude="$NAME/**/.env" \
  --exclude="$NAME/**/.env.local" \
  --exclude="$NAME/**/.env.production" \
  --exclude="$NAME/**/.env.development" \
  --exclude="$NAME/**/.env.backup*" \
  --exclude="$NAME/**/.env.bak*" \
  --exclude="$NAME/.cursor" \
  --exclude="$NAME/.trae" \
  --exclude="$NAME/.vscode" \
  --exclude="$NAME/.idea" \
  --exclude="$NAME/ecme-admin.zip" \
  --exclude="$NAME/mobile 2.zip" \
  --exclude="$NAME/rexten-backup-*.tar.gz" \
  --exclude="$NAME/translations_review*.xlsx" \
  --exclude="$NAME/*.log" \
  --exclude="$NAME/.DS_Store" \
  --exclude="$NAME/frontend/ecme-marketplace-deploy-*" \
  --exclude="$NAME/frontend/ecme-marketplace-light-*" \
  --exclude="$NAME/frontend/ecme-marketplace-*.tar.gz" \
  --exclude="$NAME/frontend/ECME-*.tar.gz" \
  --exclude="$NAME/frontend/ecme-marketplace-*.zip" \
  --exclude="$NAME/frontend/mobile.zip" \
  --exclude="$NAME/backend/storage" \
  "$NAME"

echo "Готово: $OUT ($(du -h "$OUT" | cut -f1))"
