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

## Демо-данные для презентаций (LA Home & Glow)

Команда наполняет компанию владельца **только выездным клинингом** (offsite, маршруты): несколько услуг с более высокими ценами, **~96 броней** в окне **апрель–июнь** (от сегодняшней даты внутри квартала; преобладает статус `completed`). Клиенты с адресами публичных POI в Greater LA, телефоны +1-555. Бьюти — в отдельном демо-аккаунте.

```bash
docker exec rexten_backend php artisan demo:seed-business --owner-email=demo@rexten.pro
```

Повторный полный прогон с удалением предыдущих записей с меткой `[demo-seed]`:

```bash
docker exec rexten_backend php artisan demo:seed-business --owner-email=demo@rexten.pro --force
```

Если у пользователя ещё нет строки в `companies`, команда создаст компанию автоматически (роль владельца должна быть `BUSINESS_OWNER`). Оптимизация маршрутов вызывается для выездных специалистов; при ошибке внешнего API маршрутизации сообщение выводится в консоль, брони остаются в БД.

### Демо бьюти (отдельный аккаунт: маникюр, брови, парикмахер)

Владелец по умолчанию: **`demo-beauty@rexten.pro`** (вариант «к `demo@rexten.pro` добавлено» — отдельный email). Клиенты демо — отдельный пул `rexten_demo_b_*@clients.rexten.demo`, чтобы не пересекаться с клинингом.

Первый запуск (создать владельца `BUSINESS_OWNER` и наполнить салон):

```bash
docker exec rexten_backend php artisan demo:seed-beauty-business --create-owner --force
```

Пароль владельца при `--create-owner` выводится в консоль (для демо совпадает с тестовыми учётками README: `demo12345`). Повторное полное пересоздание: добавьте `--force`.

### Демо HVAC (отопление / кондиционирование, выезд)

Владелец по умолчанию: **`demo-hvac@rexten.pro`**. Клиенты — пул `rexten_demo_h_*@clients.rexten.demo`. Два техника с депо как у клининга; услуги в категории **hvac** (AC tune-up, heating safety, duct cleaning), **~88 броней** offsite, маршруты при ≥2 выездах в день на специалиста.

```bash
docker exec rexten_backend php artisan demo:seed-hvac-business --create-owner --force
```

