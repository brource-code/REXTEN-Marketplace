#!/bin/bash

# Скрипт для запуска dev сервера с правильной инициализацией NVM

cd /home/byrelaxx/rexten/frontend

# Инициализация NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Используем Node.js 18
nvm use 18

# Запускаем dev сервер
exec npm run dev
