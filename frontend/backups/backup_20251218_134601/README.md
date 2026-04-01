# Бэкап проекта перед миграцией структуры услуг

## Дата создания
$(date)

## Что включено в бэкап

1. **База данных**: `database.sqlite` - полная копия БД
2. **Backend модели**:
   - `Service.php`
   - `AdditionalService.php`
3. **Backend контроллеры**:
   - `AdditionalServicesController.php`
4. **Миграции**: Все файлы миграций
5. **Frontend API клиенты**:
   - `additionalServices.ts`
6. **Frontend компоненты**:
   - `BookingAdditionalServices.jsx`

## Как восстановить из бэкапа

### Восстановление базы данных:
```bash
cp backups/backup_YYYYMMDD_HHMMSS/database.sqlite backend/database/database.sqlite
```

### Восстановление файлов:
```bash
cp backups/backup_YYYYMMDD_HHMMSS/backend/app/Models/*.php backend/app/Models/
cp backups/backup_YYYYMMDD_HHMMSS/backend/app/Http/Controllers/Admin/*.php backend/app/Http/Controllers/Admin/
cp backups/backup_YYYYMMDD_HHMMSS/src/lib/api/*.ts src/lib/api/
cp backups/backup_YYYYMMDD_HHMMSS/src/components/*.jsx src/components/
```

## Текущее состояние БД

- Услуг в services: 6
- Объявлений: 31 (6 рекламных, 25 обычных)
- Дополнительных услуг: 2
- Бронирований: 136

## Примечания

Этот бэкап создан перед миграцией структуры услуг для упрощения архитектуры.
