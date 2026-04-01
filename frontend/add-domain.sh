#!/bin/bash

# Скрипт для добавления rexten.local в /etc/hosts

echo "🔧 Добавление rexten.local в /etc/hosts..."

if grep -q "rexten.local" /etc/hosts; then
    echo "✅ rexten.local уже в /etc/hosts"
    grep "rexten.local" /etc/hosts
else
    echo "127.0.0.1 rexten.local" | sudo tee -a /etc/hosts
    echo "✅ rexten.local добавлен в /etc/hosts"
    echo ""
    echo "Проверка:"
    grep "rexten.local" /etc/hosts
fi

echo ""
echo "🌐 Теперь можно открыть: https://rexten.local:8443"
