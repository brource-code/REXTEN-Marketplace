#!/bin/bash

# Скрипт для остановки dev сервера

# Останавливаем через PM2 если запущен
pm2 stop rexten-dev 2>/dev/null
pm2 delete rexten-dev 2>/dev/null

# Или убиваем процесс на порту 3004
PID=$(lsof -ti:3004 2>/dev/null)
if [ ! -z "$PID" ]; then
    echo "Stopping dev server (PID: $PID)"
    kill $PID
    sleep 2
    # Принудительно если не остановился
    kill -9 $PID 2>/dev/null
fi

echo "Dev server stopped"
