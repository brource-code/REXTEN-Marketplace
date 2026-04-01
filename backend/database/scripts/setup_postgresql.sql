-- Скрипт для создания базы данных и пользователя PostgreSQL
-- Выполнить: sudo -u postgres psql < database/scripts/setup_postgresql.sql

-- Создать базу данных (если не существует)
SELECT 'CREATE DATABASE ecme_marketplace' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ecme_marketplace')\gexec

-- Создать пользователя (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'rexten_user') THEN
        CREATE USER rexten_user WITH PASSWORD 'rexten_password';
    END IF;
END
$$;

-- Дать права на базу
GRANT ALL PRIVILEGES ON DATABASE ecme_marketplace TO rexten_user;

-- Подключиться к базе и дать права на схему
\c ecme_marketplace

GRANT ALL ON SCHEMA public TO rexten_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rexten_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rexten_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO rexten_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO rexten_user;

\q
