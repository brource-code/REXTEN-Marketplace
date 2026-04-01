# Команды для управления сервером и контейнерами Rexten

## 🛑 Выключение сервера (остановка машины)

```bash
# Остановка всех контейнеров
docker-compose down

# Выключение сервера (Linux)
sudo shutdown -h now

# Выключение с задержкой (например, через 10 минут)
sudo shutdown -h +10

# Немедленное выключение
sudo shutdown -h 0
```

## 🔨 Пересборка фронт контейнера

```bash
# Пересборка только frontend контейнера без кеша
docker-compose build --no-cache frontend

# Пересборка и перезапуск frontend контейнера
docker-compose up -d --build frontend

# Пересборка с перезапуском всех зависимых сервисов
docker-compose up -d --build
```

## 🧹 Очистка кешей

### Frontend (Next.js)

```bash
# Очистка кеша Next.js (внутри контейнера)
docker-compose exec frontend rm -rf .next
docker-compose exec frontend rm -rf .next/cache
docker-compose exec frontend rm -rf node_modules/.cache

# Или локально (если запускаете не в Docker)
cd frontend
rm -rf .next
rm -rf .next/cache
rm -rf node_modules/.cache
```

### Backend (Laravel)

```bash
# Очистка всех кешей Laravel одной командой
docker-compose exec backend php artisan optimize:clear

# Или по отдельности
docker-compose exec backend php artisan cache:clear
docker-compose exec backend php artisan config:clear
docker-compose exec backend php artisan route:clear
docker-compose exec backend php artisan view:clear
```

### Docker

```bash
# Очистка Docker кеша
docker system prune -a

# Очистка только неиспользуемых образов
docker image prune -a
```

## 🔄 Перезагрузка контейнеров

```bash
# Перезапуск всех контейнеров
docker-compose restart

# Перезапуск конкретного контейнера
docker-compose restart frontend
docker-compose restart backend
docker-compose restart nginx

# Остановка и запуск заново
docker-compose down
docker-compose up -d

# Перезапуск с пересборкой
docker-compose up -d --build
```

## 🔧 Перезагрузка бэкенда

```bash
# Перезапуск только backend контейнера
docker-compose restart backend

# Перезапуск с очисткой кешей Laravel
docker-compose exec backend php artisan optimize:clear
docker-compose restart backend

# Перезапуск queue worker (если используется)
docker-compose restart queue

# Перезапуск с пересборкой образа
docker-compose build --no-cache backend
docker-compose up -d backend
```

## 📊 Мониторинг и диагностика

```bash
# Статус всех контейнеров
docker-compose ps

# Логи в реальном времени
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f nginx

# Вход в контейнер
docker-compose exec frontend sh
docker-compose exec backend bash

# Проверка использования ресурсов
docker stats
```

## ⚡ Быстрые команды (комбинации)

### Полная перезагрузка фронтенда
```bash
docker-compose exec frontend rm -rf .next .next/cache node_modules/.cache
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Полная перезагрузка бэкенда
```bash
docker-compose exec backend php artisan optimize:clear
docker-compose restart backend queue
```

### Полная перезагрузка всего проекта
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Полная очистка и перезапуск
```bash
# Остановка контейнеров
docker-compose down

# Очистка кешей
docker-compose exec frontend rm -rf .next .next/cache node_modules/.cache || true
docker-compose exec backend php artisan optimize:clear || true

# Пересборка и запуск
docker-compose build --no-cache
docker-compose up -d
```

## 📝 Примечания

- Все команды выполняются из корня проекта, где находится `docker-compose.yml`
- Для команд с `sudo` может потребоваться пароль администратора
- Команды с `--no-cache` выполняются дольше, но гарантируют чистую пересборку
- Перед выключением сервера рекомендуется остановить контейнеры: `docker-compose down`
