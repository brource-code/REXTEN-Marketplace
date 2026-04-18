# 🚀 Серверы запущены!

## ✅ Статус

### Backend (Laravel)
- **URL**: http://localhost:8000
- **API**: http://localhost:8000/api
- **Статус**: ✅ Запущен

### Frontend (Next.js)
- **URL**: http://localhost:3003
- **Статус**: ✅ Запущен

## 🔗 Быстрые ссылки

### Frontend
- Главная: http://localhost:3003
- Сервисы: http://localhost:3003/services
- Вход: http://localhost:3003/sign-in
- Бизнес вход: http://localhost:3003/business/sign-in
- Профиль: http://localhost:3003/profile

### Backend API
- API Root: http://localhost:8000/api
- Health Check: http://localhost:8000/up

## 🔐 Тестовые учетные данные

### Клиент
- Email: `client@ecme.com`
- Пароль: `demo12345`

### Владелец бизнеса
- Email: `business@ecme.com`
- Пароль: `demo12345`

### Суперадмин
- Email: `admin@ecme.com`
- Пароль: `demo12345`

## 📝 Проверка работы

### Проверить Backend
```bash
curl http://localhost:8000
```

### Проверить API
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client@ecme.com","password":"demo12345"}'
```

### Проверить Frontend
Откройте в браузере: http://localhost:3003

## ⚠️ Важно

Убедитесь, что в `.env.local` настроено:
```env
NEXT_PUBLIC_LARAVEL_API_URL=http://localhost:8000/api
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

Если переменные не установлены, фронтенд будет использовать mock данные.

## 🛑 Остановка серверов

Для остановки серверов используйте `Ctrl+C` в терминалах, где они запущены.

