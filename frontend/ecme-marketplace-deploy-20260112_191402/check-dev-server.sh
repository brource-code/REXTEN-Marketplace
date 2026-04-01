#!/bin/bash

echo "=== Проверка процессов Next.js ==="
echo ""

# Получаем PID текущего процесса и его родителя, чтобы исключить их из проверки
CURRENT_PID=$$
PARENT_PID=$PPID

# Проверяем процессы, исключая текущий процесс и его родителя, а также процессы bash/sh, которые запускают скрипт
PROCESSES=$(ps aux | grep -E "next dev|next-server" | grep -v grep | grep -v "bash -c.*check-dev-server" | grep -v "sh -c.*NODE_OPTIONS" | awk -v current="$CURRENT_PID" -v parent="$PARENT_PID" '$2 != current && $2 != parent')

if [ -z "$PROCESSES" ]; then
    echo "✅ Сервер Next.js не запущен - можно запускать"
    echo ""
    exit 0
fi

# Подсчитываем реальные процессы next-server (не обертки bash/sh)
REAL_PROCESSES=$(echo "$PROCESSES" | grep -E "next-server|node.*next dev" | grep -v "bash -c" | grep -v "sh -c")
MAIN_COUNT=$(echo "$REAL_PROCESSES" | grep -c "next" || echo "0")

echo "Найдено активных процессов Next.js: $MAIN_COUNT"
echo ""

if [ "$MAIN_COUNT" -gt 1 ]; then
    echo "❌ ПРОБЛЕМА: Запущено несколько экземпляров Next.js!"
    echo ""
    echo "Процессы:"
    echo "$REAL_PROCESSES" | awk '{printf "  PID %-6s %s\n", $2, $11" "$12" "$13" "$14" "$15}'
    echo ""
    echo "Это вызывает конфликты и падения сервера!"
    echo ""
    echo "Решение:"
    echo "1. Остановите все процессы: ./fix-nextjs.sh"
    echo "2. Затем запустите: npm run dev"
    echo ""
    exit 1
elif [ "$MAIN_COUNT" -eq 1 ]; then
    echo "⚠️  Сервер Next.js уже запущен!"
    echo ""
    echo "Процессы:"
    echo "$REAL_PROCESSES" | awk '{printf "  PID %-6s %s\n", $2, $11" "$12" "$13" "$14" "$15}'
    echo ""
    echo "Остановите его перед запуском нового:"
    echo "  ./fix-nextjs.sh"
    echo "  или"
    echo "  pkill -f 'next dev'"
    echo ""
    exit 1
else
    echo "✅ Сервер Next.js не запущен - можно запускать"
    echo ""
    exit 0
fi

