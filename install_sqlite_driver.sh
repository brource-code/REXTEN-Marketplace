#!/bin/bash

# Скрипт для установки драйвера SQLite для PHP 8.3

echo "Устанавливаю драйвер SQLite для PHP 8.3..."
sudo apt install -y php8.3-sqlite3

echo ""
echo "Проверяю установку..."
php -m | grep -i sqlite

echo ""
echo "Готово! Теперь можно выполнить миграцию."
