#!/usr/bin/env bash
# Quick Tunnel (trycloudflare.com) → Metro на фиксированном порту (по умолчанию 8081).
# Порт туннеля и Metro должны совпадать; иначе при занятом 8081 Metro уезжает на 8082, а туннель остаётся на 8081.
set -euo pipefail
cd "$(dirname "$0")/.."

METRO_PORT="${EXPO_METRO_PORT:-8081}"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use 20 2>/dev/null || true
fi

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

export CI=false

echo "Освобождаю порт ${METRO_PORT} (если занят старым Metro/Expo)…"
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${METRO_PORT}/tcp" 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -t -iTCP:"${METRO_PORT}" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "${PIDS:-}" ]; then
    # shellcheck disable=SC2086
    kill $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

HOSTFILE=$(mktemp)
cleanup() {
  rm -f "$HOSTFILE"
  pkill -f "cloudflared tunnel --url http://127.0.0.1:${METRO_PORT}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if command -v stdbuf >/dev/null 2>&1; then
  CF=(stdbuf -oL -eL cloudflared tunnel --url "http://127.0.0.1:${METRO_PORT}")
else
  CF=(cloudflared tunnel --url "http://127.0.0.1:${METRO_PORT}")
fi

(
  "${CF[@]}" 2>&1 | while IFS= read -r line; do
    printf '%s\n' "$line"
    if [[ ! -s "$HOSTFILE" ]] && [[ "$line" =~ (https://[a-zA-Z0-9.-]+\.trycloudflare\.com) ]]; then
      printf '%s' "${BASH_REMATCH[0]#https://}" >"$HOSTFILE"
    fi
  done
) &
CF_PID=$!

echo "Жду URL туннеля trycloudflare.com …"
for _ in $(seq 1 120); do
  if [[ -s "$HOSTFILE" ]]; then
    break
  fi
  sleep 0.5
done

if [[ ! -s "$HOSTFILE" ]]; then
  echo "Не удалось получить URL за ~60 с."
  kill "$CF_PID" 2>/dev/null || true
  wait "$CF_PID" 2>/dev/null || true
  exit 1
fi

FULL_URL=$(cat "$HOSTFILE")
export REACT_NATIVE_PACKAGER_HOSTNAME="$FULL_URL"

echo ""
echo "Внешний Metro (HTTPS): https://${FULL_URL}  →  http://127.0.0.1:${METRO_PORT}"
echo "В Expo Go — QR или ссылка из вывода Expo ниже (порт ${METRO_PORT})."
echo ""

npx expo start --port "${METRO_PORT}"
