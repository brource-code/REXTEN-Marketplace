# Development Environment

## Быстрый старт

### Запуск dev сервера

```bash
cd /home/byrelaxx/rexten/frontend
npm run dev
```

Или через PM2 (рекомендуется):

```bash
pm2 start npm --name "rexten-dev" -- run dev
pm2 logs rexten-dev  # Просмотр логов
pm2 stop rexten-dev  # Остановка
pm2 restart rexten-dev  # Перезапуск
```

### Доступ

- **Dev сервер**: http://localhost:3004 или http://SERVER_IP:3004
- **Production**: https://rexten.live (через nginx, порт 3003)

## Управление

### PM2 команды

```bash
pm2 list                    # Список процессов
pm2 logs rexten-dev        # Логи dev сервера
pm2 stop rexten-dev        # Остановить
pm2 restart rexten-dev     # Перезапустить
pm2 delete rexten-dev      # Удалить из PM2
pm2 save                    # Сохранить конфигурацию
```

### Systemd (альтернатива)

```bash
sudo systemctl start rexten-frontend-dev    # Запустить
sudo systemctl stop rexten-frontend-dev     # Остановить
sudo systemctl status rexten-frontend-dev   # Статус
sudo systemctl enable rexten-frontend-dev   # Автозапуск
```

## Workflow

### 1. Разработка

```bash
# Запускаете dev
pm2 start npm --name "rexten-dev" -- run dev

# Редактируете код
# Изменения видны сразу (hot reload)
```

### 2. Деплой в production

```bash
# Останавливаете dev (опционально)
pm2 stop rexten-dev

# Пересобираете production
cd /home/byrelaxx/rexten
docker-compose build frontend
docker-compose up -d frontend

# Production обновлен
```

## Полезные скрипты

- `start-dev.sh` - Запуск dev сервера
- `stop-dev.sh` - Остановка dev сервера

## Настройка Node.js

Node.js 18 управляется через NVM:

```bash
# Загрузка NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Использование Node.js 18
nvm use 18

# Проверка версии
node --version  # v18.20.8
```

## Troubleshooting

### Порт 3004 занят

```bash
lsof -ti:3004 | xargs kill -9
```

### PM2 не видит процессы после перезагрузки

```bash
pm2 save
pm2 startup systemd -u byrelaxx --hp /home/byrelaxx
```

### Dev сервер не запускается

```bash
# Проверьте Node.js версию
node --version  # Должна быть v18+

# Переустановите зависимости
cd /home/byrelaxx/rexten/frontend
npm install

# Проверьте логи
pm2 logs rexten-dev
```
