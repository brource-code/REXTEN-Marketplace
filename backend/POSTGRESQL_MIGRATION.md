# Миграция SQLite → PostgreSQL

## Обзор

Проект подготовлен для работы с PostgreSQL. Все SQL-специфичные запросы используют кроссплатформенный хелпер `DatabaseHelper`.

---

## ⚠️ ВАЖНО: Выберите ОДИН сценарий миграции

Существует **два взаимоисключающих** сценария. **НЕ смешивайте их!**

| Сценарий | Когда использовать | Источник схемы |
|----------|-------------------|----------------|
| **A: Чистая установка** | Новый сервер, тестирование | Laravel миграции |
| **B: Перенос данных** | Продакшн с существующими данными | Laravel миграции + импорт данных |

---

## Предварительные требования

### 1. Проверка PHP расширений

```bash
# Проверить наличие pdo_pgsql
php -m | grep pgsql
# Должно вывести: pdo_pgsql, pgsql

# Если не установлено:
sudo apt install php-pgsql
sudo systemctl restart php-fpm  # или apache2
```

### 2. Установка PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Проверка статуса
sudo systemctl status postgresql
```

### 3. Создание базы данных

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE ecme_marketplace;
CREATE USER rexten_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ecme_marketplace TO rexten_user;
-- Для PostgreSQL 15+ также нужно:
\c ecme_marketplace
GRANT ALL ON SCHEMA public TO rexten_user;
\q
```

### 4. Настройка .env

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ecme_marketplace
DB_USERNAME=rexten_user
DB_PASSWORD=your_secure_password
```

---

## Сценарий A: Чистая установка

**Используйте если:** новый сервер, тестовое окружение, данные не нужны.

```bash
# 1. Очистить кеш
php artisan config:clear
php artisan cache:clear

# 2. Создать схему и заполнить тестовыми данными
php artisan migrate:fresh --seed

# 3. Проверить
php artisan migrate:status
```

**Готово!** Переходите к разделу "Smoke-тесты".

---

## Сценарий B: Перенос существующих данных

**Используйте если:** продакшн, нужно сохранить данные из SQLite.

### Шаг 1: Создать бэкап SQLite

```bash
cp database/database.sqlite database/database.sqlite.backup_$(date +%Y%m%d_%H%M%S)
```

### Шаг 2: Проверить валидность JSON данных

⚠️ **КРИТИЧНО:** Перед миграцией убедитесь, что JSON колонки содержат валидный JSON.

```bash
# Запустить скрипт проверки
php database/scripts/validate_json_before_migration.php
```

Скрипт проверит все JSON колонки и выведет отчёт:
- ✅ Если всё OK - можно продолжать
- ❌ Если есть ошибки - исправьте данные перед миграцией

### Шаг 3: Создать схему в PostgreSQL (Laravel = источник истины)

```bash
# Очистить кеш
php artisan config:clear
php artisan cache:clear

# Создать все таблицы через Laravel миграции
php artisan migrate
```

### Шаг 4: Экспорт данных из SQLite

#### Вариант B1: Через CSV (рекомендуется - предсказуемо)

```bash
# Создать папку для экспорта
mkdir -p database/export

