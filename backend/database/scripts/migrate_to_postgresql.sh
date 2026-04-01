#!/bin/bash

# =============================================================================
# Скрипт миграции SQLite → PostgreSQL для Rexten
# =============================================================================
# 
# Использование:
#   chmod +x database/scripts/migrate_to_postgresql.sh
#   ./database/scripts/migrate_to_postgresql.sh
#
# Требования:
#   - PostgreSQL установлен и запущен
#   - PHP расширение pdo_pgsql установлено
#   - Доступ к базе данных PostgreSQL
# =============================================================================

set -e  # Остановить при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация (измени под свои настройки)
PG_USER="${PG_USER:-rexten_user}"
PG_PASSWORD="${PG_PASSWORD:-rexten_password}"
PG_DATABASE="${PG_DATABASE:-ecme_marketplace}"
PG_HOST="${PG_HOST:-127.0.0.1}"
PG_PORT="${PG_PORT:-5432}"

# Пути
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
EXPORT_DIR="$BACKEND_DIR/database/export"
SQLITE_DB="$BACKEND_DIR/database/database.sqlite"

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}  Миграция SQLite → PostgreSQL для Rexten${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# Шаг 0: Проверка предварительных условий
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[Шаг 0] Проверка предварительных условий...${NC}"

# Проверка PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL не установлен!${NC}"
    echo ""
    echo "Установите PostgreSQL:"
    echo "  sudo apt update"
    echo "  sudo apt install -y postgresql postgresql-contrib"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL установлен: $(psql --version)${NC}"

# Проверка PHP pdo_pgsql
if ! php -m | grep -q pdo_pgsql; then
    echo -e "${RED}❌ PHP расширение pdo_pgsql не установлено!${NC}"
    echo ""
    echo "Установите расширение:"
    echo "  sudo apt install -y php-pgsql"
    echo "  sudo systemctl restart php-fpm  # или apache2"
    exit 1
fi
echo -e "${GREEN}✅ PHP pdo_pgsql установлен${NC}"

# Проверка SQLite базы
if [ ! -f "$SQLITE_DB" ]; then
    echo -e "${RED}❌ SQLite база не найдена: $SQLITE_DB${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SQLite база найдена${NC}"

echo ""

# -----------------------------------------------------------------------------
# Шаг 1: Создание бэкапа SQLite
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[Шаг 1] Создание бэкапа SQLite...${NC}"

BACKUP_FILE="$BACKEND_DIR/database/database.sqlite.backup_$(date +%Y%m%d_%H%M%S)"
cp "$SQLITE_DB" "$BACKUP_FILE"
echo -e "${GREEN}✅ Бэкап создан: $BACKUP_FILE${NC}"
echo ""

# -----------------------------------------------------------------------------
# Шаг 2: Проверка валидности JSON
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[Шаг 2] Проверка валидности JSON данных...${NC}"

cd "$BACKEND_DIR"
php database/scripts/validate_json_before_migration.php
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Обнаружены невалидные JSON данные! Исправьте их перед миграцией.${NC}"
    exit 1
fi
echo ""

# -----------------------------------------------------------------------------
# Шаг 3: Настройка .env
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[Шаг 3] Настройка .env для PostgreSQL...${NC}"

# Создаём бэкап .env
cp "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.backup_sqlite_$(date +%Y%m%d_%H%M%S)"

# Обновляем .env
sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=pgsql/" "$BACKEND_DIR/.env"
sed -i "s/^DB_HOST=.*/DB_HOST=$PG_HOST/" "$BACKEND_DIR/.env"
sed -i "s/^DB_PORT=.*/DB_PORT=$PG_PORT/" "$BACKEND_DIR/.env"
sed -i "s/^DB_DATABASE=.*/DB_DATABASE=$PG_DATABASE/" "$BACKEND_DIR/.env"
sed -i "s/^DB_USERNAME=.*/DB_USERNAME=$PG_USER/" "$BACKEND_DIR/.env"
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$PG_PASSWORD/" "$BACKEND_DIR/.env"

echo -e "${GREEN}✅ .env обновлён для PostgreSQL${NC}"
echo ""

# -----------------------------------------------------------------------------
# Шаг 4: Очистка кеша Laravel
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[Шаг 4] Очистка кеша Laravel...${NC}"

php artisan config:clear
php artisan cache:clear
php artisan route:clear

echo -e "${GREEN}✅ Кеш очищен${NC}"
echo ""

# -----------------------------------------------------------------------------
# Шаг 5: Создание схемы через Laravel миграции
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[Шаг 5] Создание схемы в PostgreSQL...${NC}"

php artisan migrate --force
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка при создании схемы!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Схема создана${NC}"
echo ""

# -----------------------------------------------------------------------------
# Шаг 6: Экспорт данных из SQLite
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[Шаг 6] Экспорт данных из SQLite...${NC}"

# Временно переключаемся на SQLite для экспорта
sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=sqlite/" "$BACKEND_DIR/.env"
php artisan config:clear

mkdir -p "$EXPORT_DIR"

# Экспортируем через PHP (sqlite3 может быть не установлен)
php artisan tinker --execute="
\$tables = [
    'users', 'user_profiles', 'companies', 'service_categories', 'services',
    'advertisements', 'team_members', 'bookings', 'orders', 'reviews',
    'notifications', 'favorites', 'additional_services', 'salary_settings', 'salary_calculations'
];

foreach (\$tables as \$table) {
    try {
        \$data = DB::table(\$table)->get();
        if (\$data->count() > 0) {
            \$fp = fopen('$EXPORT_DIR/' . \$table . '.csv', 'w');
            fputcsv(\$fp, array_keys((array)\$data->first()));
            foreach (\$data as \$row) {
                fputcsv(\$fp, (array)\$row);
            }
            fclose(\$fp);
            echo \"✅ \$table: \" . \$data->count() . \" записей\" . PHP_EOL;
        } else {
            echo \"⚪ \$table: пусто\" . PHP_EOL;
        }
    } catch (\Exception \$e) {
        echo \"⚠️ \$table: \" . \$e->getMessage() . PHP_EOL;
    }
}
"

# Возвращаем PostgreSQL
sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=pgsql/" "$BACKEND_DIR/.env"
php artisan config:clear

echo -e "${GREEN}✅ Данные экспортированы в $EXPORT_DIR${NC}"
echo ""

# -----------------------------------------------------------------------------
# Шаг 7: Импорт данных в PostgreSQL
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[Шаг 7] Импорт данных в PostgreSQL...${NC}"

# Порядок важен из-за foreign keys!
TABLES_ORDER=(
    "users"
    "user_profiles"
    "companies"
    "service_categories"
    "services"
    "advertisements"
    "team_members"
    "bookings"
    "orders"
    "reviews"
    "notifications"
    "favorites"
    "additional_services"
    "salary_settings"
    "salary_calculations"
)

# Отключаем проверку FK на время импорта
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "SET session_replication_role = 'replica';"

for table in "${TABLES_ORDER[@]}"; do
    if [ -f "$EXPORT_DIR/$table.csv" ]; then
        echo -n "  Импорт $table... "
        
        # Очищаем таблицу
        PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "TRUNCATE TABLE $table CASCADE;" 2>/dev/null || true
        
        # Импортируем данные
        PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "\COPY $table FROM '$EXPORT_DIR/$table.csv' WITH CSV HEADER;" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}OK${NC}"
        else
            echo -e "${YELLOW}пропущено (возможно пусто)${NC}"
        fi
    fi
