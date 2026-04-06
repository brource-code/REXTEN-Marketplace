#!/usr/bin/env bash
# Пересборка и перезапуск только контейнера frontend (rexten.live + dev.rexten.live — один upstream).
# Запуск из корня репозитория: ./scripts/deploy-frontend-docker.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if docker compose version &>/dev/null; then
  DC=(docker compose)
elif command -v docker-compose &>/dev/null; then
  DC=(docker-compose)
else
  echo "Установите Docker Compose (docker compose или docker-compose)." >&2
  exit 1
fi

echo "==> Сборка frontend (без кэша слоёв при необходимости добавьте --no-cache вручную)"
"${DC[@]}" build frontend

echo "==> Удаление старого контейнера (обход KeyError ContainerConfig у docker-compose 1.29)"
docker rm -f rexten_frontend 2>/dev/null || true

echo "==> Запуск frontend"
"${DC[@]}" up -d frontend

echo "==> Перезапуск nginx (подхват сети/upstream)"
"${DC[@]}" restart nginx 2>/dev/null || true

echo "Готово. Проверьте https://rexten.live и https://dev.rexten.live (один и тот же образ)."
