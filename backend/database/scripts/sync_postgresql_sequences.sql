-- Скрипт для синхронизации sequences в PostgreSQL после миграции данных
-- Запустите этот скрипт ПОСЛЕ импорта данных из SQLite через pgloader или другой инструмент

-- Функция для синхронизации всех sequences
DO $$
DECLARE
    r RECORD;
    max_id BIGINT;
    seq_name TEXT;
BEGIN
    RAISE NOTICE 'Starting sequence synchronization...';
    
    FOR r IN (
        SELECT 
            t.relname AS table_name,
            a.attname AS column_name,
            pg_get_serial_sequence(t.relname::text, a.attname::text) AS sequence_name
        FROM pg_class t
        JOIN pg_attribute a ON a.attrelid = t.oid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE t.relkind = 'r'
          AND n.nspname = 'public'
          AND a.attnum > 0
          AND NOT a.attisdropped
          AND pg_get_serial_sequence(t.relname::text, a.attname::text) IS NOT NULL
    ) LOOP
        EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', r.column_name, r.table_name) INTO max_id;
        
        IF max_id > 0 THEN
            EXECUTE format('SELECT setval(%L, %s)', r.sequence_name, max_id);
            RAISE NOTICE 'Synced sequence % to % for table %.%', r.sequence_name, max_id, r.table_name, r.column_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Sequence synchronization completed!';
END $$;

-- Альтернативный вариант - синхронизация конкретных таблиц
-- Раскомментируйте и используйте при необходимости

-- SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
-- SELECT setval('companies_id_seq', (SELECT COALESCE(MAX(id), 1) FROM companies));
-- SELECT setval('bookings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM bookings));
-- SELECT setval('orders_id_seq', (SELECT COALESCE(MAX(id), 1) FROM orders));
-- SELECT setval('services_id_seq', (SELECT COALESCE(MAX(id), 1) FROM services));
-- SELECT setval('service_categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM service_categories));
-- SELECT setval('advertisements_id_seq', (SELECT COALESCE(MAX(id), 1) FROM advertisements));
-- SELECT setval('reviews_id_seq', (SELECT COALESCE(MAX(id), 1) FROM reviews));
-- SELECT setval('notifications_id_seq', (SELECT COALESCE(MAX(id), 1) FROM notifications));
-- SELECT setval('favorites_id_seq', (SELECT COALESCE(MAX(id), 1) FROM favorites));
-- SELECT setval('additional_services_id_seq', (SELECT COALESCE(MAX(id), 1) FROM additional_services));
-- SELECT setval('team_members_id_seq', (SELECT COALESCE(MAX(id), 1) FROM team_members));
-- SELECT setval('salary_settings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM salary_settings));
-- SELECT setval('salary_calculations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM salary_calculations));
