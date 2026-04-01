# Ecme Marketplace - Легкая версия для показа

Это легкая версия проекта без зависимостей и временных файлов.

## Установка

### Frontend (Next.js)

```bash
npm install
npm run dev
```

### Backend (Laravel)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

### Mobile (React Native + Expo)

```bash
cd mobile
npm install
npx expo start
```

## Важно

- Файлы `.env` не включены в архив - создайте их на основе `.env.example`
- База данных не включена - выполните миграции
- Загруженные файлы не включены - они будут созданы при работе приложения
- Логи не включены - они будут созданы автоматически

## Структура проекта

- `src/` - Frontend код (Next.js)
- `backend/` - Backend API (Laravel)
- `mobile/` - Mobile приложение (React Native + Expo)
