-- Добавление поля title в таблицу bookings
-- Выполните этот SQL скрипт в вашей базе данных PostgreSQL

-- Для PostgreSQL:
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL;

-- Если нужно добавить после service_id (только для MySQL):
-- ALTER TABLE bookings ADD COLUMN title VARCHAR(255) NULL AFTER service_id;
