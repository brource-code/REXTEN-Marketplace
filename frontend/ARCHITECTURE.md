# Архитектура проекта REXTEN

## Общая информация

**REXTEN** - это платформа для маркетплейса услуг с multi-tenant архитектурой, состоящая из:
- **Frontend**: Next.js 15 + React 19 (веб-приложение)
- **Backend**: Laravel 10 + PHP 8.1+ (REST API)
- **Mobile**: React Native + Expo (мобильное приложение)

---

## Технологический стек

### Frontend (Next.js)
- **Framework**: Next.js 15.5.4 с App Router
- **React**: 19.0.0
- **TypeScript/JavaScript**: Смешанное использование
- **State Management**: Zustand 5.0.8
- **Data Fetching**: React Query (@tanstack/react-query) 5.90.10
- **Styling**: Tailwind CSS 4.0.4
- **Internationalization**: next-intl 4.3.4
- **Authentication**: JWT токены (tymon/jwt-auth на backend)
- **Forms**: react-hook-form 7.53.0 + zod 4.1.1

### Backend (Laravel)
- **Framework**: Laravel 10
- **PHP**: 8.1+
- **Database**: MySQL
- **Authentication**: JWT (tymon/jwt-auth)
- **API**: RESTful API

### Mobile (React Native)
- **Framework**: React Native 0.81.5 + Expo ~54.0.25
- **Navigation**: React Navigation
- **State Management**: Context API
- **Styling**: StyleSheet (без Tailwind/NativeWind)

---

## Структура проекта

### Frontend структура (`src/`)

```
src/
├── app/                          # Next.js App Router страницы
│   ├── (public)/                 # Публичные страницы
│   │   ├── landing/             # Главная страница
│   │   ├── services/            # Каталог услуг
│   │   ├── marketplace/[slug]/  # Профиль услуги/бизнеса
│   │   ├── auth/                # Авторизация
│   │   ├── booking/             # Бронирование
│   │   ├── orders/              # Заказы
│   │   ├── profile/             # Публичный профиль
│   │   ├── review/              # Отзывы
│   │   └── cookies/             # Политика cookies
│   ├── (client)/                # Личный кабинет клиента
│   │   ├── profile/             # Профиль клиента
│   │   ├── orders/              # История заказов
│   │   └── booking/             # Бронирования
│   ├── (business)/              # Админка бизнеса
│   │   ├── dashboard/           # Дашборд
│   │   ├── schedule/            # Расписание
│   │   ├── clients/             # CRM клиентов
│   │   ├── settings/            # Настройки бизнеса
│   │   ├── reviews/             # Отзывы
│   │   └── advertisements/     # Реклама
│   ├── (superadmin)/            # Суперадминка
│   │   ├── dashboard/          # Статистика платформы
│   │   ├── companies/           # Управление бизнесами
│   │   ├── users/               # Управление пользователями
│   │   ├── advertisements/     # Управление рекламой
│   │   ├── categories/          # Управление категориями
│   │   ├── reviews/             # Модерация отзывов
│   │   ├── modules/             # Управление модулями
│   │   └── settings/            # Настройки платформы
│   └── api/                     # API routes (Next.js)
│
├── components/                   # React компоненты
│   ├── auth/                    # Компоненты авторизации
│   ├── marketplace/             # Компоненты маркетплейса
│   ├── layouts/                 # Layout компоненты
│   ├── ui/                      # UI компоненты (переиспользуемые)
│   ├── shared/                  # Общие компоненты
│   ├── template/                # Компоненты шаблона
│   └── cookies/                 # Cookie consent
│
├── lib/api/                     # API функции (TypeScript)
│   ├── marketplace.ts          # API для маркетплейса
│   ├── auth.ts                 # API для авторизации
│   ├── business.ts             # API для бизнеса
│   ├── client.ts               # API для клиента
│   └── admin.ts                # API для админа
│
├── services/                    # Сервисы (JavaScript)
│   ├── AuthService.js          # Сервис авторизации
│   ├── LaravelApiService.js    # Базовый сервис для Laravel API
│   ├── BookingService.js       # Сервис бронирований
│   └── location/              # Сервисы локации
│
├── hooks/api/                   # React Query хуки
│   ├── useAuth.ts              # Хуки авторизации
│   ├── useMarketplace.ts       # Хуки маркетплейса
│   ├── useBusinessReports.ts   # Хуки отчетов бизнеса
│   └── useClient.ts            # Хуки клиента
│
├── store/                       # Zustand stores
│   ├── authStore.js            # Store авторизации
│   ├── userStore.js            # Store пользователя
│   └── businessStore.js        # Store бизнеса
│
├── types/                       # TypeScript типы
│   └── marketplace.ts           # Типы для маркетплейса
│
├── constants/                   # Константы
│   ├── roles.constant.js       # Роли пользователей
│   ├── route.constant.js      # Маршруты
│   └── us-locations.constant.js # Локации США
│
├── configs/                     # Конфигурации
│   ├── routes.config/          # Конфигурация маршрутов
│   ├── navigation.config/       # Конфигурация навигации
│   └── app.config.js           # Конфигурация приложения
│
└── utils/                       # Утилиты
    ├── auth/                    # Утилиты авторизации
    └── classNames.js            # Утилита для классов
```

