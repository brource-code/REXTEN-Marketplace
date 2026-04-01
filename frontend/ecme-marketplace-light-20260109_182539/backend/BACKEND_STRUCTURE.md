# Структура Backend API

## Обзор

Backend построен на Laravel 10 с использованием:
- JWT авторизации (tymon/jwt-auth)
- Multi-tenant архитектуры
- RESTful API

## Структура директорий

```
backend/
├── app/
│   ├── Enums/
│   │   ├── UserRole.php          # Роли пользователей
│   │   ├── BookingStatus.php     # Статусы бронирований
│   │   └── OrderStatus.php        # Статусы заказов
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   │   └── AuthController.php
│   │   │   ├── Client/
│   │   │   │   ├── ProfileController.php
│   │   │   │   ├── OrdersController.php
│   │   │   │   ├── BookingsController.php
│   │   │   │   ├── ReviewsController.php
│   │   │   │   ├── FavoritesController.php
│   │   │   │   └── NotificationsController.php
│   │   │   ├── Business/
│   │   │   │   ├── DashboardController.php
│   │   │   │   ├── ScheduleController.php
│   │   │   │   ├── ClientsController.php
│   │   │   │   └── SettingsController.php
│   │   │   └── Admin/
│   │   │       ├── DashboardController.php
│   │   │       ├── CompaniesController.php
│   │   │       ├── UsersController.php
│   │   │       ├── AdvertisementsController.php
│   │   │       └── ModulesController.php
│   │   ├── Middleware/
│   │   │   ├── TenantMiddleware.php      # Multi-tenant изоляция
│   │   │   ├── RoleMiddleware.php        # Проверка ролей
│   │   │   └── JwtMiddleware.php         # JWT авторизация
│   │   └── Requests/
│   │       ├── Auth/
│   │       ├── Client/
│   │       ├── Business/
│   │       └── Admin/
│   ├── Models/
│   │   ├── User.php
│   │   ├── UserProfile.php
│   │   ├── Company.php
│   │   ├── CompanyUser.php
│   │   ├── Service.php
│   │   ├── ServiceCategory.php
│   │   ├── Booking.php
│   │   ├── BookingSlot.php
│   │   ├── Order.php
│   │   ├── Review.php
│   │   ├── Favorite.php
│   │   ├── Notification.php
│   │   └── Advertisement.php
│   └── Services/
│       ├── BookingService.php
│       ├── PaymentService.php
│       └── NotificationService.php
├── database/
│   ├── migrations/
│   │   ├── 2024_01_01_000001_create_users_table.php
│   │   ├── 2024_01_01_000002_create_user_profiles_table.php
│   │   ├── 2024_01_01_000003_create_companies_table.php
│   │   ├── 2024_01_01_000004_create_company_users_table.php
│   │   ├── 2024_01_01_000005_create_services_table.php
│   │   ├── 2024_01_01_000006_create_bookings_table.php
│   │   ├── 2024_01_01_000007_create_orders_table.php
│   │   ├── 2024_01_01_000008_create_reviews_table.php
│   │   ├── 2024_01_01_000009_create_favorites_table.php
│   │   ├── 2024_01_01_000010_create_notifications_table.php
│   │   └── 2024_01_01_000011_create_advertisements_table.php
│   └── seeders/
│       ├── DatabaseSeeder.php
│       ├── UserSeeder.php
│       ├── CompanySeeder.php
│       └── ServiceSeeder.php
└── routes/
    └── api.php
```

## API Endpoints

### Авторизация (`/api/auth/*`)
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токена
- `POST /api/auth/logout` - Выход
- `GET /api/auth/me` - Текущий пользователь

### Клиент (`/api/client/*`)
- `GET /api/client/profile` - Профиль
- `PUT /api/client/profile` - Обновление профиля
- `POST /api/client/profile/avatar` - Загрузка аватара
- `GET /api/client/orders` - Список заказов
- `GET /api/client/bookings` - Список бронирований
- `POST /api/client/bookings/{id}/cancel` - Отмена бронирования
- `GET /api/client/reviews` - Отзывы клиента
- `GET /api/client/favorites/services` - Избранные услуги
- `GET /api/client/favorites/businesses` - Избранные бизнесы
- `POST /api/client/favorites/{type}/{id}` - Добавить в избранное
- `DELETE /api/client/favorites/{type}/{id}` - Удалить из избранного
- `GET /api/client/notifications` - Уведомления
- `POST /api/client/notifications/{id}/read` - Отметить как прочитанное

### Бизнес (`/api/business/*`)
- `GET /api/business/dashboard/stats` - Статистика
- `GET /api/business/schedule/slots` - Слоты расписания
- `POST /api/business/schedule/slots` - Создать слот
- `PUT /api/business/schedule/slots/{id}` - Обновить слот
- `DELETE /api/business/schedule/slots/{id}` - Удалить слот
- `GET /api/business/clients` - Список клиентов
- `GET /api/business/clients/{id}` - Детали клиента
- `GET /api/business/settings/profile` - Профиль бизнеса
- `PUT /api/business/settings/profile` - Обновление профиля
- `GET /api/business/settings/services` - Услуги бизнеса
- `POST /api/business/settings/services` - Создать услугу
- `PUT /api/business/settings/services/{id}` - Обновить услугу
- `DELETE /api/business/settings/services/{id}` - Удалить услугу

### Суперадмин (`/api/admin/*`)
- `GET /api/admin/dashboard/stats` - Статистика платформы
- `GET /api/admin/companies` - Список компаний
- `POST /api/admin/companies` - Создать компанию
- `PUT /api/admin/companies/{id}` - Обновить компанию
- `DELETE /api/admin/companies/{id}` - Удалить компанию
- `POST /api/admin/companies/{id}/approve` - Одобрить компанию
- `POST /api/admin/companies/{id}/reject` - Отклонить компанию
- `GET /api/admin/users` - Список пользователей
- `PUT /api/admin/users/{id}` - Обновить пользователя
- `POST /api/admin/users/{id}/block` - Заблокировать пользователя
- `POST /api/admin/users/{id}/unblock` - Разблокировать пользователя
- `GET /api/admin/advertisements` - Реклама
- `POST /api/admin/advertisements` - Создать рекламу
- `PUT /api/admin/advertisements/{id}` - Обновить рекламу
- `DELETE /api/admin/advertisements/{id}` - Удалить рекламу

## База данных

### Основные таблицы:
- `users` - Пользователи
- `user_profiles` - Профили пользователей
- `companies` - Компании/бизнесы
- `company_users` - Связь пользователей с компаниями
- `services` - Услуги
- `bookings` - Бронирования
- `orders` - Заказы
- `reviews` - Отзывы
- `favorites` - Избранное
- `notifications` - Уведомления
- `advertisements` - Реклама

## Multi-Tenant

Каждый бизнес изолирован по `company_id`. Middleware `TenantMiddleware` автоматически фильтрует запросы для владельцев бизнеса.

## Роли

- `CLIENT` - Клиент платформы
- `BUSINESS_OWNER` - Владелец бизнеса
- `SUPERADMIN` - Суперадминистратор

