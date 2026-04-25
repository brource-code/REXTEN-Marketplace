#!/bin/bash

# Скрипт для создания архива проекта для деплоя на сервер
# БЕЗОПАСНО: только читает файлы, не изменяет исходный проект
# Использование: ./create-deploy-archive.sh [путь_для_архива]

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Получаем путь к корню проекта
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Путь для архива (по умолчанию текущая директория)
OUTPUT_DIR="${1:-$(pwd)}"

# Имя архива с датой (КАПС для заметности)
ARCHIVE_NAME="REXTEN-DEPLOY-$(date +%Y%m%d_%H%M%S)"
TEMP_DIR="/tmp/${ARCHIVE_NAME}"

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Создание архива для деплоя${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Исходная папка: ${PROJECT_ROOT}${NC}"
echo -e "${YELLOW}Архив будет создан в: ${OUTPUT_DIR}${NC}"
echo -e "${YELLOW}Временная папка: ${TEMP_DIR}${NC}"
echo ""

# Проверяем наличие rsync
if ! command -v rsync &> /dev/null; then
    echo -e "${RED}ОШИБКА: rsync не найден. Установите rsync для работы скрипта.${NC}"
    exit 1
fi

# Создаем временную директорию
mkdir -p "${TEMP_DIR}"

echo -e "${YELLOW}Копирование файлов (исключая ненужное)...${NC}"

# Используем rsync для копирования с исключениями
rsync -av \
  --exclude='node_modules' \
  --exclude='vendor' \
  --exclude='.next' \
  --exclude='mobile' \
  --exclude='mobile.zip' \
  --exclude='backend/storage/logs' \
  --exclude='backend/storage/framework/cache' \
  --exclude='backend/storage/framework/sessions' \
  --exclude='backend/storage/framework/views' \
  --exclude='backend/storage/app/*' \
  --exclude='backend/storage/app/public' \
  --exclude='backend/bootstrap/cache/*.php' \
  --exclude='*.sqlite' \
  --exclude='*.sqlite.backup*' \
  --exclude='backups' \
  --exclude='rexten-light-*' \
  --exclude='REXTEN-DEPLOY-*' \
  --exclude='*.zip' \
  --exclude='*.tar.gz' \
  --exclude='*.tar' \
  --exclude='.idea' \
  --exclude='.vscode' \
  --exclude='.DS_Store' \
  --exclude='Thumbs.db' \
  --exclude='*.log' \
  --exclude='npm-debug.log*' \
  --exclude='yarn-debug.log*' \
  --exclude='yarn-error.log*' \
  --exclude='.pnp' \
  --exclude='.pnp.js' \
  --exclude='coverage' \
  --exclude='out' \
  --exclude='build' \
  --exclude='*.tsbuildinfo' \
  --exclude='next-env.d.ts' \
  --exclude='.git' \
  --exclude='.gitignore' \
  --exclude='*.swp' \
  --exclude='*.swo' \
  --exclude='*~' \
  --exclude='.cache' \
  --exclude='node_modules/.cache' \
  --exclude='.next/cache' \
  --exclude='backend/storage/app/.gitignore' \
  ./ "${TEMP_DIR}/"

# Создаем пустые директории для структуры storage
echo -e "${YELLOW}Создание структуры директорий...${NC}"
mkdir -p "${TEMP_DIR}/backend/storage/app/public"
mkdir -p "${TEMP_DIR}/backend/storage/framework/cache"
mkdir -p "${TEMP_DIR}/backend/storage/framework/sessions"
mkdir -p "${TEMP_DIR}/backend/storage/framework/views"
mkdir -p "${TEMP_DIR}/backend/storage/logs"
mkdir -p "${TEMP_DIR}/backend/bootstrap/cache"

# Создаем .gitkeep файлы для пустых директорий
touch "${TEMP_DIR}/backend/storage/app/public/.gitkeep"
touch "${TEMP_DIR}/backend/storage/framework/cache/.gitkeep"
touch "${TEMP_DIR}/backend/storage/framework/sessions/.gitkeep"
touch "${TEMP_DIR}/backend/storage/framework/views/.gitkeep"
touch "${TEMP_DIR}/backend/storage/logs/.gitkeep"
touch "${TEMP_DIR}/backend/bootstrap/cache/.gitkeep"

# Создаем README для архива деплоя
cat > "${TEMP_DIR}/DEPLOY_README.md" << 'EOF'
# REXTEN - Архив для деплоя

Это архив проекта для развертывания на сервере.

## Что исключено из архива:

- `node_modules/` - зависимости Next.js (установятся через `npm install`)
- `backend/vendor/` - зависимости Laravel (установятся через `composer install`)
- `.next/` - кеш Next.js (создастся при сборке)
- `mobile/` - мобильное приложение (не нужно на сервере)
- `backend/storage/logs/` - логи (создадутся автоматически)
- `backend/storage/framework/cache/` - кеш Laravel (создастся автоматически)
- `backend/storage/framework/sessions/` - сессии (создадутся автоматически)
- `backend/storage/framework/views/` - скомпилированные views (создадутся автоматически)
- Все архивы и временные файлы

## Установка на сервере:

### 1. Распакуйте архив

```bash
tar -xzf REXTEN-DEPLOY-*.tar.gz
cd REXTEN-DEPLOY-*
```

### 2. Установите зависимости Backend

```bash
cd backend
composer install --no-dev --optimize-autoloader
# Проверьте и отредактируйте .env файл при необходимости
php artisan key:generate
php artisan jwt:secret
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 3. Установите зависимости Frontend

```bash
cd .. # вернуться в корень проекта
npm install --production
npm run build
```

### 4. Настройте веб-сервер

См. инструкции в `DEPLOY.md` для настройки Nginx/Apache.

### 5. Настройте процессы

Используйте PM2 или Supervisor для запуска:
- Next.js production сервера
- Laravel очередей (если используются)

## Важно:

- Файлы `.env` включены в архив - проверьте и обновите настройки для production
- База данных не включена - выполните миграции
- Загруженные файлы не включены - они будут созданы при работе приложения
- Логи не включены - они будут созданы автоматически
- Мобильное приложение не включено - оно не нужно на сервере

## Размер архива:

Архив содержит только исходный код и конфигурационные файлы, без зависимостей и кеша.
EOF

echo -e "${YELLOW}Создание TAR.GZ архива...${NC}"

# Создаем TAR.GZ архив (лучше для Linux серверов)
cd /tmp
tar -czf "${OUTPUT_DIR}/${ARCHIVE_NAME}.tar.gz" "${ARCHIVE_NAME}/"

# Удаляем временную директорию
rm -rf "${TEMP_DIR}"

ARCHIVE_SIZE=$(du -h "${OUTPUT_DIR}/${ARCHIVE_NAME}.tar.gz" | cut -f1)

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Архив для деплоя успешно создан!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Имя файла: ${ARCHIVE_NAME}.tar.gz${NC}"
echo -e "${BLUE}Расположение: ${OUTPUT_DIR}${NC}"
echo -e "${BLUE}Размер: ${ARCHIVE_SIZE}${NC}"
echo ""
echo -e "${YELLOW}✓ Мобильное приложение исключено${NC}"
echo -e "${YELLOW}✓ Зависимости исключены (node_modules, vendor)${NC}"
echo -e "${YELLOW}✓ Кеш исключен (.next, storage/cache)${NC}"
echo -e "${YELLOW}✓ Временные файлы исключены${NC}"
echo ""
echo -e "${GREEN}Ваш исходный проект не был изменен!${NC}"
echo ""
echo -e "${BLUE}Следующие шаги:${NC}"
echo -e "1. Загрузите архив на сервер: ${ARCHIVE_NAME}.tar.gz"
echo -e "2. Распакуйте: tar -xzf ${ARCHIVE_NAME}.tar.gz"
echo -e "3. Следуйте инструкциям в DEPLOY_README.md"
echo ""