### Backend структура (`backend/`)

```
backend/
├── app/
│   ├── Http/Controllers/       # Контроллеры
│   │   ├── Auth/               # Авторизация
│   │   ├── Client/             # API для клиентов
│   │   ├── Business/           # API для бизнеса
│   │   ├── Admin/              # API для суперадмина
│   │   ├── Public/             # Публичные контроллеры
│   │   ├── MarketplaceController.php
│   │   ├── BookingController.php
│   │   └── LocationController.php
│   ├── Http/Middleware/         # Middleware
│   │   ├── JwtAuthenticate.php # JWT аутентификация
│   │   ├── RoleMiddleware.php  # Проверка ролей
│   │   └── TenantMiddleware.php # Multi-tenant изоляция
│   ├── Models/                  # Eloquent модели
│   │   ├── User.php
│   │   ├── Company.php
│   │   ├── Booking.php
│   │   ├── Advertisement.php
│   │   ├── Review.php
│   │   └── ...
│   └── Services/                # Сервисы
│       └── BookingService.php
│
├── database/migrations/        # Миграции БД
│   ├── create_users_table.php
│   ├── create_companies_table.php
│   ├── create_bookings_table.php
│   ├── create_advertisements_table.php
│   └── ...
│
└── routes/
    └── api.php                  # API роуты
```

### Mobile структура (`mobile/src/`)

```
mobile/src/
├── api/                         # API функции
│   ├── config.ts               # Конфигурация API
│   ├── marketplace.ts           # API маркетплейса
│   ├── auth.ts                 # API авторизации
│   └── bookings.ts             # API бронирований
│
├── screens/                     # Экраны приложения
│   ├── ServicesHomeScreen.tsx
│   ├── ServiceDetailsScreen.tsx
│   ├── BookingScreen.tsx
│   └── ...
│
├── components/                  # Компоненты
│   ├── ServiceCard.tsx
│   ├── RatingBadge.tsx
│   └── ...
│
├── contexts/                     # Context API
│   ├── AuthContext.tsx
│   └── LocationContext.tsx
│
└── types/                       # TypeScript типы
    └── marketplace.ts
```

---

## Структура маршрутов и доступ

### 1. Публичная часть `/(public)`

**Доступ:** Все пользователи (без авторизации)

#### Страницы:
- `/landing` - Главная страница (адаптирована под marketplace)
- `/services` - Каталог услуг с фильтрами (категория, штат, город, цена, рейтинг, теги)
- `/marketplace/[slug]` - Профиль услуги/бизнеса
- `/auth/*` - Авторизация:
  - `/auth/sign-in` - Вход
  - `/auth/sign-up` - Регистрация
  - `/auth/forgot-password` - Восстановление пароля
  - `/auth/reset-password` - Сброс пароля
- `/booking` - Публичное бронирование
- `/orders` - Публичные заказы
- `/profile` - Публичный профиль
- `/review` - Публичные отзывы
- `/cookies` - Политика cookies
- `/privacy` - Политика конфиденциальности
- `/terms` - Условия использования

#### Layout:
- `PublicLayout` - Общий layout с навбаром и футером

**Статус:** ✅ Полностью реализовано

---

### 2. Личный кабинет клиента `/(client)`

**Доступ:** Авторизованные пользователи с ролью `CLIENT`

