#!/bin/bash

echo "=========================================="
echo "Исправление проблем с Next.js сервером"
echo "=========================================="
echo ""

# Шаг 1: Остановка всех процессов Next.js
echo "Шаг 1: Остановка всех процессов Next.js..."
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
pkill -f "node.*3003" 2>/dev/null

# Ждем завершения процессов
sleep 2

# Проверяем, что все остановлено
REMAINING=$(ps aux | grep -E "next|node.*3003" | grep -v grep | wc -l | tr -d ' ')
if [ "$REMAINING" -gt 0 ]; then
    echo "⚠️  Предупреждение: Найдено $REMAINING процессов Next.js"
    echo "Процессы:"
    ps aux | grep -E "next|node.*3003" | grep -v grep
    echo ""
    read -p "Принудительно завершить? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -9 -f "next"
        pkill -9 -f "node.*3003"
        sleep 1
    fi
else
    echo "✅ Все процессы Next.js остановлены"
fi
echo ""

# Шаг 2: Очистка кеша
echo "Шаг 2: Очистка кеша..."
if [ -d ".next" ]; then
    SIZE=$(du -sh .next 2>/dev/null | cut -f1)
    echo "Размер кеша: $SIZE"
    rm -rf .next
    echo "✅ Кеш .next удален"
else
    echo "✅ Кеш .next не найден (уже очищен)"
fi

if [ -d ".next/cache" ]; then
    rm -rf .next/cache
    echo "✅ Кеш .next/cache удален"
fi

if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "✅ Кеш node_modules/.cache удален"
fi
echo ""

# Шаг 3: Проверка конфигурации
echo "Шаг 3: Проверка конфигурации..."
if [ -f "next.config.mjs" ]; then
    echo "✅ next.config.mjs найден"
    # Проверяем наличие проблемных настроек
    if grep -q "output.*standalone" next.config.mjs && ! grep -q "NODE_ENV.*production" next.config.mjs; then
        echo "⚠️  Предупреждение: output: 'standalone' может вызывать проблемы в dev режиме"
    fi
else
    echo "⚠️  next.config.mjs не найден"
fi
echo ""

# Шаг 4: Проверка переменных окружения
echo "Шаг 4: Проверка переменных окружения..."
if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo "✅ Файл .env найден"
    MISSING_VARS=0
    if ! grep -q "NEXTAUTH_SECRET" .env.local .env 2>/dev/null; then
        echo "⚠️  NEXTAUTH_SECRET не найден"
        MISSING_VARS=$((MISSING_VARS + 1))
    fi
    if ! grep -q "NEXTAUTH_URL" .env.local .env 2>/dev/null; then
        echo "⚠️  NEXTAUTH_URL не найден"
        MISSING_VARS=$((MISSING_VARS + 1))
    fi
    if [ $MISSING_VARS -eq 0 ]; then
        echo "✅ Все необходимые переменные окружения найдены"
    fi
else
    echo "⚠️  Файл .env не найден"
fi
echo ""

# Шаг 5: Финальная проверка
echo "Шаг 5: Финальная проверка..."
echo "Оставшиеся процессы:"
REMAINING_FINAL=$(ps aux | grep -E "next|node.*3003" | grep -v grep | wc -l | tr -d ' ')
if [ "$REMAINING_FINAL" -eq 0 ]; then
    echo "✅ Нет запущенных процессов Next.js"
else
    echo "⚠️  Найдено $REMAINING_FINAL процессов:"
    ps aux | grep -E "next|node.*3003" | grep -v grep
fi
echo ""

# Шаг 6: Рекомендации
echo "=========================================="
echo "Готово! Следующие шаги:"
echo "=========================================="
echo ""
echo "1. Запустите сервер:"
echo "   npm run dev"
echo ""
echo "2. Или с увеличенной памятью:"
echo "   NODE_OPTIONS='--max-old-space-size=4096' npm run dev"
echo ""
echo "3. Следите за логами в консоли"
echo ""
echo "4. Если проблемы продолжаются, проверьте:"
echo "   - Версию Node.js (рекомендуется 18.x или 20.x)"
echo "   - Логи в .next/trace"
echo "   - Использование памяти"
echo ""

