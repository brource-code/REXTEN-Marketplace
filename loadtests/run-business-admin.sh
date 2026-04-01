#!/usr/bin/env bash
# Запуск нагрузочного теста бизнес-админки (k6).
# Из корня репозитория: ./loadtests/run-business-admin.sh
# Доп. аргументы передаются в k6, например smoke: --vus 2 --duration 15s

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/bin:${PATH}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 не найден. Установите: см. loadtests/README.md"
  exit 1
fi

# Docker + nginx: API на :80, путь /api (не прямой порт PHP 8000 на хосте).
export K6_API_URL="${K6_API_URL:-http://127.0.0.1/api}"
export K6_EMAIL="${K6_EMAIL:-business@ecme.com}"
export K6_PASSWORD="${K6_PASSWORD:-password123}"

exec k6 run "$ROOT/loadtests/k6/business-admin.js" "$@"