# Экспортировать каждую таблицу
sqlite3 database/database.sqlite <<EOF
.headers on
.mode csv
.output database/export/users.csv
SELECT * FROM users;
.output database/export/companies.csv
SELECT * FROM companies;
.output database/export/bookings.csv
SELECT * FROM bookings;
.output database/export/advertisements.csv
SELECT * FROM advertisements;
.output database/export/services.csv
SELECT * FROM services;
.output database/export/service_categories.csv
SELECT * FROM service_categories;
.output database/export/reviews.csv
SELECT * FROM reviews;
.output database/export/orders.csv
SELECT * FROM orders;
.output database/export/notifications.csv
SELECT * FROM notifications;
.output database/export/favorites.csv
SELECT * FROM favorites;
.output database/export/additional_services.csv
SELECT * FROM additional_services;
.output database/export/team_members.csv
SELECT * FROM team_members;
.output database/export/user_profiles.csv
SELECT * FROM user_profiles;
.quit
EOF
```

#### Импорт в PostgreSQL

```bash
# Импортировать данные (порядок важен из-за FK!)
psql -U rexten_user -d ecme_marketplace <<EOF
\copy users FROM 'database/export/users.csv' WITH CSV HEADER;
\copy user_profiles FROM 'database/export/user_profiles.csv' WITH CSV HEADER;
\copy companies FROM 'database/export/companies.csv' WITH CSV HEADER;
\copy service_categories FROM 'database/export/service_categories.csv' WITH CSV HEADER;
\copy services FROM 'database/export/services.csv' WITH CSV HEADER;
\copy advertisements FROM 'database/export/advertisements.csv' WITH CSV HEADER;
\copy team_members FROM 'database/export/team_members.csv' WITH CSV HEADER;
\copy bookings FROM 'database/export/bookings.csv' WITH CSV HEADER;
\copy orders FROM 'database/export/orders.csv' WITH CSV HEADER;
\copy reviews FROM 'database/export/reviews.csv' WITH CSV HEADER;
\copy notifications FROM 'database/export/notifications.csv' WITH CSV HEADER;
\copy favorites FROM 'database/export/favorites.csv' WITH CSV HEADER;
\copy additional_services FROM 'database/export/additional_services.csv' WITH CSV HEADER;
EOF
```

#### Вариант B2: Через pgloader (только данные, БЕЗ создания таблиц)

⚠️ **НЕ используйте `create tables` или `include drop`** - схема уже создана Laravel!

```bash
sudo apt install pgloader
```

Создайте файл `migrate_data_only.load`:

```
LOAD DATABASE
    FROM sqlite:///full/path/to/database/database.sqlite
    INTO postgresql://rexten_user:password@localhost/ecme_marketplace

WITH data only,                    -- ТОЛЬКО данные, без схемы!
     truncate,                     -- Очистить таблицы перед импортом
     disable triggers,             -- Отключить триггеры на время импорта
     reset sequences               -- Сбросить sequences

SET work_mem to '16MB',
    maintenance_work_mem to '512 MB'

CAST type string to text,
     type integer to integer,
     type real to double precision;
```

```bash
pgloader migrate_data_only.load
```

### Шаг 5: Синхронизировать sequences

```bash
psql -U rexten_user -d ecme_marketplace -f database/scripts/sync_postgresql_sequences.sql
```

### Шаг 6: Применить JSONB миграцию (опционально, для производительности)

```bash
php artisan migrate
```

**Готово!** Переходите к разделу "Smoke-тесты".

---

## Smoke-тесты (ОБЯЗАТЕЛЬНО!)

После миграции выполните эти проверки:

### Технические проверки

```bash
# 1. Проверить драйвер
php artisan tinker --execute="echo \DB::connection()->getDriverName();"
# Ожидается: pgsql

# 2. Проверить статус миграций
php artisan migrate:status

# 3. Очистить кеш
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# 4. Проверить количество записей
php artisan tinker --execute="
echo 'Users: ' . \App\Models\User::count() . PHP_EOL;
echo 'Companies: ' . \App\Models\Company::count() . PHP_EOL;
echo 'Bookings: ' . \App\Models\Booking::count() . PHP_EOL;
echo 'Advertisements: ' . \App\Models\Advertisement::count() . PHP_EOL;
"
```

### Функциональные проверки

| Функция | Что проверить | Затрагивает |
|---------|---------------|-------------|
| Авторизация | Логин/регистрация | users, user_profiles |
| Поиск | Поиск по названию (ILIKE) | advertisements, companies |
| Отчёты | Отчёты по месяцам | TO_CHAR, GROUP BY |
| Бронирование | Создание записи | bookings, JSON поля |
| Фильтры по датам | Фильтрация в дашборде | whereDate, whereBetween |
| JSON поля | Просмотр услуг в объявлении | advertisements.services |

### Проверка через API

```bash
# Проверить публичный эндпоинт
curl -s http://localhost:8000/api/marketplace/services | head -c 500

