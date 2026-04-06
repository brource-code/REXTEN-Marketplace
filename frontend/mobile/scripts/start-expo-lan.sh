#!/usr/bin/env bash
# Запуск Metro с правильными URL для телефона.
# Приоритет (см. @expo/cli UrlCreator):
#   1) EXPO_PACKAGER_PROXY_URL — публичный URL (Cloudflare Tunnel → :8081 на сервере)
#   2) REACT_NATIVE_PACKAGER_HOSTNAME / LAN — http://IP:8081 в той же Wi‑Fi
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Туннель: один домен для Metro снаружи (HTTPS на 443)
if [ -n "${EXPO_METRO_HOST:-}" ] && [ -z "${EXPO_PACKAGER_PROXY_URL:-}" ]; then
  export EXPO_PACKAGER_PROXY_URL="https://${EXPO_METRO_HOST}"
fi

detect_lan_ip() {
  if [ -n "${EXPO_LAN_IP:-}" ]; then
    echo "$EXPO_LAN_IP"
    return 0
  fi
  if command -v ipconfig >/dev/null 2>&1; then
    local ip
    ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
    if [ -n "$ip" ]; then
      echo "$ip"
      return 0
    fi
  fi
  if command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | awk '{print $1; exit}'
    return 0
  fi
  return 1
}

MODE="${1:-dev}"

if [ -n "${EXPO_PACKAGER_PROXY_URL:-}" ]; then
  export CI=false
  echo ""
  echo "──────────────────────────────────────────────"
  echo "  Телефон (и QR) → Metro через туннель:"
  echo "  ${EXPO_PACKAGER_PROXY_URL}"
  echo "  (на сервере туннель должен вести на http://127.0.0.1:8081)"
  echo "──────────────────────────────────────────────"
  echo ""
else
  IP="$(detect_lan_ip || true)"
  IP="$(echo "$IP" | tr -d '[:space:]')"
  if [ -z "$IP" ]; then
    echo ""
    echo "Задай в .env один из вариантов:"
    echo "  Cloudflare: EXPO_METRO_HOST=metro.rexten.live  и  EXPO_PACKAGER_PROXY_URL=https://metro.rexten.live"
    echo "  LAN:        EXPO_LAN_IP=192.168.x.x"
    echo ""
    exit 1
  fi
  export REACT_NATIVE_PACKAGER_HOSTNAME="$IP"
  export CI=false
  echo ""
  echo "──────────────────────────────────────────────"
  echo "  Телефон в той же Wi‑Fi → http://${IP}:8081"
  echo "  REACT_NATIVE_PACKAGER_HOSTNAME=${IP}"
  echo "──────────────────────────────────────────────"
  echo ""
fi

if [ "$MODE" = "plain" ]; then
  exec npx expo start --host lan --port 8081
else
  exec npx expo start --dev-client --host lan --port 8081
fi
