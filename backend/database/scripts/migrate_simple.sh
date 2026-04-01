#!/bin/bash

# =============================================================================
# Упрощённый скрипт миграции SQLite → PostgreSQL
# =============================================================================
# 
# ПЕРЕД ЗАПУСКОМ:
#   1. Создай базу данных PostgreSQL:
#      sudo -u postgres psql < database/scripts/setup_postgresql.sql
#   
#   2. Настрой .env (скрипт сделает это автоматически)
# =============================================================================

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Конфигурация
PG_USER="${PG_USER:-rexten_user}"
PG_PASSWORD="${PG_PASSWORD:-rexten_password}"
PG_DATABASE="${PG_DATABASE:-ecme_marketplace}"
PG_HOST="${PG_HOST:-127.0.0.1}"
PG_PORT="${PG_PORT:-5432}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
EXPORT_DIR="$BACKEND_DIR/database/export"
SQLITE_DB="$BACKEND_DIR/database/database.sqlite"

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}  Миграция SQLite → PostgreSQL${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# Проверка подключения к PostgreSQL
echo -e "${YELLOW}[Шаг 0] Проверка подключения к PostgreSQL...${NC}"
export PGPASSWORD="$PG_PASSWORD"
if ! psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Не удалось подключиться к PostgreSQL!${NC}"
    echo ""
    echo "Создай базу данных:"
    echo "  sudo -u postgres psql < database/scripts/setup_postgresql.sql"
    exit 1
fi
echo -e "${GREEN}✅ Подключение к PostgreSQL успешно${NC}"
echo ""

# Бэкап SQLite
echo -e "${YELLOW}[Шаг 1] Создание бэкапа SQLite...${NC}"
BACKUP_FILE="$BACKEND_DIR/database/database.sqlite.backup_$(date +%Y%m%d_%H%M%S)"
cp "$SQLITE_DB" "$BACKUP_FILE"
echo -e "${GREEN}✅ Бэкап: $BACKUP_FILE${NC}"
echo ""

# Бэкап .env
echo -e "${YELLOW}[Шаг 2] Создание бэкапа .env...${NC}"
cp "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.backup_sqlite_$(date +%Y%m%d_%H%M%S)"

# Убедиться, что используется SQLite для валидации
sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=sqlite/" "$BACKEND_DIR/.env"
sed -i "s|^DB_DATABASE=.*|DB_DATABASE=$SQLITE_DB|" "$BACKEND_DIR/.env"
php artisan config:clear
echo -e "${GREEN}✅ Бэкап .env создан, переключено на SQLite${NC}"
echo ""

# Проверка JSON (на SQLite)
echo -e "${YELLOW}[Шаг 3] Проверка JSON...${NC}"
cd "$BACKEND_DIR"
php database/scripts/validate_json_before_migration.php
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка валидации JSON!${NC}"
    exit 1
fi
echo ""

# Настройка .env для PostgreSQL
echo -e "${YELLOW}[Шаг 4] Настройка .env для PostgreSQL...${NC}"

sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=pgsql/" "$BACKEND_DIR/.env"
sed -i "s/^DB_HOST=.*/DB_HOST=$PG_HOST/" "$BACKEND_DIR/.env"
sed -i "s/^DB_PORT=.*/DB_PORT=$PG_PORT/" "$BACKEND_DIR/.env"
sed -i "s/^DB_DATABASE=.*/DB_DATABASE=$PG_DATABASE/" "$BACKEND_DIR/.env"
sed -i "s/^DB_USERNAME=.*/DB_USERNAME=$PG_USER/" "$BACKEND_DIR/.env"
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$PG_PASSWORD/" "$BACKEND_DIR/.env"

php artisan config:clear
echo -e "${GREEN}✅ .env настроен${NC}"
echo ""

# Создание схемы
echo -e "${YELLOW}[Шаг 5] Создание схемы...${NC}"
php artisan migrate --force
echo -e "${GREEN}✅ Схема создана${NC}"
echo ""

# Экспорт данных
echo -e "${YELLOW}[Шаг 6] Экспорт данных из SQLite...${NC}"
sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=sqlite/" "$BACKEND_DIR/.env"
php artisan config:clear

mkdir -p "$EXPORT_DIR"

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
        }
    } catch (\Exception \$e) {
        echo \"⚠️ \$table: \" . \$e->getMessage() . PHP_EOL;
    }
}
"

sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=pgsql/" "$BACKEND_DIR/.env"
php artisan config:clear
echo -e "${GREEN}✅ Данные экспортированы${NC}"
echo ""

# Импорт данных
echo -e "${YELLOW}[Шаг 7] Импорт данных в PostgreSQL...${NC}"

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

psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "SET session_replication_role = 'replica';"

for table in "${TABLES_ORDER[@]}"; do
    if [ -f "$EXPORT_DIR/$table.csv" ]; then
        echo -n "  Импорт $table... "
        psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "TRUNCATE TABLE $table CASCADE;" 2>/dev/null || true
        psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "\COPY $table FROM '$EXPORT_DIR/$table.csv' WITH CSV HEADER;" 2>/dev/null && echo -e "${GREEN}OK${NC}" || echo -e "${YELLOW}пропущено${NC}"
    fi
done

psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "SET session_replication_role = 'origin';"

echo -e "${GREEN}✅ Данные импортированы${NC}"
echo ""

# Синхронизация sequences
echo -e "${YELLOW}[Шаг 8] Синхронизация sequences...${NC}"
psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -f "$BACKEND_DIR/database/scripts/sync_postgresql_sequences.sql"
echo -e "${GREEN}✅ Sequences синхронизированы${NC}"
echo ""

# JSONB миграция
echo -e "${YELLOW}[Шаг 9] Применение JSONB миграции...${NC}"
php artisan migrate --force
echo -e "${GREEN}✅ JSONB миграция применена${NC}"
echo ""

# Проверка
echo -e "${YELLOW}[Шаг 10] Финальная проверка...${NC}"
php artisan tinker --execute="
echo 'Драйвер: ' . DB::connection()->getDriverName() . PHP_EOL;
echo PHP_EOL . '📊 Данные:' . PHP_EOL;
\$tables = ['users', 'companies', 'bookings', 'advertisements', 'services'];
foreach (\$tables as \$t) {
    echo '  ' . \$t . ': ' . DB::table(\$t)->count() . PHP_EOL;
}
"

echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}  ✅ Миграция завершена!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
