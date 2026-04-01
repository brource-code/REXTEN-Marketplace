# Инструкция по настройке локального окружения DEV как PROD

## ✅ Что уже сделано

1. ✅ Установлены nginx, mkcert, nss
2. ✅ Созданы SSL сертификаты в `~/certs/`
3. ✅ Создан nginx конфиг `/opt/homebrew/etc/nginx/servers/rexten-dev.conf`
4. ✅ Обновлена функция `getLaravelApiUrl()` в 6 файлах
5. ✅ Обновлен `next.config.mjs` (allowedDevOrigins)
6. ✅ Обновлен `backend/config/cors.php`
7. ✅ Обновлены `.env.local` и `backend/.env`
8. ✅ Обновлен `package.json` (память 6144MB, host 127.0.0.1)

## 🔧 Что нужно сделать вручную

### 1. Добавить домен в /etc/hosts

```bash
sudo nano /etc/hosts
```

Добавьте строку:
```
127.0.0.1 rexten.local
```

Или одной командой:
```bash
echo "127.0.0.1 rexten.local" | sudo tee -a /etc/hosts
```

### 2. Установить CA сертификат (если не установлен)

```bash
mkcert -install
```

Это нужно сделать один раз. Если уже делали - пропустите.

### 3. Запустить nginx

```bash
brew services start nginx
# или
nginx
```

Проверить статус:
```bash
brew services list | grep nginx
```

### 4. Проверить конфигурацию nginx

```bash
nginx -t
```

Если всё ОК, перезагрузить:
```bash
nginx -s reload
```

## 🚀 Запуск серверов

### Backend (Laravel)
```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

### Frontend (Next.js)
```bash
npm run dev
```

## 🌐 Доступ к приложению

После запуска всех серверов откройте в браузере:

**https://rexten.local:8443**

⚠️ **Важно**: 
- Используйте `https://`, не `http://`
- Порт **8443** (не 443, чтобы не требовать root прав)

## 🔍 Проверка работы

1. Откройте DevTools → Network
2. Проверьте, что запросы идут через nginx:
   - `/_rsc=...` запросы
   - `/_next/webpack-hmr` для HMR
   - `/api/...` для Laravel API

## 📝 Что изменилось

### API URL логика
- Для `rexten.local` → `/api` (относительный путь через nginx)
- Для IP адресов (192.168.x.x) → `http://IP:8000/api`
- Для localhost → `http://localhost:8000/api`

### Переменные окружения
- **Frontend** (`.env.local`): `NEXT_PUBLIC_LARAVEL_API_URL=/api`
- **Backend** (`backend/.env`): 
  - `APP_URL=https://rexten.local`
  - `FRONTEND_URL=https://rexten.local`

### Nginx конфигурация
- Проксирует `/api/` → Laravel (port 8000)
- Проксирует `/_next/` → Next.js (port 3003)
- Проксирует `/` → Next.js (port 3003)
- Поддерживает HMR через WebSocket

## 🐛 Решение проблем

### Nginx не запускается
```bash
# Проверить, не занят ли порт 443
sudo lsof -i :443

# Проверить логи
tail -f /opt/homebrew/var/log/nginx/error.log
```

### Сертификат не доверенный
```bash
# Переустановить CA
mkcert -install

# Пересоздать сертификаты
cd ~/certs
mkcert rexten.local
```

### API запросы не работают
1. Проверьте, что Laravel запущен на порту 8000
2. Проверьте CORS в `backend/config/cors.php`
3. Проверьте логи nginx: `tail -f /opt/homebrew/var/log/nginx/error.log`

### Next.js не отвечает
1. Проверьте, что Next.js запущен на порту 3003
2. Проверьте логи: `npm run dev` в терминале
3. Проверьте, что hostname в `package.json` = `127.0.0.1`

## 📚 Дополнительная информация

- Nginx конфиг: `/opt/homebrew/etc/nginx/servers/rexten-dev.conf`
- SSL сертификаты: `~/certs/rexten.local.pem` и `~/certs/rexten.local-key.pem`
- Логи nginx: `/opt/homebrew/var/log/nginx/`

## ⚠️ Важные замечания

1. **Порт 3003** - оставлен как требовалось
2. **Динамические IP** - поддерживаются 192.168.1.72 и 192.168.1.120
3. **Память Next.js** - уменьшена до 6144MB (было 8192MB)
4. **Host Next.js** - изменен на 127.0.0.1 (было 0.0.0.0) для безопасности

## 🎯 Следующие шаги

Если проблемы с UI повторятся (RSC fetch, partial re-render), см. план изоляции UI от RSC в основном плане реализации.
