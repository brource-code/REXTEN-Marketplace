# Отчет об очистке старых IP адресов

## ✅ Выполнено

### 1. Конфигурационные файлы
- ✅ `backend/config/cors.php` - удалены конкретные IP адреса из `allowed_origins`, оставлены только домены
- ✅ `frontend/next.config.mjs` - удален IP `192.168.1.120` из `allowedDevOrigins`
- ✅ `frontend/mobile/src/api/config.ts` - заменен IP на `localhost` для dev и `api.rexten.live` для prod

### 2. Код приложения
- ✅ `backend/app/Http/Controllers/MarketplaceController.php` - метод `normalizeAdvertisementImageUrl` обрабатывает IP адреса
- ✅ `backend/app/Http/Controllers/Admin/AdvertisementsController.php` - использует `config('app.url')` для формирования URL
- ✅ `frontend/src/utils/imageUtils.js` - улучшена обработка URL с IP адресами
- ✅ `frontend/src/app/api/storage/[...path]/route.js` - улучшена функция `getLaravelApiUrl()`
- ✅ `frontend/src/app/(public)/services/page.jsx` - улучшена логика нормализации изображений

### 3. База данных
- ✅ Все записи с IP адресами обновлены (0 записей найдено)
- ✅ Создан скрипт `cleanup_old_ip.sh` для автоматической очистки

## 📋 Текущие настройки

### Backend
- **APP_URL**: `https://api.rexten.live` (для production)
- **APP_URL**: `https://dev.rexten.live` или `https://api.rexten.live` (для dev)

### Frontend
- **NEXT_PUBLIC_LARAVEL_API_URL**: `/api` (для dev) или `https://api.rexten.live/api` (для prod)
- **NEXT_PUBLIC_APP_URL**: `https://dev.rexten.live` (для dev) или `https://rexten.live` (для prod)

### Mobile
- **EXPO_PUBLIC_API_BASE_URL**: `https://api.rexten.live/api` (для production)
- **Fallback для dev**: `http://localhost:8000/api`

## ⚠️ Примечания

1. **CORS паттерны**: В `backend/config/cors.php` оставлены паттерны для локальных IP адресов (`192.168.x.x`), что нормально для локальной разработки. Это не влияет на production.

2. **Backup директории**: В старых backup директориях (`ecme-marketplace-light-20260109_182539`, `ecme-marketplace-deploy-20260112_191402`) могут остаться упоминания старых IP адресов, но это не критично, так как это старые версии.

3. **Логи**: В `backend/storage/logs/laravel.log` могут быть старые записи с IP адресами, но это только исторические данные.

## 🔧 Команды для проверки

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

# Запустить скрипт очистки
./cleanup_old_ip.sh
```

## ✅ Результат

Все упоминания старых IP адресов (`192.168.1.120`, `192.168.1.72`) удалены из активного кода и конфигурационных файлов. Система теперь использует домены:
- `https://api.rexten.live` - для API
- `https://dev.rexten.live` - для dev фронтенда
- `https://rexten.live` - для production фронтенда
