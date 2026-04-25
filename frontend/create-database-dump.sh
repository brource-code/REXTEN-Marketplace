#!/bin/bash

# Скрипт для создания полного дампа базы данных
# Поддерживает SQLite и MySQL
# Использование: ./create-database-dump.sh

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

BACKEND_DIR="${PROJECT_ROOT}/backend"
ENV_FILE="${BACKEND_DIR}/.env"

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Создание полного дампа базы данных${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

# Проверяем наличие .env файла
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}ОШИБКА: Файл .env не найден в ${BACKEND_DIR}${NC}"
    exit 1
fi

# Читаем параметры БД из .env
source "$ENV_FILE" 2>/dev/null || true

DB_CONNECTION="${DB_CONNECTION:-mysql}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_DATABASE="${DB_DATABASE:-ecme_marketplace}"
DB_USERNAME="${DB_USERNAME:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Имя файла дампа с датой
DUMP_NAME="REXTEN-DB-DUMP-$(date +%Y%m%d_%H%M%S).sql"
DUMP_FILE="${PROJECT_ROOT}/${DUMP_NAME}"

echo -e "${YELLOW}Тип БД: ${DB_CONNECTION}${NC}"
echo -e "${YELLOW}База данных: ${DB_DATABASE}${NC}"
echo ""

