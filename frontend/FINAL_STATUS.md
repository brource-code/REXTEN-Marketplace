# ✅ Статус настройки локального окружения

## 🎉 Что работает

1. ✅ **Nginx** - запущен и работает на порту 8443 (HTTPS)
2. ✅ **Laravel Backend** - работает на `http://127.0.0.1:8000`
3. ✅ **Next.js Frontend** - работает на `http://127.0.0.1:3003`
4. ✅ **Конфигурации** - все файлы обновлены

## ⚠️ Что нужно сделать вручную (требует пароль)

### 1. Добавить домен в /etc/hosts

```bash
echo "127.0.0.1 rexten.local" | sudo tee -a /etc/hosts
```

**Почему нужно:** Без этого домен `rexten.local` не будет разрешаться.

### 2. Установить CA сертификат (если не установлен)

```bash
mkcert -install
```

**Почему нужно:** Для доверия к самоподписанному SSL сертификату.

## 🌐 Доступ к приложению

### После добавления в /etc/hosts:

**https://rexten.local:8443**

### Без добавления в /etc/hosts (прямой доступ):

- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:8000/api

## 📋 Текущие настройки

### Порт Nginx
- Изменен с 443 на **8443** (не требует root прав)

### API URL логика
- Для `rexten.local` → `/api` (относительный путь)
- Для IP адресов → `http://IP:8000/api`
- Для localhost → `http://localhost:8000/api`

### Переменные окружения
- **Frontend**: `NEXT_PUBLIC_LARAVEL_API_URL=/api`
- **Backend**: `APP_URL=https://rexten.local`, `FRONTEND_URL=https://rexten.local`

## 🚀 Запуск серверов

Используйте скрипт:
```bash
./START_SERVERS.sh
```

Или вручную:
```bash
# Backend
cd backend && php artisan serve --host=127.0.0.1 --port=8000

# Frontend (в другом терминале)
npm run dev
```

## 🔍 Проверка работы

```bash
# Backend
curl http://127.0.0.1:8000/api/marketplace/services

# Frontend
curl http://127.0.0.1:3003

# Nginx (после добавления в /etc/hosts)
curl -k https://rexten.local:8443
```

## 📝 Логи

- **Backend**: `tail -f /tmp/laravel-server.log`
- **Frontend**: `tail -f /tmp/nextjs-server.log`
- **Nginx**: `tail -f /opt/homebrew/var/log/nginx/error.log`

## 🎯 Следующие шаги

1. Добавьте `rexten.local` в `/etc/hosts` (требует sudo)
2. Установите CA сертификат: `mkcert -install`
3. Откройте `https://rexten.local:8443` в браузере
4. Проверьте работу API запросов через DevTools

## ⚙️ Альтернатива: использовать порт 443

Если хотите использовать стандартный порт 443 (без `:8443` в URL):

1. Запустите nginx с sudo:
   ```bash
   sudo nginx
   ```

2. Или измените конфиг обратно на порт 443 и запустите:
   ```bash
   sudo nginx -s reload
   ```

Но для разработки порт 8443 работает отлично и не требует root прав.
