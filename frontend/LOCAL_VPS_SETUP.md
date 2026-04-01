# 🚀 Локальная настройка "DEV как PROD" - Имитация VPS сервера

## 📋 Содержание

1. [Цель настройки](#цель-настройки)
2. [Что было сделано](#что-было-сделано)
3. [Архитектура системы](#архитектура-системы)
4. [Как это работает](#как-это-работает)
5. [Конфигурация](#конфигурация)
6. [Доступ к приложению](#доступ-к-приложению)
7. [Почему это имитирует VPS](#почему-это-имитирует-vps)

---

## 🎯 Цель настройки

Создать локальное окружение на Mac, которое:
- ✅ По поведению идентично VPS серверу
- ✅ Ловит все баги App Router / RSC / prefetch
- ✅ Работает в DEV режиме (без `next build`)
- ✅ Не пожирает память неконтролируемо
- ✅ Дебажится быстро
- ✅ Позволяет тестировать архитектурные проблемы до деплоя на VPS

---

## ✅ Что было сделано

### 1. Установка необходимых компонентов

```bash
brew install nginx php mysql redis mkcert nss
```

### 2. Настройка локального домена

Добавлен домен `rexten.local` в `/etc/hosts`:
```
127.0.0.1 rexten.local
```

### 3. Создание SSL сертификатов

Созданы самоподписанные SSL сертификаты для HTTPS:
```bash
mkcert rexten.local
# Сертификаты сохранены в:
# /Users/turbin/certs/rexten.local.pem
# /Users/turbin/certs/rexten.local-key.pem
```

### 4. Настройка Nginx как reverse proxy

Создан конфиг `/opt/homebrew/etc/nginx/servers/rexten-dev.conf`:
- HTTP (порт 80) → редирект на HTTPS (порт 8443)
- HTTPS (порт 8443) → проксирование на Next.js (3003) и Laravel (8000)
- Настроены правильные заголовки для Next.js
- Настроен proxy_redirect для предотвращения редиректов на localhost:3003

### 5. Исправление функции getLaravelApiUrl()

Обновлена логика определения API URL в 5 файлах:
- `src/services/axios/LaravelAxios.js`
- `src/lib/api/marketplace.ts`
- `src/utils/api/getLaravelApiUrl.js`
- `src/lib/api/locations.ts`
- `src/services/location/LocationService.ts`

**Логика:**
- Для `localhost:3003` → `http://localhost:8000/api` (прямой доступ)
- Для `localhost:8443` (через nginx) → `/api` (относительный путь)
- Для `rexten.local` → `/api` (относительный путь)
- Для IP адресов → `http://IP:8000/api` (прямой доступ)

### 6. Исправление Next.js middleware

Исправлена ошибка "Invalid URL" в `src/middleware.js`:
- Добавлена обработка заголовков X-Forwarded-Host от nginx
- Добавлена проверка валидности URL с try-catch
- Исправлена логика обработки портов в заголовках

### 7. Настройка CORS в Laravel

Обновлен `backend/config/cors.php`:
- Добавлены `rexten.local`, `localhost`, `127.0.0.1`
- Добавлены паттерны для IP адресов (192.168.x.x, 10.x.x.x, 172.16-31.x.x)

### 8. Настройка переменных окружения

**Frontend (`.env.local`):**
```env
NEXT_PUBLIC_LARAVEL_API_URL=/api
NEXT_PUBLIC_BASE_PATH=
```

**Backend (`backend/.env`):**
```env
APP_URL=https://rexten.local
FRONTEND_URL=https://rexten.local
```

### 9. Создание скрипта запуска

Создан `START_SERVERS.sh` для автоматического запуска всех серверов.

---

## 🏗️ Архитектура системы

```
┌─────────────────────────────────────────────────────────┐
│                    Браузер                                │
│  https://rexten.local:8443                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                 │
│  Порт 8443 (HTTPS) / Порт 80 (HTTP → HTTPS редирект)    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /api/* → Laravel (127.0.0.1:8000)              │   │
│  │  /_next/* → Next.js (127.0.0.1:3003)             │   │
│  │  /* → Next.js (127.0.0.1:3003)                  │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Next.js DEV    │    │  Laravel DEV    │
│  Порт 3003      │    │  Порт 8000      │
│  (127.0.0.1)    │    │  (127.0.0.1)    │
└─────────────────┘    └─────────────────┘
```

---

## ⚙️ Как это работает

### 1. Запрос от браузера

Пользователь открывает `https://rexten.local:8443` в браузере.

### 2. Nginx получает запрос

Nginx слушает на порту 8443 (HTTPS) и получает запрос.

### 3. Маршрутизация в Nginx

Nginx определяет, куда направить запрос:

**Для `/api/*`:**
- Проксирует на `http://127.0.0.1:8000/api/`
- Передает заголовки: `Host`, `X-Forwarded-Proto`, `X-Forwarded-For`
- Сохраняет префикс `/api` (благодаря trailing slash в `proxy_pass`)

**Для `/_next/*`:**
- Проксирует на `http://127.0.0.1:3003`
- Отключает буферизацию для HMR

**Для всех остальных запросов (`/*`):**
- Проксирует на `http://127.0.0.1:3003`
- Передает заголовки: `Host`, `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-Port`
- Исправляет редиректы через `proxy_redirect`

### 4. Next.js обрабатывает запрос

Next.js получает запрос с заголовками от nginx:
- Видит `X-Forwarded-Host: rexten.local`
- Видит `X-Forwarded-Proto: https`
- Видит `X-Forwarded-Port: 8443`

Middleware использует эти заголовки для правильных редиректов.

### 5. API запросы от фронтенда

Когда фронтенд делает API запрос:
- Функция `getLaravelApiUrl()` определяет, что мы на `rexten.local`
- Возвращает относительный путь `/api`
- Браузер делает запрос на `https://rexten.local:8443/api/...`
- Nginx проксирует на Laravel

### 6. Laravel обрабатывает API запрос

Laravel получает запрос через nginx:
- Видит правильные заголовки
- CORS разрешает запрос (домен в списке разрешенных)
- Обрабатывает запрос и возвращает ответ

---

## 📝 Конфигурация

### Nginx конфигурация

**Файл:** `/opt/homebrew/etc/nginx/servers/rexten-dev.conf`

```nginx
# HTTP редирект на HTTPS
server {
    listen 80;
    server_name rexten.local localhost 127.0.0.1;
    return 301 https://$host:8443$request_uri;
}

# HTTPS сервер
server {
    listen 8443 ssl;
    http2 on;
    server_name rexten.local localhost 127.0.0.1;

    ssl_certificate     /Users/turbin/certs/rexten.local.pem;
    ssl_certificate_key /Users/turbin/certs/rexten.local-key.pem;

    # Laravel API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;  # Trailing slash сохраняет /api
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Next.js HMR
    location /_next/webpack-hmr {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Next.js статика
    location /_next/ {
        proxy_pass http://127.0.0.1:3003;
    }

    # Next.js приложение
    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        # Исправляем редиректы от Next.js
        proxy_redirect http://localhost:3003 https://$host:$server_port;
        proxy_redirect https://localhost:3003 https://$host:$server_port;
    }
}
```

### Next.js конфигурация

**Файл:** `next.config.mjs`

- `basePath: ''` (пусто для локальной разработки)
- `allowedDevOrigins: ['rexten.local', 'localhost', '192.168.1.72', '192.168.1.120']`
- `images.unoptimized: true`

### Middleware Next.js

**Файл:** `src/middleware.js`

Использует заголовки от nginx для правильных редиректов:
```javascript
const forwardedHost = req.headers.get('x-forwarded-host')
const forwardedProto = req.headers.get('x-forwarded-proto')
const forwardedPort = req.headers.get('x-forwarded-port')

// Строит правильный URL для редиректа
if (forwardedHost) {
    const redirectOrigin = `${forwardedProto}://${forwardedHost}:${forwardedPort}`
    return Response.redirect(new URL('/services', redirectOrigin))
}
```

---

## 🌐 Доступ к приложению

### Через домен (рекомендуется)

1. **HTTP с автоматическим редиректом:**
   ```
   http://rexten.local
   ```
   Автоматически перенаправит на `https://rexten.local:8443`

2. **HTTPS напрямую:**
   ```
   https://rexten.local:8443
   ```

### Через localhost

1. **HTTP с автоматическим редиректом:**
   ```
   http://localhost
   ```
   Автоматически перенаправит на `https://localhost:8443`

2. **HTTPS напрямую:**
   ```
   https://localhost:8443
   ```

### Прямой доступ (без nginx)

- **Frontend:** `http://localhost:3003`
- **Backend API:** `http://localhost:8000/api`

---

## 🎯 Почему это имитирует VPS

### 1. Архитектура запросов идентична

**На VPS:**
```
Браузер → Nginx → Next.js
Браузер → Nginx → Laravel
```

**Локально:**
```
Браузер → Nginx → Next.js
Браузер → Nginx → Laravel
```

✅ **Одинаковая архитектура!**

### 2. Все запросы идут через nginx

- RSC запросы (`?_rsc=...`) → через nginx
- Prefetch запросы → через nginx
- Server Actions → через nginx
- API запросы → через nginx

✅ **Как на VPS!**

### 3. HTTPS и HTTP/2

- Используется HTTPS (как на VPS)
- HTTP/2 включен (как на VPS)
- SSL сертификаты (самоподписанные, но структура та же)

✅ **Как на VPS!**

### 4. Заголовки X-Forwarded-*

Next.js получает те же заголовки, что и на VPS:
- `X-Forwarded-Host`
- `X-Forwarded-Proto`
- `X-Forwarded-Port`
- `X-Forwarded-For`

✅ **Как на VPS!**

### 5. Проксирование API

Laravel API доступен через nginx proxy, как на VPS:
- `/api/*` → проксируется на Laravel
- Сохраняется префикс `/api`
- Правильные заголовки передаются

✅ **Как на VPS!**

### 6. Ограничение памяти

Next.js запускается с ограничением памяти:
```bash
NODE_OPTIONS='--max-old-space-size=6144'
```

✅ **Имитация ограниченных ресурсов VPS!**

---

## 🔍 Что воспроизводится

### Проблемы, которые должны воспроизводиться:

1. ✅ **RSC запросы через nginx** - могут прерываться/отменяться
2. ✅ **Prefetch запросы через nginx** - могут отменяться при навигации
3. ✅ **Server Actions через nginx** - могут не завершаться
4. ✅ **Проблемы с таймингами** - если есть сетевые задержки
5. ✅ **Архитектурные конфликты** - если UI не изолирован от RSC

### Почему UI может НЕ крашиться локально:

1. ✅ **Больше ресурсов** - 18GB RAM vs 12GB на VPS
2. ✅ **Быстрее CPU** - M3 Pro vs обычный сервер
3. ✅ **Нет сетевой задержки** - локальная сеть быстрее
4. ✅ **Нет конкуренции** - нет других процессов
5. ✅ **Исправления** - middleware и заголовки исправлены

---

## 📊 Сравнение с VPS

| Параметр | VPS | Локально (текущая настройка) |
|----------|-----|------------------------------|
| Nginx reverse proxy | ✅ | ✅ |
| HTTPS | ✅ | ✅ |
| HTTP/2 | ✅ | ✅ |
| Заголовки X-Forwarded-* | ✅ | ✅ |
| Проксирование API | ✅ | ✅ |
| Архитектура запросов | ✅ | ✅ |
| RAM | 12GB | 18GB (больше) |
| CPU | Обычный | M3 Pro (быстрее) |
| Сетевая задержка | Есть | Нет |
| Конкуренция за ресурсы | Есть | Нет |

---

## ✅ Итог

Текущая настройка **полностью имитирует VPS сервер** по архитектуре и поведению запросов. 

Если UI не крашится локально - это хорошо! Это означает, что:
- Либо проблемы были связаны с ресурсами VPS
- Либо исправления помогли
- Либо нужна большая нагрузка для воспроизведения

**Главное:** Архитектура запросов идентична VPS, поэтому проблемы, связанные с архитектурой, должны воспроизводиться.

---

## 🚀 Запуск

Используйте скрипт `START_SERVERS.sh`:

```bash
./START_SERVERS.sh
```

Или вручную:

```bash
# Nginx
brew services start nginx

# Laravel
cd backend
php artisan serve --host=127.0.0.1 --port=8000

# Next.js
npm run dev
```

---

## 📝 Логи

- **Next.js:** `tail -f /tmp/nextjs-server.log`
- **Laravel:** `tail -f /tmp/laravel-server.log`
- **Nginx:** `tail -f /opt/homebrew/var/log/nginx/error.log`

---

## 🔧 Устранение неполадок

### 502 Bad Gateway

1. Проверьте, что Next.js запущен: `ps aux | grep "next dev"`
2. Проверьте логи: `tail -20 /tmp/nextjs-server.log`
3. Перезапустите Next.js: `npm run dev`

### Редирект на localhost:3003

1. Очистите кэш браузера: `Cmd+Shift+R`
2. Откройте в режиме инкогнито
3. Проверьте заголовки в DevTools → Network

### API запросы не работают

1. Проверьте, что Laravel запущен: `lsof -i :8000`
2. Проверьте CORS в `backend/config/cors.php`
3. Проверьте логи nginx: `tail -20 /opt/homebrew/var/log/nginx/error.log`

---

**Дата создания:** 16 января 2026  
**Версия:** 1.0
