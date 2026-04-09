#!/bin/bash

# Скрипт для запуска всех серверов локального окружения

echo "🚀 Запуск локального окружения DEV как PROD"
echo ""

# Проверка nginx
echo "📋 Проверка nginx..."
if ! brew services list | grep -q "nginx.*started"; then
    echo "  ⚠️  Nginx не запущен. Запускаю..."
    brew services start nginx
    sleep 2
else
    echo "  ✅ Nginx уже запущен"
fi

# Проверка домена
if ! grep -q "rexten.local" /etc/hosts; then
    echo "  ⚠️  rexten.local не в /etc/hosts. Добавляю..."
    echo "127.0.0.1 rexten.local" | sudo tee -a /etc/hosts
else
    echo "  ✅ rexten.local в /etc/hosts"
fi

# Запуск Backend
echo ""
echo "🔧 Запуск Laravel Backend (port 8000)..."
cd "$(dirname "$0")/backend"
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "  ⚠️  Порт 8000 уже занят"
else
    php artisan serve --host=127.0.0.1 --port=8000 > /tmp/laravel-server.log 2>&1 &
    BACKEND_PID=$!
    echo "  ✅ Backend запущен (PID: $BACKEND_PID)"
    sleep 2
fi

# Запуск Frontend
echo ""
echo "🎨 Запуск Next.js Frontend (port 3003)..."
cd "$(dirname "$0")"
if lsof -Pi :3003 -sTCP:LISTEN -t >/dev/null ; then
    echo "  ⚠️  Порт 3003 уже занят"
else
    export NODE_OPTIONS='--max-old-space-size=12288'
    npx next dev -p 3003 -H 127.0.0.1 > /tmp/nextjs-server.log 2>&1 &
    FRONTEND_PID=$!
    echo "  ✅ Frontend запущен (PID: $FRONTEND_PID)"
    sleep 5
fi

# Проверка
echo ""
echo "🔍 Проверка серверов..."
sleep 3

BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/marketplace/services 2>/dev/null || echo "000")
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3003 2>/dev/null || echo "000")
NGINX_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://rexten.local 2>/dev/null || echo "000")

echo "  Backend (8000):  $([ "$BACKEND_STATUS" != "000" ] && echo "✅ HTTP $BACKEND_STATUS" || echo "❌ Не отвечает")"
echo "  Frontend (3003): $([ "$FRONTEND_STATUS" != "000" ] && echo "✅ HTTP $FRONTEND_STATUS" || echo "❌ Не отвечает")"
echo "  Nginx (443):     $([ "$NGINX_STATUS" != "000" ] && echo "✅ HTTPS $NGINX_STATUS" || echo "❌ Не отвечает")"

echo ""
echo "🌐 Откройте в браузере: https://rexten.local:8443"
echo "   (или http://localhost:3003 для прямого доступа)"
echo ""
echo "📝 Логи:"
echo "  Backend:  tail -f /tmp/laravel-server.log"
echo "  Frontend: tail -f /tmp/nextjs-server.log"
echo "  Nginx:    tail -f /opt/homebrew/var/log/nginx/error.log"
echo ""
echo "🛑 Остановка:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  brew services stop nginx"
