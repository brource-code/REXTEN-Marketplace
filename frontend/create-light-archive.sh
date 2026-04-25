#!/bin/bash

# Скрипт для создания легкой копии проекта для показа
# БЕЗОПАСНО: только читает файлы, не изменяет исходный проект
# Использование: ./create-light-archive.sh [путь_для_архива]

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Путь для архива (по умолчанию текущая директория)
OUTPUT_DIR="${1:-$(pwd)}"

# Имя архива с датой
ARCHIVE_NAME="rexten-light-$(date +%Y%m%d_%H%M%S)"
TEMP_DIR="/tmp/${ARCHIVE_NAME}"

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Создание легкого архива проекта${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Архив будет создан в: ${OUTPUT_DIR}${NC}"
echo -e "${YELLOW}Временная папка: ${TEMP_DIR}${NC}"
echo ""

# Проверяем наличие rsync
if ! command -v rsync &> /dev/null; then
    echo -e "${YELLOW}rsync не найден, используем tar...${NC}"
    USE_RSYNC=false
else
    USE_RSYNC=true
fi

# Создаем временную директорию
mkdir -p "${TEMP_DIR}"

echo -e "${YELLOW}Копирование файлов (исключая мусор)...${NC}"

if [ "$USE_RSYNC" = true ]; then
    # Используем rsync (быстрее и точнее)
    rsync -av \
      --exclude='node_modules' \
      --exclude='vendor' \
      --exclude='.next' \
      --exclude='backend/storage/logs' \
      --exclude='backend/storage/framework/cache' \
      --exclude='backend/storage/framework/sessions' \
      --exclude='backend/storage/framework/views' \
      --exclude='backend/storage/app/*' \
      --exclude='backend/storage/app/public' \
      --exclude='*.sqlite' \
      --exclude='*.sqlite.backup*' \
      --exclude='.env*' \
      --exclude='backups' \
      --exclude='*.zip' \
      --exclude='*.tar.gz' \
      --exclude='rexten-light-*.zip' \
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
      --exclude='mobile/node_modules' \
      --exclude='mobile/.expo' \
      --exclude='mobile/.expo-shared' \
      --exclude='mobile/dist' \
      --exclude='mobile/.next' \
      --exclude='backend/bootstrap/cache/*.php' \
      --exclude='backend/storage/app/.gitignore' \
      ./ "${TEMP_DIR}/"
else
    # Используем cp (если нет rsync)
    echo -e "${YELLOW}Копирование через cp (может быть медленнее)...${NC}"
    find . -type f \
      ! -path "*/node_modules/*" \
      ! -path "*/vendor/*" \
      ! -path "*/.next/*" \
      ! -path "*/backend/storage/logs/*" \
      ! -path "*/backend/storage/framework/cache/*" \
      ! -path "*/backend/storage/framework/sessions/*" \
      ! -path "*/backend/storage/framework/views/*" \
      ! -path "*/backend/storage/app/*" \
      ! -name "*.sqlite" \
      ! -name "*.sqlite.backup*" \
      ! -name ".env*" \
      ! -path "*/backups/*" \
      ! -name "*.zip" \
      ! -name "*.tar.gz" \
      ! -name "rexten-light-*.zip" \
      ! -path "*/.idea/*" \
      ! -path "*/.vscode/*" \
      ! -name ".DS_Store" \
      ! -name "Thumbs.db" \
      ! -name "*.log" \
      ! -path "*/mobile/node_modules/*" \
      ! -path "*/mobile/.expo/*" \
      ! -path "*/mobile/dist/*" \
      -exec cp --parents {} "${TEMP_DIR}/" \;
fi

# Создаем пустые директории для структуры storage
echo -e "${YELLOW}Создание структуры директорий...${NC}"
mkdir -p "${TEMP_DIR}/backend/storage/app/public"
mkdir -p "${TEMP_DIR}/backend/storage/framework/cache"
mkdir -p "${TEMP_DIR}/backend/storage/framework/sessions"
mkdir -p "${TEMP_DIR}/backend/storage/framework/views"
mkdir -p "${TEMP_DIR}/backend/storage/logs"

# Создаем .gitkeep файлы для пустых директорий
touch "${TEMP_DIR}/backend/storage/app/public/.gitkeep"
touch "${TEMP_DIR}/backend/storage/framework/cache/.gitkeep"
touch "${TEMP_DIR}/backend/storage/framework/sessions/.gitkeep"
touch "${TEMP_DIR}/backend/storage/framework/views/.gitkeep"
touch "${TEMP_DIR}/backend/storage/logs/.gitkeep"

# Создаем README для архива
cat > "${TEMP_DIR}/ARCHIVE_README.md" << 'EOF'
# REXTEN - Легкая версия для показа

Это легкая версия проекта без зависимостей и временных файлов.

## Установка

### Frontend (Next.js)

```bash
npm install
npm run dev
```

### Backend (Laravel)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

### Mobile (React Native + Expo)

```bash
cd mobile
npm install
npx expo start
```

## Важно

- Файлы `.env` не включены в архив - создайте их на основе `.env.example`
- База данных не включена - выполните миграции
- Загруженные файлы не включены - они будут созданы при работе приложения
- Логи не включены - они будут созданы автоматически

## Структура проекта

- `src/` - Frontend код (Next.js)
- `backend/` - Backend API (Laravel)
- `mobile/` - Mobile приложение (React Native + Expo)
EOF

echo -e "${YELLOW}Создание ZIP архива...${NC}"

# Создаем ZIP архив
cd /tmp
zip -r -q "${OUTPUT_DIR}/${ARCHIVE_NAME}.zip" "${ARCHIVE_NAME}/"

# Удаляем временную директорию
rm -rf "${TEMP_DIR}"

ARCHIVE_SIZE=$(du -h "${OUTPUT_DIR}/${ARCHIVE_NAME}.zip" | cut -f1)

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ ZIP архив успешно создан!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Имя файла: ${ARCHIVE_NAME}.zip${NC}"
echo -e "${BLUE}Расположение: ${OUTPUT_DIR}${NC}"
echo -e "${BLUE}Размер: ${ARCHIVE_SIZE}${NC}"
echo ""
echo -e "${YELLOW}Ваш исходный проект не был изменен!${NC}"
echo ""

