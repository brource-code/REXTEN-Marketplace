# Тестовые учетные данные

## Пользователи

### Суперадмин
- **Email**: `admin@ecme.com`
- **Пароль**: `demo12345`
- **Роль**: SUPERADMIN

### Владелец бизнеса
- **Email**: `business@ecme.com`
- **Пароль**: `demo12345`
- **Роль**: BUSINESS_OWNER

### Клиенты
1. **Email**: `client@ecme.com`
   - **Пароль**: `demo12345`
   - **Имя**: Иван Иванов
   - **Телефон**: +7 (999) 111-11-11

2. **Email**: `client2@ecme.com`
   - **Пароль**: `demo12345`
   - **Имя**: Мария Петрова
   - **Телефон**: +7 (999) 222-22-22

3. **Email**: `client3@ecme.com`
   - **Пароль**: `demo12345`
   - **Имя**: Алексей Сидоров
   - **Телефон**: +7 (999) 333-33-33

## Компании

### Glow Lab Studio
- **Slug**: `glow-lab`
- **Категория**: Салон красоты
- **Адрес**: г. Москва, ул. Тверская, д. 10
- **Услуги**: Стрижка и укладка, Окрашивание волос, Маникюр премиум

### Urban Barber Club
- **Slug**: `urban-barber`
- **Категория**: Барбершоп
- **Адрес**: г. Москва, ул. Арбат, д. 25
- **Услуги**: Классическая стрижка, Стрижка + Борода

## Тестирование API

### 1. Вход клиента
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@ecme.com",
    "password": "demo12345"
  }'
```

### 2. Получение профиля (требует токен)
```bash
curl -X GET http://localhost:8000/api/client/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Вход владельца бизнеса
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "business@ecme.com",
    "password": "demo12345"
  }'
```

### 4. Статистика бизнеса (требует токен)
```bash
curl -X GET http://localhost:8000/api/business/dashboard/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Вход суперадмина
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ecme.com",
    "password": "demo12345"
  }'
```