#### Страницы:
- `/client/profile` - Профиль клиента:
  - Личные данные
  - Предпочтения
  - Настройки уведомлений
  - Изменение пароля
- `/client/orders` - История заказов и бронирований:
  - Список всех заказов
  - Детали заказа
  - Статусы заказов
- `/client/booking` - Активные и будущие бронирования:
  - Список бронирований
  - Отмена бронирования
  - История бронирований

#### Layout:
- Использует `PostLoginLayout` (общий layout для авторизованных пользователей)

**Статус:** ✅ Реализовано с интеграцией API

---

### 3. Админка бизнеса `/(business)`

**Доступ:** Авторизованные пользователи с ролью `BUSINESS_OWNER`

**Назначение:** Управление **своим** бизнесом (multi-tenant архитектура - каждый владелец видит только свой бизнес)

#### Страницы:

##### `/business/dashboard`
- Статистика и метрики бизнеса:
  - Общее количество бронирований
  - Общая выручка
  - Активные клиенты
  - Средний рейтинг
- Последние бронирования
- Графики доходов
- Быстрые действия

##### `/business/schedule`
- Управление расписанием:
  - Календарь слотов
  - Создание/редактирование/удаление слотов
  - Настройка доступности
  - Управление перерывами и выходными
- Настройки расписания:
  - Рабочие дни
  - Время работы
  - Длительность слотов
  - Шаг времени

##### `/business/clients`
- CRM для управления клиентами:
  - Список всех клиентов бизнеса
  - Детальная информация о клиенте
  - История взаимодействий
  - Контактная информация
  - История заказов каждого клиента
  - Добавление заметок о клиенте
  - Статусы клиентов

##### `/business/settings`
- **Профиль бизнеса:** название, описание, категория, адрес, контакты, логотип
- **Услуги и цены:** 
  - CRUD для услуг
  - Управление категориями
  - Управление ценами
  - Дополнительные услуги
- **Команда:** 
  - Управление мастерами/сотрудниками
  - Добавление/редактирование/удаление членов команды
- **Портфолио:** 
  - Загрузка и управление работами
  - Галерея портфолио
- **Расписание:** 
  - Настройки рабочего времени
  - Настройки слотов
- **Уведомления:** 
  - Настройки email/SMS уведомлений
- **Платежи:** 
  - Подключение Stripe (заглушка)
- **Маркетплейс:** 
  - Настройки видимости на marketplace
  - Управление рекламой (объявлениями)
  - Создание и редактирование объявлений

##### `/business/reviews`
- Просмотр отзывов о бизнесе
- Ответы на отзывы
- Модерация отзывов

##### `/business/advertisements`
- Управление рекламой бизнеса
- Покупка рекламы
- Просмотр статистики рекламы

##### `/business/schedule/reports`
- Отчеты по бронированиям
- Отчеты по клиентам
- Отчеты по выручке
- Отчеты по специалистам
- Экспорт отчетов

#### Layout:
- Использует `PostLoginLayout` с сайдбаром для навигации по разделам бизнеса

**Статус:** ✅ Полностью реализовано с интеграцией API

---

### 4. Суперадминка `/(superadmin)`

**Доступ:** Авторизованные пользователи с ролью `SUPERADMIN`

**Назначение:** Управление **всей платформой** (все бизнесы, все пользователи, реклама, настройки системы)

#### Страницы:

##### `/superadmin/dashboard`
- Общая статистика платформы:
  - Количество активных бизнесов
  - Количество пользователей
  - Общая выручка
  - Графики активности
- Последняя активность
- Быстрые действия

##### `/superadmin/companies`
- Управление всеми бизнесами-тенантами:
  - Список всех бизнесов
  - CRUD операции (создание, редактирование, удаление)
  - Модерация новых бизнесов (одобрить/отклонить)
  - Управление статусами (активен, заблокирован, на модерации)
  - Просмотр статистики каждого бизнеса
  - Управление подписками/тарифами
  - Просмотр команды и услуг бизнеса

##### `/superadmin/users`
- Управление всеми пользователями платформы:
  - Список всех пользователей
  - Фильтры по ролям
  - Список клиентов
  - Список владельцев бизнесов
  - Управление ролями и правами доступа
  - Блокировка/разблокировка пользователей
  - Создание пользователей

