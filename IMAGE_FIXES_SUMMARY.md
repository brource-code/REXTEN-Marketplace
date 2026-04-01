# Исправления для проблемы с изображениями

## Проблемы, которые были исправлены:

1. ✅ **Удалены упоминания IP адреса `192.168.1.120`** из конфигурационных файлов
2. ✅ **Обновлены все записи в базе данных** с IP адресами на правильный домен
3. ✅ **Улучшена функция `normalizeImageUrl`** для обработки URL с IP адресами
4. ✅ **Исправлен Next.js API route** для правильного определения URL Laravel API
5. ✅ **Улучшена логика нормализации** в `formatListing` для обработки URL с IP адресами

## Что было изменено:

### 1. Frontend: `frontend/src/utils/imageUtils.js`
- Добавлена проверка на IP адреса и localhost в функции `normalizeImageUrl`
- URL с IP адресами теперь автоматически преобразуются в `/api/storage/...` для использования Next.js proxy

### 2. Frontend: `frontend/src/app/api/storage/[...path]/route.js`
- Улучшена функция `getLaravelApiUrl()` для правильного определения URL Laravel API
- Добавлена поддержка определения URL по домену (dev.rexten.live -> api.rexten.live)

### 3. Frontend: `frontend/src/app/(public)/services/page.jsx`
- Улучшена логика нормализации изображений в функции `formatListing`
- Добавлена проверка на IP адреса и localhost даже для полных URL

### 4. Backend: `backend/app/Http/Controllers/MarketplaceController.php`
- Метод `normalizeAdvertisementImageUrl` уже обрабатывает IP адреса

## Что нужно проверить:

1. **Переменные окружения Frontend:**
   - Убедитесь, что `NEXT_PUBLIC_LARAVEL_API_URL` или `NEXT_PUBLIC_API_URL` установлены правильно
   - Для dev окружения: `https://api.rexten.live/api` или `/api`
   - Для production: `https://api.rexten.live/api`

2. **Переменные окружения Backend:**
   - Убедитесь, что `APP_URL` установлен правильно
   - Для dev окружения: `https://api.rexten.live` или `https://dev.rexten.live`
   - Для production: `https://api.rexten.live`

3. **Проверка изображений:**
   - Все изображения в базе данных должны иметь правильные URL без IP адресов
   - Если изображения все еще не загружаются, проверьте логи Next.js API route

## Если изображения все еще не загружаются:

1. Проверьте логи Next.js API route в консоли браузера
2. Проверьте, что файлы существуют в Laravel storage
3. Проверьте, что Next.js API route может получить доступ к Laravel API
4. Убедитесь, что переменные окружения установлены правильно

## Команды для проверки:

```bash
# Проверить записи с IP адресами в базе данных
cd /home/byrelaxx/rexten
docker-compose exec -T backend php artisan tinker --execute="
\$count = DB::table('advertisements')->whereNotNull('image')->where('image', '!=', '')->where(function(\$q) {
    \$q->where('image', 'like', '%192.168.%')
       ->orWhere('image', 'like', '%localhost%')
       ->orWhere('image', 'like', '%127.0.0.1%');
})->count();
echo 'Records with IP/localhost: ' . \$count . PHP_EOL;
"
```

Если команда возвращает 0, значит все записи обновлены.
