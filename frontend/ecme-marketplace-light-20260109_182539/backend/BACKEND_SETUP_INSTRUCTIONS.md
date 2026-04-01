# Инструкции по настройке Backend API

## Предварительные требования

1. **PHP >= 8.1**
2. **Composer**
3. **MySQL >= 8.0** или **PostgreSQL >= 13**
4. **Node.js и NPM** (для фронтенда)

## Установка

### 1. Установите зависимости Composer

```bash
cd backend
composer install
```

### 2. Настройте окружение

```bash
cp .env.example .env
php artisan key:generate
```

### 3. Настройте базу данных в `.env`

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ecme_marketplace
DB_USERNAME=root
DB_PASSWORD=your_password
```

### 4. Настройте JWT

```bash
php artisan jwt:secret
```

Это создаст `JWT_SECRET` в вашем `.env` файле.

### 5. Настройте CORS

Убедитесь, что в `.env` указан правильный URL фронтенда:

```env
FRONTEND_URL=http://localhost:3003
```

### 6. Запустите миграции

```bash
php artisan migrate
```

### 7. (Опционально) Заполните базу тестовыми данными

```bash
php artisan db:seed
```

### 8. Запустите сервер разработки

```bash
php artisan serve
```

API будет доступен по адресу: `http://localhost:8000`

## Настройка Laravel

### Регистрация Middleware

В `bootstrap/app.php` (Laravel 11) или `app/Http/Kernel.php` (Laravel 10):

```php
// Для Laravel 10
protected $routeMiddleware = [
    // ...
    'role' => \App\Http\Middleware\RoleMiddleware::class,
    'tenant' => \App\Http\Middleware\TenantMiddleware::class,
];
```

### Настройка JWT Guard

В `config/auth.php`:

```php
'guards' => [
    // ...
    'api' => [
        'driver' => 'jwt',
        'provider' => 'users',
    ],
],
```

## Тестирование API

### Регистрация пользователя

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "CLIENT",
    "first_name": "Иван",
    "last_name": "Иванов",
    "phone": "+79991234567"
  }'
```

### Вход

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "password": "password123"
  }'
```

### Получение профиля (требует токен)

```bash
curl -X GET http://localhost:8000/api/client/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Структура ответов API

Все ответы API следуют единому формату:

### Успешный ответ

```json
{
  "success": true,
  "data": {
    // данные
  }
}
```

### Ошибка

```json
{
  "success": false,
  "message": "Описание ошибки",
  "errors": {
    // детали ошибок валидации
  }
}
```

## Следующие шаги

1. Завершите создание всех контроллеров
2. Создайте seeders для тестовых данных
3. Настройте интеграцию с фронтендом
4. Протестируйте все endpoints