##### `/superadmin/advertisements`
- Управление рекламой на платформе:
  - Список всех объявлений
  - Спонсированные предложения (featured services)
  - Баннеры и промо-блоки
  - Настройка размещения рекламы
  - Статистика показов и кликов
  - Одобрение/отклонение объявлений
  - Управление приоритетами

##### `/superadmin/categories`
- Управление категориями услуг:
  - Список категорий
  - CRUD операции
  - Управление описаниями

##### `/superadmin/reviews`
- Модерация отзывов:
  - Список всех отзывов
  - Ответы на отзывы
  - Удаление отзывов

##### `/superadmin/modules`
- Управление модулями системы:
  - Включение/выключение функций
  - Настройка доступности модулей для разных типов бизнесов

##### `/superadmin/settings`
- Общие настройки платформы:
  - Общие параметры
  - Загрузка логотипа платформы
  - Настройки логотипа (цвета, кастомизация)
- Интеграции:
  - Stripe
  - Email
  - SMS
- Настройки платежей:
  - Комиссии платформы
  - Настройки оплаты
- Системные параметры

#### Layout:
- Использует `PostLoginLayout` с сайдбаром для навигации по разделам суперадмина

**Статус:** ✅ Полностью реализовано с интеграцией API

---

## Multi-Tenant Архитектура

### Принцип работы:
- Каждый бизнес (company) - это отдельный **тенант**
- Владелец бизнеса видит **только свой бизнес** и его данные
- Суперадмин видит **все бизнесы** и может управлять ими
- Данные изолированы по `company_id` на уровне базы данных
- Middleware `TenantMiddleware` автоматически фильтрует данные по `company_id`

### Роли пользователей:
1. **CLIENT** - Клиент платформы (может бронировать услуги)
2. **BUSINESS_OWNER** - Владелец бизнеса (управляет своим бизнесом)
3. **SUPERADMIN** - Администратор платформы (управляет всем)

### Изоляция данных:
- Все запросы бизнеса автоматически фильтруются по `company_id`
- Суперадмин имеет доступ ко всем данным
- Middleware `tenant` применяется ко всем бизнес-роутам

---

## Backend API (Laravel)

### Структура API

