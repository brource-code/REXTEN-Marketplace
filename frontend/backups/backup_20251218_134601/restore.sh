#!/bin/bash

# Скрипт восстановления из бэкапа
# Использование: ./restore.sh

BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$BACKUP_DIR/../.." && pwd)"

echo "🔄 Восстановление из бэкапа..."
echo "📁 Бэкап: $BACKUP_DIR"
echo "📁 Проект: $PROJECT_ROOT"
echo ""

# Восстановление базы данных
if [ -f "$BACKUP_DIR/database.sqlite" ]; then
    echo "📦 Восстанавливаю базу данных..."
    cp "$BACKUP_DIR/database.sqlite" "$PROJECT_ROOT/backend/database/database.sqlite"
    echo "✅ База данных восстановлена"
else
    echo "❌ База данных не найдена в бэкапе"
fi

# Восстановление моделей
if [ -d "$BACKUP_DIR/backend/app/Models" ]; then
    echo "📦 Восстанавливаю модели..."
    cp "$BACKUP_DIR/backend/app/Models/"*.php "$PROJECT_ROOT/backend/app/Models/" 2>/dev/null
    echo "✅ Модели восстановлены"
fi

# Восстановление контроллеров
if [ -d "$BACKUP_DIR/backend/app/Http/Controllers/Admin" ]; then
    echo "📦 Восстанавливаю контроллеры..."
    cp "$BACKUP_DIR/backend/app/Http/Controllers/Admin/"*.php "$PROJECT_ROOT/backend/app/Http/Controllers/Admin/" 2>/dev/null
    echo "✅ Контроллеры восстановлены"
fi

# Восстановление API клиентов
if [ -d "$BACKUP_DIR/src/lib/api" ]; then
    echo "📦 Восстанавливаю API клиенты..."
    cp "$BACKUP_DIR/src/lib/api/"*.ts "$PROJECT_ROOT/src/lib/api/" 2>/dev/null
    echo "✅ API клиенты восстановлены"
fi

# Восстановление компонентов
if [ -d "$BACKUP_DIR/src/components" ]; then
    echo "📦 Восстанавливаю компоненты..."
    cp "$BACKUP_DIR/src/components/"*.jsx "$PROJECT_ROOT/src/components/" 2>/dev/null
    echo "✅ Компоненты восстановлены"
fi

echo ""
echo "✅ Восстановление завершено!"
echo "⚠️  ВАЖНО: После восстановления перезапустите серверы!"
