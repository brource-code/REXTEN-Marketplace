# 🚀 Инструкция по развёртыванию ECME Admin

## ✅ Что уже настроено

- ✅ Структура проекта развёрнута
- ✅ Docker конфигурация создана
- ✅ Nginx настроен для проксирования
- ✅ Cloudflare Tunnel настроен для доменов
- ✅ .env файлы созданы (требуют заполнения)

## 📁 Структура проекта

```
/home/byrelaxx/rexten/
├── frontend/          # Next.js приложение (порт 3003)
├── backend/           # Laravel API (порт 8000)
├── nginx/             # Nginx конфигурация
│   └── default.conf
├── docker-compose.yml # Docker Compose конфигурация
└── .env               # Переменные окружения
```

## 🔧 Перед запуском

### 1. Заполни переменные окружения

**Главный .env** (`/home/byrelaxx/rexten/.env`):
```bash
# Заполни эти значения:
DB_HOST=          # IP или hostname БД
DB_DATABASE=      # Имя базы данных
DB_USERNAME=      # Пользователь БД
DB_PASSWORD=      # Пароль БД
APP_KEY=          # Laravel APP_KEY (сгенерируй: php artisan key:generate)
```

**Backend .env** (`/home/byrelaxx/rexten/backend/.env`):
```bash
# Заполни те же DB_* значения
# И сгенерируй APP_KEY если его нет
```

### 2. Сгенерируй Laravel APP_KEY

```bash
cd /home/byrelaxx/rexten/backend
php artisan key:generate
# Скопируй сгенерированный APP_KEY в оба .env файла
```

## 🚀 Запуск проекта

### Вариант 1: Полная сборка и запуск

```bash
cd /home/byrelaxx/rexten
docker-compose up -d --build
```

### Вариант 2: Поэтапный запуск

```bash
# 1. Собрать образы
docker-compose build

# 2. Запустить контейнеры
docker-compose up -d

# 3. Проверить статус
docker-compose ps

# 4. Посмотреть логи
docker-compose logs -f
```

## 📊 Проверка работы

### Статус контейнеров
```bash
docker-compose ps
```

### Логи
```bash
# Все сервисы
docker-compose logs -f

# Только frontend
docker-compose logs -f frontend

# Только backend
docker-compose logs -f backend

# Только nginx
docker-compose logs -f nginx
```

### Проверка портов
```bash
# Frontend должен отвечать на 3003
curl http://localhost:3003

# Backend должен отвечать на 8000
curl http://localhost:8000

# Nginx должен проксировать на 80
curl http://localhost
```

## 🌐 Домены

После запуска проект будет доступен через Cloudflare Tunnel:

- **Frontend**: https://rexten.live
- **Backend API**: https://api.rexten.live

Убедись, что в Cloudflare DNS настроены CNAME записи:
- `rexten.live` → `*.cfargotunnel.com` (Proxied)
- `api.rexten.live` → `*.cfargotunnel.com` (Proxied)

## 🔄 Управление

### Остановка
```bash
docker-compose down
```

### Перезапуск
```bash
docker-compose restart
```

### Пересборка после изменений
```bash
docker-compose up -d --build
```

### Очистка
```bash
# Остановить и удалить контейнеры
docker-compose down

# Удалить образы
docker-compose down --rmi all

# Удалить volumes (осторожно!)
docker-compose down -v
```

## 🐛 Troubleshooting

### Frontend не запускается
```bash
# Проверь логи
docker-compose logs frontend

# Проверь, что порт 3003 свободен
netstat -tlnp | grep 3003

# Пересобери образ
docker-compose build --no-cache frontend
```

### Backend не запускается
```bash
# Проверь логи
docker-compose logs backend

# Проверь .env файл
cat backend/.env | grep -E "APP_KEY|DB_"

# Проверь права на storage
chmod -R 775 backend/storage backend/bootstrap/cache
```

### Nginx ошибки
```bash
# Проверь конфигурацию
docker-compose exec nginx nginx -t

# Проверь логи
docker-compose logs nginx
```

### Проблемы с базой данных
```bash
# Убедись, что БД доступна
# Проверь DB_HOST, DB_USERNAME, DB_PASSWORD в .env
# Проверь, что БД создана и миграции выполнены
```

## 📝 Важные заметки

1. **Порты**:
   - Frontend: 3003 (внутри контейнера)
   - Backend: 8000 (внутри контейнера)
   - Nginx: 80 (проксирует на frontend/backend)

2. **Переменные окружения**:
   - Главный `.env` используется docker-compose
   - `backend/.env` используется Laravel
   - `frontend/.env.local` (если есть) используется Next.js

3. **Volumes**:
   - `backend/storage` и `backend/bootstrap/cache` монтируются как volumes

4. **Сеть**:
   - Все сервисы в одной сети `rexten_network`
   - Обращение по именам: `frontend`, `backend`, `nginx`

## ✅ Чек-лист перед продакшеном

- [ ] Заполнены все переменные окружения
- [ ] APP_KEY сгенерирован для Laravel
- [ ] База данных настроена и доступна
- [ ] Миграции выполнены (если нужно)
- [ ] Cloudflare DNS записи созданы
- [ ] Cloudflare Tunnel перезапущен
- [ ] Все контейнеры запущены и работают
- [ ] Логи не показывают ошибок
- [ ] Домены открываются в браузере
