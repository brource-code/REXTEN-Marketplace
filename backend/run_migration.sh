#!/bin/bash

# Скрипт для выполнения миграции и очистки кеша Laravel

echo "Выполняю миграцию..."
php artisan migrate --force

echo ""
echo "Очищаю кеш конфигурации..."
php artisan config:clear

echo "Очищаю кеш маршрутов..."
php artisan route:clear

echo "Очищаю кеш представлений..."
php artisan view:clear

echo "Очищаю кеш приложения..."
php artisan cache:clear

echo "Оптимизирую конфигурацию..."
php artisan config:cache

echo "Оптимизирую маршруты..."
php artisan route:cache

echo ""
echo "Готово! Миграция выполнена и кеш очищен."
