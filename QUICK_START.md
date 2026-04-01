# Quick Start - Dev Environment

## ✅ Реализация завершена!

### Запуск dev сервера

```bash
cd /home/byrelaxx/rexten/frontend

# Загрузка NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 18

# Запуск через PM2 (рекомендуется)
pm2 start npm --name "rexten-dev" -- run dev

# Или напрямую
npm run dev
```

### Доступ

- **Dev**: http://localhost:3004 или http://SERVER_IP:3004
- **Production**: https://rexten.live (порт 3003 через nginx)

### Управление через PM2

```bash
pm2 list              # Статус
pm2 logs rexten-dev   # Логи
pm2 stop rexten-dev   # Остановить
pm2 restart rexten-dev # Перезапустить
pm2 delete rexten-dev # Удалить
```

### Workflow

1. **Разработка**: `pm2 start npm --name "rexten-dev" -- run dev`
2. **Кодите**: изменения видны сразу (hot reload)
3. **Деплой**: `docker-compose build frontend && docker-compose up -d frontend`

### Автозапуск

PM2 настроен на автозапуск при перезагрузке сервера.

### Troubleshooting

Если проблемы с правами:
```bash
cd /home/byrelaxx/rexten/frontend
sudo chown -R byrelaxx:byrelaxx .next
# или
rm -rf .next
```
