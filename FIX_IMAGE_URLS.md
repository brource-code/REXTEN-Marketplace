# Исправление URL изображений и удаление IP адресов

## Что было исправлено

1. ✅ Удалены упоминания IP адреса `192.168.1.120` из конфигурационных файлов:
   - `backend/config/cors.php` - удален IP из allowed_origins
   - `frontend/next.config.mjs` - удален IP из allowedDevOrigins
   - `frontend/mobile/src/api/config.ts` - заменен IP на localhost для dev и api.rexten.live для prod

2. ✅ Исправлено формирование URL изображений в контроллерах:
   - `backend/app/Http/Controllers/Admin/AdvertisementsController.php` - теперь использует `config('app.url')` для формирования полного URL
   - `backend/app/Http/Controllers/Business/SettingsController.php` - уже использовал правильный подход
   - `backend/app/Http/Controllers/MarketplaceController.php` - метод `normalizeAdvertisementImageUrl` теперь обрабатывает IP адреса

3. ✅ Создана миграция для обновления существующих URL в базе данных:
   - `backend/database/migrations/2026_01_13_000000_update_advertisement_image_urls_to_use_domain.php`

## Что нужно сделать вручную

### 1. Настроить APP_URL в .env файле backend

Откройте `/home/byrelaxx/rexten/backend/.env` и убедитесь, что:

```env
# Для dev окружения:
APP_URL=https://dev.rexten.live

# Или для production:
APP_URL=https://api.rexten.live
```

**ВАЖНО:** Используйте HTTPS, а не HTTP!

### 2. Обновить существующие URL в базе данных

После настройки APP_URL, обновите существующие URL в базе данных:

```bash
cd /home/byrelaxx/rexten
# Через tinker (рекомендуется):
docker-compose exec -T backend php artisan tinker --execute="
\$baseUrl = rtrim(config('app.url'), '/');
if (str_starts_with(\$baseUrl, 'http://') && !str_contains(\$baseUrl, 'localhost') && !str_contains(\$baseUrl, '127.0.0.1')) {
    \$baseUrl = str_replace('http://', 'https://', \$baseUrl);
}
\$updated = 0;
DB::table('advertisements')->whereNotNull('image')->where('image', '!=', '')->get()->each(function (\$ad) use (\$baseUrl, &\$updated) {
    \$image = \$ad->image;
    if (preg_match('/http:\/\/(192\.168\.\d+\.\d+|localhost|127\.0\.0\.1):\d+\//', \$image)) {
        \$parsedUrl = parse_url(\$image);
        \$path = \$parsedUrl['path'] ?? '';
        \$newUrl = \$baseUrl . \$path;
        DB::table('advertisements')->where('id', \$ad->id)->update(['image' => \$newUrl]);
        echo 'Updated ID ' . \$ad->id . PHP_EOL;
        \$updated++;
    }
});
echo 'Updated: ' . \$updated . ' records' . PHP_EOL;
"

# Или через команду (если зарегистрирована):
docker-compose exec -T backend php artisan advertisements:update-image-urls
```

### 3. Перезапустить backend

После изменений в .env файле нужно перезапустить backend:

```bash
cd /home/byrelaxx/rexten
docker-compose restart backend
```

### 4. Проверить работу

1. Откройте https://dev.rexten.live/services
2. Проверьте консоль браузера - не должно быть ошибок Mixed Content
3. Проверьте, что изображения объявлений отображаются корректно

## Как это работает теперь

1. **При загрузке нового изображения:**
   - Контроллер использует `config('app.url')` для формирования полного URL
   - URL сохраняется в базе данных с правильным доменом (https://api.rexten.live или https://dev.rexten.live)

2. **При отображении существующих изображений:**
   - Метод `normalizeAdvertisementImageUrl` в `MarketplaceController` автоматически заменяет старые URL с IP адресами на правильный домен
   - На фронтенде `normalizeImageUrl` в `imageUtils.js` обрабатывает URL через Next.js API proxy

3. **Миграция обновляет существующие записи:**
   - Все URL с IP адресами (192.168.1.120, localhost, 127.0.0.1) заменяются на правильный домен из `config('app.url')`

## Решение проблемы "нет фото"

Проблема была в том, что:
- URL изображений содержали IP адрес `192.168.1.120:8000`
- Браузер блокировал Mixed Content (HTTPS страница запрашивает HTTP ресурс с IP адреса)
- Изображения не загружались, показывалось "нет фото"

Теперь:
- Все URL формируются с правильным доменом (https://api.rexten.live или https://dev.rexten.live)
- Используется HTTPS, что решает проблему Mixed Content
- Изображения должны отображаться корректно