# Обработка SQLite
if [ "$DB_CONNECTION" = "sqlite" ]; then
    echo -e "${YELLOW}Обнаружена SQLite база данных${NC}"
    
    # Получаем путь к файлу SQLite
    SQLITE_FILE="${DB_DATABASE}"
    
    # Убираем кавычки если есть
    SQLITE_FILE=$(echo "$SQLITE_FILE" | sed 's/^"//;s/"$//')
    
    if [ ! -f "$SQLITE_FILE" ]; then
        echo -e "${RED}ОШИБКА: Файл SQLite не найден: ${SQLITE_FILE}${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Создание SQL дампа из SQLite...${NC}"
    
    # Используем sqlite3 для создания дампа
    if ! command -v sqlite3 &> /dev/null; then
        echo -e "${RED}ОШИБКА: sqlite3 не найден. Установите sqlite3 для создания дампа.${NC}"
        exit 1
    fi
    
    # Создаем SQL дамп
    sqlite3 "$SQLITE_FILE" .dump > "$DUMP_FILE"
    
    echo -e "${YELLOW}Конвертация SQLite синтаксиса в MySQL...${NC}"
    
    # Создаем временный файл для конвертации
    TEMP_DUMP="${DUMP_FILE}.converted"
    
    # Добавляем заголовок с информацией о дампе
    {
        echo "-- REXTEN Database Dump"
        echo "-- Created: $(date)"
        echo "-- Source: SQLite database (converted to MySQL)"
        echo "-- Database: ecme_marketplace"
        echo ""
        echo "CREATE DATABASE IF NOT EXISTS \`ecme_marketplace\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        echo "USE \`ecme_marketplace\`;"
        echo ""
        echo "SET FOREIGN_KEY_CHECKS=0;"
        echo "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';"
        echo "SET AUTOCOMMIT=0;"
        echo "START TRANSACTION;"
        echo "SET time_zone = '+00:00';"
        echo ""
    } > "$TEMP_DUMP"
    
    # Конвертируем SQLite дамп в MySQL используя sed
    # Удаляем PRAGMA, BEGIN, COMMIT
    grep -v "^PRAGMA" "$DUMP_FILE" | grep -v "^BEGIN" | grep -v "^COMMIT" | \
    sed 's/CREATE TABLE IF NOT EXISTS "\([^"]*\)"/CREATE TABLE IF NOT EXISTS `\1`/g' | \
    sed 's/CREATE TABLE "\([^"]*\)"/CREATE TABLE `\1`/g' | \
    sed 's/INSERT INTO "\([^"]*\)"/INSERT INTO `\1`/g' | \
    sed 's/INSERT INTO \([a-zA-Z_][a-zA-Z0-9_]*\)/INSERT INTO `\1`/g' | \
    sed 's/"\([^"]*\)" integer primary key autoincrement not null/`\1` INT AUTO_INCREMENT PRIMARY KEY NOT NULL/gi' | \
    sed 's/"\([^"]*\)" integer primary key autoincrement/`\1` INT AUTO_INCREMENT PRIMARY KEY/gi' | \
    sed 's/"\([^"]*\)" integer primary key/`\1` INT PRIMARY KEY/gi' | \
    sed 's/"\([^"]*\)" integer not null/`\1` INT NOT NULL/gi' | \
    sed 's/"\([^"]*\)" integer/`\1` INT/gi' | \
    sed 's/"\([^"]*\)" text not null/`\1` TEXT NOT NULL/gi' | \
    sed 's/"\([^"]*\)" text/`\1` TEXT/gi' | \
    sed 's/"\([^"]*\)" varchar([^)]*) not null/`\1` VARCHAR(255) NOT NULL/gi' | \
    sed 's/"\([^"]*\)" varchar([^)]*)/`\1` VARCHAR(255)/gi' | \
    sed 's/ varchar not null/ VARCHAR(255) NOT NULL/gi' | \
    sed 's/ varchar / VARCHAR(255) /gi' | \
    sed 's/"\([^"]*\)" real not null/`\1` DECIMAL(10,2) NOT NULL/gi' | \
    sed 's/"\([^"]*\)" real/`\1` DECIMAL(10,2)/gi' | \
    sed 's/"\([^"]*\)" blob not null/`\1` BLOB NOT NULL/gi' | \
    sed 's/"\([^"]*\)" blob/`\1` BLOB/gi' | \
    sed 's/"\([^"]*\)" datetime/`\1` DATETIME/gi' | \
    sed 's/"\([^"]*\)" date/`\1` DATE/gi' | \
    sed 's/"\([^"]*\)"/`\1`/g' >> "$TEMP_DUMP"
    
    # Добавляем закрывающие команды
    {
        echo ""
        echo "SET FOREIGN_KEY_CHECKS=1;"
        echo "COMMIT;"
    } >> "$TEMP_DUMP"
    
    mv "$TEMP_DUMP" "$DUMP_FILE"
    
    echo -e "${GREEN}✓ SQL дамп создан и сконвертирован в MySQL формат${NC}"
    
# Обработка MySQL
elif [ "$DB_CONNECTION" = "mysql" ]; then
    echo -e "${YELLOW}Обнаружена MySQL база данных${NC}"
    
    # Проверяем наличие mysqldump
    if ! command -v mysqldump &> /dev/null; then
        echo -e "${RED}ОШИБКА: mysqldump не найден. Установите MySQL client для создания дампа.${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Создание MySQL дампа...${NC}"
    
    # Создаем дамп с полными опциями
    if [ -z "$DB_PASSWORD" ]; then
        mysqldump \
            -h "$DB_HOST" \
            -P "$DB_PORT" \
            -u "$DB_USERNAME" \
            --single-transaction \
            --routines \
            --triggers \
            --events \
            --add-drop-database \
            --databases "$DB_DATABASE" > "$DUMP_FILE"
    else
        mysqldump \
            -h "$DB_HOST" \
            -P "$DB_PORT" \
            -u "$DB_USERNAME" \
            -p"$DB_PASSWORD" \
            --single-transaction \
            --routines \
            --triggers \
            --events \
            --add-drop-database \
            --databases "$DB_DATABASE" > "$DUMP_FILE"
    fi
    
    # Добавляем заголовок
    {
        echo "-- REXTEN Database Dump"
        echo "-- Created: $(date)"
        echo "-- Source: MySQL database"
        echo "-- Host: ${DB_HOST}:${DB_PORT}"
        echo "-- Database: ${DB_DATABASE}"
        echo ""
        cat "$DUMP_FILE"
    } > "${DUMP_FILE}.tmp"
    
    mv "${DUMP_FILE}.tmp" "$DUMP_FILE"
    
    echo -e "${GREEN}✓ MySQL дамп создан${NC}"
    
else
    echo -e "${RED}ОШИБКА: Неподдерживаемый тип БД: ${DB_CONNECTION}${NC}"
    echo -e "${YELLOW}Поддерживаются только: sqlite, mysql${NC}"
    exit 1
fi

# Сжимаем дамп
echo -e "${YELLOW}Сжатие дампа...${NC}"
gzip -f "$DUMP_FILE"
DUMP_FILE="${DUMP_FILE}.gz"

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Полный дамп базы данных успешно создан!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Имя файла: $(basename ${DUMP_FILE})${NC}"
echo -e "${BLUE}Расположение: ${PROJECT_ROOT}${NC}"
echo -e "${BLUE}Размер: ${DUMP_SIZE}${NC}"
echo ""
echo -e "${YELLOW}✓ Структура БД включена${NC}"
echo -e "${YELLOW}✓ Все данные включены${NC}"
echo -e "${YELLOW}✓ Триггеры и процедуры включены${NC}"
echo ""
echo -e "${BLUE}Импорт на внешний сервер:${NC}"
echo -e "1. Загрузите файл: $(basename ${DUMP_FILE})"
echo -e "2. Распакуйте: gunzip $(basename ${DUMP_FILE})"
echo -e "3. Импортируйте в MySQL:"
echo -e "   mysql -u username -p database_name < ${DUMP_NAME}"
echo ""
echo -e "${YELLOW}Или одной командой:${NC}"
echo -e "   gunzip -c $(basename ${DUMP_FILE}) | mysql -u username -p database_name"
echo ""