#### Публичные роуты (без авторизации):
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токена
- `GET /api/auth/google/redirect` - Google OAuth редирект
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/marketplace/services` - Список услуг
- `GET /api/marketplace/categories` - Список категорий
- `GET /api/marketplace/states` - Список штатов
- `GET /api/marketplace/services/{slug}` - Услуга по slug
- `GET /api/marketplace/services/{slug}/profile` - Профиль услуги
- `GET /api/marketplace/company/{slug}` - Профиль компании
- `GET /api/advertisements/featured` - Рекомендуемые услуги
- `POST /api/advertisements/{id}/click` - Отслеживание кликов
- `GET /api/locations/states` - Штаты
- `GET /api/locations/cities` - Города
- `GET /api/locations/search` - Поиск локаций
- `POST /api/bookings` - Создание бронирования
- `GET /api/bookings/available-slots` - Доступные слоты
- `POST /api/bookings/check-availability` - Проверка доступности
- `GET /api/public/reviews/token/{token}` - Отзыв по токену
- `POST /api/public/reviews/token/{token}` - Создание отзыва по токену

#### Защищенные роуты (требуют JWT токен):

##### Авторизация:
- `GET /api/auth/me` - Информация о текущем пользователе
- `POST /api/auth/logout` - Выход

##### Клиент (`role:CLIENT`):
- `GET /api/client/profile` - Профиль клиента
- `PUT /api/client/profile` - Обновление профиля
- `POST /api/client/profile/avatar` - Загрузка аватара
- `POST /api/client/profile/change-password` - Изменение пароля
- `GET /api/client/orders` - История заказов
- `GET /api/client/bookings` - Бронирования
- `POST /api/client/bookings/{id}/cancel` - Отмена бронирования
- `GET /api/client/reviews` - Отзывы клиента
- `GET /api/client/reviews/pending` - Ожидающие отзывы
- `POST /api/client/reviews` - Создание отзыва
- `GET /api/client/favorites/services` - Избранные услуги
- `GET /api/client/favorites/businesses` - Избранные бизнесы
- `GET /api/client/favorites/advertisements` - Избранные объявления
- `POST /api/client/favorites/{type}/{id}` - Добавить в избранное
- `DELETE /api/client/favorites/{type}/{id}` - Удалить из избранного
- `GET /api/client/notifications` - Уведомления
- `POST /api/client/notifications/{id}/read` - Отметить как прочитанное
- `GET /api/client/notifications/settings` - Настройки уведомлений
- `PUT /api/client/notifications/settings` - Обновление настроек

##### Бизнес (`role:BUSINESS_OWNER,SUPERADMIN` + `tenant`):
- `GET /api/business/dashboard/stats` - Статистика бизнеса
- `GET /api/business/dashboard/recent-bookings` - Последние бронирования
- `GET /api/business/dashboard/chart` - Графики
- `GET /api/business/schedule/slots` - Слоты расписания
- `POST /api/business/schedule/slots` - Создание слота
- `PUT /api/business/schedule/slots/{id}` - Обновление слота
- `DELETE /api/business/schedule/slots/{id}` - Удаление слота
- `GET /api/business/reports/*` - Отчеты
- `GET /api/business/clients` - Список клиентов
- `POST /api/business/clients` - Создание клиента
- `GET /api/business/clients/{id}` - Детали клиента
- `PUT /api/business/clients/{id}` - Обновление клиента
- `PUT /api/business/clients/{id}/status` - Обновление статуса
- `POST /api/business/clients/{id}/notes` - Добавление заметки
- `GET /api/business/bookings` - Бронирования бизнеса
- `GET /api/business/bookings/{id}` - Детали бронирования
- `POST /api/business/bookings` - Создание бронирования
- `PUT /api/business/bookings/{id}` - Обновление бронирования
- `DELETE /api/business/bookings/{id}` - Удаление бронирования
- `GET /api/business/reviews` - Отзывы бизнеса
- `PUT /api/business/reviews/{id}/response` - Ответ на отзыв
- `GET /api/business/settings/profile` - Профиль бизнеса
- `PUT /api/business/settings/profile` - Обновление профиля
- `GET /api/business/settings/services` - Услуги бизнеса
- `POST /api/business/settings/services` - Создание услуги
- `PUT /api/business/settings/services/{id}` - Обновление услуги
- `DELETE /api/business/settings/services/{id}` - Удаление услуги
- `GET /api/business/settings/additional-services` - Дополнительные услуги
- `POST /api/business/settings/additional-services` - Создание дополнительной услуги
- `PUT /api/business/settings/additional-services/{id}` - Обновление
- `DELETE /api/business/settings/additional-services/{id}` - Удаление
- `GET /api/business/settings/schedule` - Настройки расписания
- `PUT /api/business/settings/schedule` - Обновление настроек
- `GET /api/business/settings/team` - Команда
- `POST /api/business/settings/team` - Создание члена команды
- `PUT /api/business/settings/team/{id}` - Обновление
- `DELETE /api/business/settings/team/{id}` - Удаление
- `GET /api/business/settings/portfolio` - Портфолио
- `POST /api/business/settings/portfolio` - Создание элемента
- `DELETE /api/business/settings/portfolio/{id}` - Удаление
- `GET /api/business/settings/advertisements` - Объявления бизнеса
- `GET /api/business/settings/advertisements/{id}` - Детали объявления
- `POST /api/business/settings/advertisements` - Создание объявления
- `POST /api/business/settings/advertisements/upload-image` - Загрузка изображения
- `PUT /api/business/settings/advertisements/{id}` - Обновление
- `DELETE /api/business/settings/advertisements/{id}` - Удаление
- `POST /api/business/onboarding/complete` - Завершение онбординга

##### Суперадмин (`role:SUPERADMIN`):
- `GET /api/admin/dashboard/stats` - Статистика платформы
- `GET /api/admin/dashboard/chart` - Графики
- `GET /api/admin/dashboard/recent-activity` - Последняя активность
- `GET /api/admin/companies` - Список компаний
- `POST /api/admin/companies` - Создание компании
- `GET /api/admin/companies/{id}` - Детали компании
- `GET /api/admin/companies/{id}/stats` - Статистика компании
- `GET /api/admin/companies/{id}/chart` - Графики компании
- `GET /api/admin/companies/{id}/team` - Команда компании
- `GET /api/admin/companies/{id}/services` - Услуги компании
- `PUT /api/admin/companies/{id}` - Обновление компании
- `DELETE /api/admin/companies/{id}` - Удаление компании
- `POST /api/admin/companies/{id}/approve` - Одобрение компании
- `POST /api/admin/companies/{id}/reject` - Отклонение компании
- `POST /api/admin/companies/{id}/block` - Блокировка компании
- `GET /api/admin/users` - Список пользователей
- `POST /api/admin/users` - Создание пользователя
- `PUT /api/admin/users/{id}` - Обновление пользователя
- `DELETE /api/admin/users/{id}` - Удаление пользователя
- `POST /api/admin/users/{id}/block` - Блокировка пользователя
- `POST /api/admin/users/{id}/unblock` - Разблокировка пользователя
- `GET /api/admin/advertisements` - Список объявлений
- `POST /api/admin/advertisements` - Создание объявления
- `POST /api/admin/advertisements/upload-image` - Загрузка изображения
- `GET /api/admin/advertisements/{id}` - Детали объявления
- `PUT /api/admin/advertisements/{id}` - Обновление
- `POST /api/admin/advertisements/{id}/approve` - Одобрение
- `POST /api/admin/advertisements/{id}/reject` - Отклонение
- `GET /api/admin/categories` - Список категорий
- `POST /api/admin/categories` - Создание категории
- `GET /api/admin/categories/{id}` - Детали категории
- `PUT /api/admin/categories/{id}` - Обновление
- `DELETE /api/admin/categories/{id}` - Удаление
- `GET /api/admin/reviews` - Список отзывов
- `PUT /api/admin/reviews/{id}/response` - Ответ на отзыв
- `DELETE /api/admin/reviews/{id}` - Удаление отзыва
- `GET /api/admin/settings/general` - Общие настройки
- `PUT /api/admin/settings/general` - Обновление настроек
- `POST /api/admin/settings/logo` - Загрузка логотипа
- `DELETE /api/admin/settings/logo` - Удаление логотипа
- `GET /api/admin/additional-services` - Дополнительные услуги
- `POST /api/admin/additional-services` - Создание
- `GET /api/admin/additional-services/all` - Все дополнительные услуги
- `GET /api/admin/additional-services/{id}` - Детали
- `PUT /api/admin/additional-services/{id}` - Обновление
- `DELETE /api/admin/additional-services/{id}` - Удаление

### Модули Backend:
- **Users & Auth** - Управление пользователями и авторизация (JWT)
- **Companies** - Управление бизнесами (multi-tenant)
- **Bookings** - Бронирования
- **Payments** - Платежи (Stripe - заглушка)
- **Services & Pricing** - Услуги и цены
- **Additional Services** - Дополнительные услуги
- **Notifications** - Уведомления (Email + SMS)
- **Marketplace Listing** - Объявления на маркетплейсе
- **Reviews & Ratings** - Отзывы и рейтинги
- **Advertisements** - Реклама (для суперадмина и бизнеса)
- **Locations** - Локации (штаты, города)
- **Reports** - Отчеты для бизнеса

---

## State Management

### Zustand Stores

#### `authStore` (`src/store/authStore.js`)
- Управляет авторизацией
- Хранит токены и базовую информацию о пользователе
- Автоматически сохраняется в localStorage
- Методы:
  - `setAuth(tokens, user)` - Установка авторизации
  - `setTokens(tokens)` - Обновление токенов
  - `logout()` - Выход
  - `checkAuth()` - Проверка авторизации

#### `userStore` (`src/store/userStore.js`)
- Хранит полную информацию о пользователе
- Профиль, настройки, предпочтения

#### `businessStore` (`src/store/businessStore.js`)
- Хранит информацию о текущем бизнесе
- Используется для multi-tenant

### React Query
- Используется для всех API запросов
- Кэширование данных
- Автоматическое обновление
- Обработка состояний загрузки и ошибок

---

## Авторизация и безопасность

### JWT Authentication
- **Access Token**: Хранится в localStorage, срок действия 15 минут
- **Refresh Token**: Хранится в httpOnly cookie, срок действия 7 дней
- **Middleware**: `JwtAuthenticate` проверяет токен на каждом запросе
- **Refresh**: Автоматическое обновление токена при истечении

### Защита маршрутов
- **Frontend**: Компонент `ProtectedRoute` проверяет авторизацию и роль
- **Backend**: Middleware `role:ROLE_NAME` проверяет роль пользователя
- **Multi-tenant**: Middleware `tenant` изолирует данные по `company_id`

### Google OAuth
- Интеграция с Google для входа через OAuth
- Использует Laravel Socialite

---

## Работа с API

### Frontend API
- **API URL**: Определяется через `getLaravelApiUrl()` в `src/lib/api/marketplace.ts`
- **Переменная окружения**: `NEXT_PUBLIC_LARAVEL_API_URL`
- **Автоматическая адаптация**: Если фронтенд открыт по IP, использует тот же IP для API
- **Обработка ошибок**: Всегда использует try-catch, возвращает пустые данные при ошибках
- **Fallback**: При сетевых ошибках использует mock данные

### Backend API
- **JWT авторизация**: Access token 15 минут, Refresh token 7 дней
- **Middleware**: `auth:api` для защищенных роутов
- **CORS**: Настроен для `http://localhost:3003` и других доменов
- **Валидация**: Laravel валидация для всех входных данных

---

## Мобильное приложение

### Структура
- **Framework**: React Native 0.81.5 + Expo ~54.0.25
- **Navigation**: React Navigation
- **State Management**: Context API (AuthContext, LocationContext)
- **Styling**: StyleSheet (без Tailwind/NativeWind)
- **API**: Использует те же API endpoints, что и веб-версия

### Экраны
- `ServicesHomeScreen` - Главный экран с каталогом услуг
- `ServiceDetailsScreen` - Детали услуги
- `BookingScreen` - Бронирование
- `BookingsListScreen` - Список бронирований
- `FavoritesScreen` - Избранное
- `ProfileScreen` - Профиль
- `LoginScreen` - Вход
- `RegisterScreen` - Регистрация

### Принцип соответствия веб-версии
- Визуальное соответствие: цвета, отступы, размеры
- Функциональное соответствие: та же логика работы
- API соответствие: те же endpoints
- Типы данных: те же TypeScript типы

---

## Текущий статус реализации

### ✅ Полностью готово:

#### Frontend:
- Публичная часть (landing, services, marketplace profile)
- Личный кабинет клиента (profile, orders, booking)
- Админка бизнеса (dashboard, schedule, clients, settings, reviews, advertisements)
- Суперадминка (dashboard, companies, users, advertisements, categories, reviews, modules, settings)
- API слой с интеграцией Laravel API
- TypeScript интерфейсы
- React Query интеграция
- JWT авторизация
- Multi-tenant изоляция на фронтенде
- Защита маршрутов через ProtectedRoute
- Cookie consent
- Интернационализация (next-intl)

#### Backend:
- Полная структура API
- JWT авторизация
- Multi-tenant middleware
- Все CRUD операции для бизнеса
- Все CRUD операции для суперадмина
- Система бронирований
- Система отзывов
- Система рекламы
- Система локаций
- Система отчетов
- Google OAuth

#### Mobile:
- Базовая структура
- API интеграция
- Основные экраны
- Авторизация

### ⚠️ Частично готово:
- Платежи (Stripe) - заглушка
- Email/SMS уведомления - базовая структура
- Мобильное приложение - требует доработки UI

### ❌ Не готово:
- Полная интеграция Stripe
- Email/SMS уведомления (отправка)
- Push-уведомления для мобильного приложения
- Расширенная аналитика
- Экспорт данных в различных форматах

---

## Важные замечания

1. Проект использует **Next.js 15** с App Router
2. React версия **19.0.0** - используйте совместимые библиотеки
3. Backend на **Laravel 10** с PHP 8.1+
4. Используется **JWT авторизация** - токены в localStorage и httpOnly cookies
5. **Multi-tenant** архитектура требует изоляции данных по `company_id`
6. Всегда проверяйте совместимость пакетов с React 19
7. API функции используют TypeScript для типизации
8. Всегда обрабатывайте ошибки API с fallback на пустые данные
9. Используйте React Query для всех API запросов
10. Следуйте принципу простоты - избегайте излишней абстракции

---

## Документация- **Архитектура**: `ARCHITECTURE.md` (этот файл)
- **Установка**: `INSTALL.md`
- **Интеграция**: `INTEGRATION_GUIDE.md`
- **Авторизация**: `AUTH_SETUP.md`
- **Backend**: `backend/README.md`
- **Безопасность**: `SECURITY.md`
- **Бронирования**: `BOOKINGS_MODULE.md`
