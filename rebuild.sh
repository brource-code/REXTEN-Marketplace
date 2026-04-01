#!/bin/bash
# Скрипт пересборки фронтенда без танцев с бубном
# Использование: ./rebuild.sh [frontend|backend|all]

set -e

COMPONENT="${1:-frontend}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR"

echo "=== Rexten Rebuild Script ==="
echo "Component: $COMPONENT"
echo ""

rebuild_frontend() {
    echo "[1/4] Останавливаем frontend..."
    docker rm -f rexten_frontend 2>/dev/null || true
    
    echo "[2/4] Удаляем старый образ..."
    docker rmi rexten_frontend:latest 2>/dev/null || true
    
    echo "[3/4] Собираем новый образ..."
    docker-compose build --no-cache frontend
    
    echo "[4/4] Запускаем контейнер..."
    docker-compose up -d frontend
    
    echo ""
    echo "✓ Frontend пересобран и запущен"
    echo "  Проверка: curl -s -o /dev/null -w '%{http_code}' http://localhost/services"
}

rebuild_backend() {
    echo "[1/3] Останавливаем backend и queue..."
    docker rm -f rexten_backend rexten_queue 2>/dev/null || true
    
    echo "[2/3] Собираем новый образ..."
    docker-compose build --no-cache backend
    
    echo "[3/3] Запускаем контейнеры..."
    docker-compose up -d backend queue
    
    echo ""
    echo "✓ Backend пересобран и запущен"
}

rebuild_all() {
    echo "[1/5] Останавливаем все контейнеры..."
    docker-compose down
    
    echo "[2/5] Удаляем старые образы frontend..."
    docker rmi rexten_frontend:latest 2>/dev/null || true
    
    echo "[3/5] Собираем все образы..."
    docker-compose build --no-cache
    
    echo "[4/5] Запускаем все контейнеры..."
    docker-compose up -d
    
    echo "[5/5] Ждём запуска..."
    sleep 5
    
    echo ""
    echo "✓ Все сервисы пересобраны и запущены"
    docker-compose ps
}

case "$COMPONENT" in
    frontend|front|f)
        rebuild_frontend
        ;;
    backend|back|b)
        rebuild_backend
        ;;
    all|a)
        rebuild_all
        ;;
    status|s)
        docker-compose ps
        echo ""
        echo "Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost/services 2>/dev/null || echo 'недоступен')"
        echo "Backend:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health 2>/dev/null || echo 'недоступен')"
        ;;
    logs|l)
        docker-compose logs -f --tail=100 frontend
        ;;
    *)
        echo "Использование: $0 [frontend|backend|all|status|logs]"
        echo ""
        echo "  frontend (f) - пересобрать только фронтенд"
        echo "  backend (b)  - пересобрать только бэкенд"
        echo "  all (a)      - пересобрать всё"
        echo "  status (s)   - показать статус"
        echo "  logs (l)     - логи фронтенда"
        exit 1
        ;;
esac
