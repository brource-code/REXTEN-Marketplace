#!/usr/bin/env bash
# Пересборка образов и перезапуск стека Rexten + очистка кешей Laravel.
# Запуск из корня репозитория: bash scripts/rebuild-stack.sh
#
# ВАЖНО: том postgres_data НЕ трогаем — данные БД сохраняются.
# Опционально очистить временные файлы бэкапов на хосте (освободить диск):
#   CLEAN_BACKUPS_WORK=1 bash scripts/rebuild-stack.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Рабочая директория: $(pwd)"

if [[ "${CLEAN_BACKUPS_WORK:-0}" == "1" ]]; then
  echo "==> Очистка backend/storage/app/backups/work (временные каталоги бэкапов)..."
  rm -rf backend/storage/app/backups/work/* 2>/dev/null || true
fi

echo "==> docker-compose build (frontend + backend; queue/scheduler используют образ backend)..."
docker-compose build --no-cache frontend backend

echo "==> Перезапуск контейнеров..."
# docker-compose 1.29 + новый Docker API: --force-recreate может дать KeyError 'ContainerConfig'.
# Надёжнее: down → удалить оставшиеся контейнеры rexten_* → up
docker-compose down --remove-orphans 2>/dev/null || true
for n in rexten_nginx rexten_frontend rexten_backend rexten_queue rexten_scheduler rexten_postgres; do
  docker rm -f "$n" 2>/dev/null || true
done
docker-compose up -d

echo "==> Очистка кешей Laravel и перезапуск воркеров очереди..."
docker exec rexten_backend php artisan optimize:clear || true
docker exec rexten_backend php artisan queue:restart || true

echo "==> Очистка очередей database (опционально; раскомментируйте при необходимости)"
# docker exec rexten_backend php artisan queue:clear database --queue=default
# docker exec rexten_backend php artisan queue:clear database --queue=backups

echo "==> Готово. Статус:"
docker-compose ps
