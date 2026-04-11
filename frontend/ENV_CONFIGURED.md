# ✅ .env.local настроен!

## Добавленные переменные

```env
NEXT_PUBLIC_LARAVEL_API_URL=http://localhost:8000/api
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

## 📋 Текущая конфигурация

- **Backend API URL**: `http://localhost:8000/api`
- **Mock Auth**: Отключен (используется реальный backend)

## ⚠️ Важно

**Frontend нужно перезапустить** для применения изменений в `.env.local`!

### Как перезапустить:

1. Остановите текущий процесс frontend (Ctrl+C в терминале)
2. Запустите заново:
   ```bash
   npm run dev
   ```

Или если frontend запущен в фоне, перезапустите его.

## ✅ После перезапуска

Frontend будет использовать реальный Laravel backend вместо mock данных.

## 🔐 Тестовые учетные данные

- **Клиент**: `client@ecme.com` / `demo12345`
- **Бизнес**: `business@ecme.com` / `demo12345`
- **Суперадмин**: `admin@ecme.com` / `demo12345`

