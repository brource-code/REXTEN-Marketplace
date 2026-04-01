#!/bin/bash

# Скрипт для автоматического сохранения изменений в Git

COMMIT_MESSAGE="${1:-Auto commit: $(date '+%Y-%m-%d %H:%M:%S')}"

echo "🔄 Добавляю изменения..."
git add .

echo "💾 Создаю коммит: $COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"

if [ $? -ne 0 ]; then
    echo "⚠️  Нет изменений для коммита или ошибка при создании коммита"
    exit 1
fi

echo "📤 Отправляю в GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Изменения успешно отправлены в GitHub!"
    echo "🔗 Репозиторий: https://github.com/brource-code/REXTEN-Marketplace"
else
    echo "❌ Ошибка при отправке. Проверьте настройки аутентификации."
    echo ""
    echo "Токен уже настроен. Если возникла ошибка, проверьте:"
    echo "1. Токен не истек"
    echo "2. Токен имеет право 'repo'"
    echo "3. Репозиторий существует и доступен"
fi

