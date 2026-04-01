# Ecme Marketplace - Архив для деплоя

Это архив проекта для развертывания на сервере.

## Что исключено из архива:

- `node_modules/` - зависимости Next.js (установятся через `npm install`)
- `backend/vendor/` - зависимости Laravel (установятся через `composer install`)
- `.next/` - кеш Next.js (создастся при сборке)
- `mobile/` - мобильное приложение (не нужно на сервере)
- `backend/storage/logs/` - логи (создадутся автоматически)
- `backend/storage/framework/cache/` - кеш Laravel (создастся автоматически)
- `backend/storage/framework/sessions/` - сессии (создадутся автоматически)
- `backend/storage/framework/views/` - скомпилированные views (создадутся автоматически)
- `.env*` - файлы окружения (создайте на основе `.env.example`)
- Все архивы и временные файлы

## Установка на сервере:

### 1. Распакуйте архив

```bash
tar -xzf ecme-marketplace-deploy-*.tar.gz
cd ecme-marketplace-deploy-*
```

### 2. Установите зависимости Backend

```bash
cd backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
# Отредактируйте .env файл
php artisan key:generate
php artisan jwt:secret
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 3. Установите зависимости Frontend

```bash
cd .. # вернуться в корень проекта
npm install --production
npm run build
```

### 4. Настройте веб-сервер

См. инструкции в `DEPLOY.md` для настройки Nginx/Apache.

### 5. Настройте процессы

Используйте PM2 или Supervisor для запуска:
- Next.js production сервера
- Laravel очередей (если используются)

## Важно:

- Файлы `.env` не включены - создайте их на основе `.env.example`
- База данных не включена - выполните миграции
- Загруженные файлы не включены - они будут созданы при работе приложения
- Логи не включены - они будут созданы автоматически
- Мобильное приложение не включено - оно не нужно на сервере

## Размер архива:

Архив содержит только исходный код и конфигурационные файлы, без зависимостей и кеша.
