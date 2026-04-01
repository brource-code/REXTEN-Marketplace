#!/bin/bash

# Скрипт для установки PHP 8.3 на Ubuntu/Debian

echo "Обновляю список пакетов..."
sudo apt update

echo ""
echo "Устанавливаю зависимости..."
sudo apt install -y software-properties-common

echo ""
echo "Добавляю репозиторий PHP..."
sudo add-apt-repository -y ppa:ondrej/php

echo ""
echo "Обновляю список пакетов после добавления репозитория..."
sudo apt update

echo ""
echo "Устанавливаю PHP 8.3 и необходимые расширения..."
sudo apt install -y php8.3 php8.3-cli php8.3-common php8.3-mysql php8.3-xml php8.3-xmlrpc php8.3-curl php8.3-gd php8.3-imagick php8.3-cli php8.3-dev php8.3-imap php8.3-mbstring php8.3-opcache php8.3-soap php8.3-zip php8.3-intl php8.3-bcmath

echo ""
echo "Проверяю версию PHP..."
php8.3 --version

echo ""
echo "Настраиваю альтернативы PHP..."
sudo update-alternatives --set php /usr/bin/php8.3

echo ""
echo "Проверяю текущую версию PHP..."
php --version

echo ""
echo "PHP 8.3 успешно установлен!"
