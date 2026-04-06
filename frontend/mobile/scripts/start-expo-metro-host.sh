#!/usr/bin/env bash
# Запуск Expo так, чтобы ссылки вели на публичный хост (Cloudflare Tunnel → Metro :8081).
# Перед этим в Zero Trust: Public Hostname metro.rexten.live → http://127.0.0.1:8081
set -euo pipefail
cd "$(dirname "$0")/.."

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use 20 2>/dev/null || true
fi

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export EXPO_METRO_HOST="${EXPO_METRO_HOST:-metro.rexten.live}"
export EXPO_PACKAGER_PROXY_URL="${EXPO_PACKAGER_PROXY_URL:-https://${EXPO_METRO_HOST}}"
export REACT_NATIVE_PACKAGER_HOSTNAME="$EXPO_METRO_HOST"
export CI=false

echo ""
echo "Ссылки/QR для телефона: ${EXPO_PACKAGER_PROXY_URL}"
echo "В Cloudflare: hostname → http://127.0.0.1:8081 ; на сервере Metro должен слушать :8081"
echo ""

exec npx expo start
