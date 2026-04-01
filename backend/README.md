# Ecme Marketplace Backend API

Laravel API для платформы Ecme Marketplace.

## Требования

- PHP >= 8.1
- Composer
- MySQL >= 8.0 или PostgreSQL >= 13
- Node.js и NPM (для фронтенда)

## Установка

1. Установите зависимости:
```bash
composer install
```

2. Скопируйте `.env.example` в `.env`:
```bash
cp .env.example .env
```

3. Сгенерируйте ключ приложения:
```bash
php artisan key:generate
```

4. Настройте базу данных в `.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ecme_marketplace
DB_USERNAME=root
DB_PASSWORD=
```

5. Запустите миграции:
```bash
php artisan migrate
```

6. Заполните базу тестовыми данными:
```bash
php artisan db:seed
```

7. Запустите сервер разработки:
```bash
php artisan serve
```

API будет доступен по адресу: `http://localhost:8000`

## Структура проекта

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   ├── Client/
│   │   │   ├── Business/
│   │   │   └── Admin/
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Models/
│   ├── Services/
│   └── Enums/
│── database/
│   ├── migrations/
│   └── seeders/
│── routes/
│   └── api.php
└── config/
```

## API Endpoints

### Авторизация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токена
- `POST /api/auth/logout` - Выход
- `GET /api/auth/me` - Текущий пользователь

### Клиент
- `GET /api/client/profile` - Профиль клиента
- `PUT /api/client/profile` - Обновление профиля
- `POST /api/client/profile/avatar` - Загрузка аватара
- `GET /api/client/orders` - Список заказов
- `GET /api/client/bookings` - Список бронирований
- `POST /api/client/bookings/{id}/cancel` - Отмена бронирования
- `GET /api/client/reviews` - Отзывы клиента
- `GET /api/client/favorites/services` - Избранные услуги
- `GET /api/client/favorites/businesses` - Избранные бизнесы
- `GET /api/client/notifications` - Уведомления

### Бизнес
- `GET /api/business/dashboard/stats` - Статистика
- `GET /api/business/schedule/slots` - Слоты расписания
- `GET /api/business/clients` - Список клиентов
- `GET /api/business/settings/profile` - Профиль бизнеса
- `PUT /api/business/settings/profile` - Обновление профиля

### Суперадмин
- `GET /api/admin/dashboard/stats` - Статистика платформы
- `GET /api/admin/companies` - Список компаний
- `GET /api/admin/users` - Список пользователей
- `GET /api/admin/advertisements` - Реклама

## Multi-Tenant Архитектура

Проект использует multi-tenant архитектуру:
- Каждый бизнес изолирован по `company_id`
- Middleware автоматически фильтрует данные по текущему бизнесу
- Суперадмин имеет доступ ко всем данным

## Роли

- `CLIENT` - Клиент платформы
- `BUSINESS_OWNER` - Владелец бизнеса
- `SUPERADMIN` - Суперадминистратор

## JWT Авторизация

Используется пакет `tymon/jwt-auth` для JWT токенов:
- Access token (15 минут)
- Refresh token (7 дней)

## CORS

Настроен для работы с фронтендом на `http://localhost:3003`

