#!/bin/bash

# Команды для установки PHP 8.3 на Ubuntu/Debian

echo "=== Установка PHP 8.3 ==="
echo ""

echo "1. Обновляю список пакетов..."
sudo apt update

echo ""
echo "2. Устанавливаю зависимости..."
sudo apt install -y software-properties-common

echo ""
echo "3. Добавляю репозиторий PHP..."
sudo add-apt-repository -y ppa:ondrej/php

echo ""
echo "4. Обновляю список пакетов после добавления репозитория..."
sudo apt update

echo ""
echo "5. Устанавливаю PHP 8.3 и необходимые расширения..."
sudo apt install -y php8.3 php8.3-cli php8.3-common php8.3-mysql php8.3-xml php8.3-curl php8.3-mbstring php8.3-zip php8.3-bcmath php8.3-intl php8.3-gd php8.3-opcache

echo ""
echo "6. Настраиваю альтернативы PHP..."
sudo update-alternatives --set php /usr/bin/php8.3

echo ""
echo "7. Проверяю версию PHP..."
php --version

echo ""
echo "=== PHP 8.3 успешно установлен! ==="
