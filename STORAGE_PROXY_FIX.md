# Исправление проблемы с Next.js Storage Proxy (500 ошибка)

## Проблема
Next.js API route `/api/storage/[...path]` возвращал ошибку 500 при попытке получить файлы из Laravel storage.

## Причина
1. Next.js API route пытался получить файлы через внешний HTTPS URL (`https://api.rexten.live`)
2. В Docker контейнере это может вызывать проблемы с сетью или SSL
3. Nginx не был настроен для проксирования запросов к `/storage/` на backend

## Решение

### 1. Обновлен Next.js API route
- ✅ Добавлена логика определения Docker окружения
- ✅ В Docker используется внутренний Docker network URL: `http://backend:8000`
- ✅ Улучшена обработка ошибок с timeout и retry логикой

### 2. Обновлен Nginx конфигурация
- ✅ Добавлено правило для проксирования `/storage/` на backend
- ✅ Настроено кэширование статических файлов
- ✅ Добавлены CORS заголовки для изображений

### 3. Создан симлинк storage
- ✅ Выполнена команда `php artisan storage:link` в контейнере backend
- ✅ Симлинк создан: `/var/www/html/public/storage -> /var/www/html/storage/app/public`

## Текущая конфигурация

### Next.js API route
- В Docker: использует `http://backend:8000` (внутренний Docker network)
- В dev (локально): использует `http://localhost:8000`
- В production (вне Docker): использует `https://api.rexten.live`

### Nginx
- `/storage/` запросы проксируются на `http://backend`
- Кэширование: 1 год для статических файлов
- CORS заголовки добавлены для изображений

## Проверка

```bash
# Проверить доступность файла через HTTP
curl -I "http://api.rexten.live/storage/advertisements/UM33QmZIdFKsCs4tmnqr9mvbQZvjTgRMTj1bZyEf.jpg"

# Проверить симлинк в контейнере
docker-compose exec backend ls -la /var/www/html/public/storage

# Проверить существование файла
docker-compose exec backend test -f /var/www/html/storage/app/public/advertisements/UM33QmZIdFKsCs4tmnqr9mvbQZvjTgRMTj1bZyEf.jpg
```

## Результат
✅ Файлы теперь доступны через:
- `https://api.rexten.live/storage/...` - внешний доступ
- `http://backend:8000/storage/...` - внутренний Docker network (используется Next.js API route)