# Проверить авторизацию (замените токен)
curl -s -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/business/dashboard/stats
```

---

## Выполненные изменения в коде

### 1. Конфигурация базы данных
- **Файл:** `config/database.php`
- Добавлена конфигурация `pgsql`

### 2. Кроссплатформенный хелпер
- **Файл:** `app/Helpers/DatabaseHelper.php`
- Методы:
  - `dateFormatYearMonth()` - форматирование даты YYYY-MM
  - `dateFormatYearMonthDay()` - форматирование даты YYYY-MM-DD
  - `extractMonth()` / `extractYear()` - извлечение частей даты
  - `concat()` - конкатенация строк
  - `whereLike()` - кроссплатформенный LIKE/ILIKE
  - `countDistinctClients()` - подсчет уникальных клиентов

### 3. Обновленные контроллеры
- `Business/DashboardController.php`
- `Admin/DashboardController.php`
- `Business/ReportsController.php`
- `Admin/CompaniesController.php`
- `MarketplaceController.php`
- `Business/ClientsController.php`
- `Admin/UsersController.php`
- `Admin/CategoriesController.php`

### 4. Миграция для JSONB
- **Файл:** `database/migrations/2026_02_05_000001_update_json_columns_for_postgresql.php`
- Конвертирует JSON → JSONB для лучшей производительности в PostgreSQL

### 5. Скрипт синхронизации sequences
- **Файл:** `database/scripts/sync_postgresql_sequences.sql`

### 6. Скрипт валидации JSON
- **Файл:** `database/scripts/validate_json_before_migration.php`
- Проверяет валидность всех JSON данных перед миграцией

---

## Различия между SQLite и PostgreSQL

| Функция | SQLite | PostgreSQL | Примечание |
|---------|--------|------------|------------|
| Форматирование даты | `strftime('%Y-%m', col)` | `TO_CHAR(col, 'YYYY-MM')` | Обрабатывается DatabaseHelper |
| Конкатенация | `col1 \|\| col2` | `col1 \|\| col2` | Одинаково |
| LIKE | Регистронезависимый | Регистрозависимый | Используем ILIKE для pgsql |
| JSON | json (текст) | jsonb (бинарный) | JSONB быстрее для запросов |
| Boolean | 0/1 | true/false | Laravel касты обрабатывают |
| NULL в ORDER BY | Зависит от версии | Отличается | Используйте `NULLS FIRST/LAST` если критично |

---

## Откат на SQLite

Если нужно вернуться на SQLite:

```env
DB_CONNECTION=sqlite
DB_DATABASE=/full/path/to/database/database.sqlite
```

Код автоматически определит драйвер и использует правильный SQL.

---

## Бэкапы

Бэкапы SQLite базы:
- `database/database.sqlite.backup_before_postgres_*`
- `backups/database.sqlite.backup_before_postgres_*`

---

## Troubleshooting

### Ошибка: "relation does not exist"
```bash
# Проверить, что миграции применены
php artisan migrate:status
php artisan migrate
```

### Ошибка: "invalid input syntax for type json"
```bash
# JSON данные невалидны. Проверьте исходные данные в SQLite
sqlite3 database/database.sqlite "SELECT id, services FROM advertisements WHERE services IS NOT NULL LIMIT 5;"
```

### Ошибка: "duplicate key value violates unique constraint"
```bash
# Sequences не синхронизированы
psql -U rexten_user -d ecme_marketplace -f database/scripts/sync_postgresql_sequences.sql
```

### Ошибка: "permission denied for schema public"
```sql
-- В psql под postgres:
\c ecme_marketplace
GRANT ALL ON SCHEMA public TO rexten_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rexten_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rexten_user;
```

### Медленные запросы с LIKE
```sql
-- Создать индекс для текстового поиска
CREATE INDEX idx_advertisements_title_trgm ON advertisements USING gin (title gin_trgm_ops);
-- Требует расширение pg_trgm:
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```
