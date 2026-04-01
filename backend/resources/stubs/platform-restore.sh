#!/usr/bin/env bash
# Rexten — восстановление из архива бэкапа (без GitHub)
# Требования: Docker 20+, Docker Compose plugin, права на docker
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Rexten restore ==="
echo "Корень распакованного бэкапа (папка с RESTORE.sh): ${ROOT_DIR}"

if [[ ! -f "${ROOT_DIR}/data/db.sql.gz" ]]; then
  echo "Ошибка: нет data/db.sql.gz"
  exit 1
fi

if [[ ! -f "${ROOT_DIR}/project.tar.gz" ]]; then
  echo "Ошибка: нет project.tar.gz"
  exit 1
fi

# Распаковка кода проекта
mkdir -p "${ROOT_DIR}/project"
tar -xzf "${ROOT_DIR}/project.tar.gz" -C "${ROOT_DIR}/project"

# Конфиги
if [[ -f "${ROOT_DIR}/config/backend.env" ]]; then
  mkdir -p "${ROOT_DIR}/project/backend"
  cp "${ROOT_DIR}/config/backend.env" "${ROOT_DIR}/project/backend/.env"
fi
if [[ -f "${ROOT_DIR}/config/frontend.env.local" ]]; then
  mkdir -p "${ROOT_DIR}/project/frontend"
  cp "${ROOT_DIR}/config/frontend.env.local" "${ROOT_DIR}/project/frontend/.env.local"
fi

cd "${ROOT_DIR}/project"

echo "Загрузка Docker-образов (если есть)..."
if [[ -f "${ROOT_DIR}/docker-images.tar" ]]; then
  docker load -i "${ROOT_DIR}/docker-images.tar"
else
  echo "docker-images.tar не найден — соберите образы: docker compose build"
fi

echo "Запуск контейнеров..."
if [[ -f "docker-compose.yml" ]]; then
  docker compose -f docker-compose.yml up -d
else
  echo "Нет docker-compose.yml в project/"
  exit 1
fi

echo "Ожидание PostgreSQL..."
sleep 12

PG_CONTAINER="${PG_CONTAINER:-rexten_postgres}"
DB_USER="${DB_USER:-rexten_user}"
DB_NAME="${DB_NAME:-ecme_marketplace}"

echo "Восстановление БД в контейнер ${PG_CONTAINER}..."
gunzip -c "${ROOT_DIR}/data/db.sql.gz" | docker exec -i "${PG_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}"

echo "Кэш Laravel..."
docker exec rexten_backend php artisan config:clear || true
docker exec rexten_backend php artisan migrate --force || true
docker exec rexten_backend php artisan config:cache || true

echo "=== Готово. Проверьте nginx и порты. ==="
