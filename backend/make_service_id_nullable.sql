-- Миграция: сделать service_id nullable в таблице bookings
-- Выполните этот SQL скрипт напрямую в базе данных, если PHP 8.3 еще не установлен

-- Для MySQL
ALTER TABLE bookings MODIFY service_id BIGINT UNSIGNED NULL;

-- Проверка: убедитесь, что поле теперь nullable
-- DESCRIBE bookings;