done

# Включаем проверку FK обратно
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "SET session_replication_role = 'origin';"

echo -e "${GREEN}✅ Данные импортированы${NC}"
echo ""

# -----------------------------------------------------------------------------
# Шаг 8: Синхронизация sequences
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[Шаг 8] Синхронизация sequences...${NC}"

PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -f "$BACKEND_DIR/database/scripts/sync_postgresql_sequences.sql"

echo -e "${GREEN}✅ Sequences синхронизированы${NC}"
echo ""

# -----------------------------------------------------------------------------
# Шаг 9: Применение JSONB миграции
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[Шаг 9] Применение JSONB миграции...${NC}"

php artisan migrate --force

echo -e "${GREEN}✅ JSONB миграция применена${NC}"
echo ""

# -----------------------------------------------------------------------------
# Шаг 10: Проверка
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[Шаг 10] Финальная проверка...${NC}"

php artisan tinker --execute="
echo 'Драйвер: ' . DB::connection()->getDriverName() . PHP_EOL;
echo PHP_EOL;
echo '📊 Данные в PostgreSQL:' . PHP_EOL;
\$tables = ['users', 'companies', 'bookings', 'advertisements', 'services'];
foreach (\$tables as \$t) {
    echo '  ' . \$t . ': ' . DB::table(\$t)->count() . PHP_EOL;
}
"

echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}  ✅ Миграция завершена успешно!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo "Следующие шаги:"
echo "  1. Проверьте работу приложения"
echo "  2. Протестируйте авторизацию, поиск, отчёты"
echo "  3. Если всё работает - удалите бэкапы и экспортированные CSV"
echo ""
echo "Для отката на SQLite:"
echo "  1. Восстановите .env из бэкапа: .env.backup_sqlite_*"
echo "  2. php artisan config:clear"
echo ""
