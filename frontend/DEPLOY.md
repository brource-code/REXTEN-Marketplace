# Инструкция по установке REXTEN на сервер

## 📋 Содержание

1. [Требования к серверу](#требования-к-серверу)
2. [Подготовка сервера](#подготовка-сервера)
3. [Установка зависимостей](#установка-зависимостей)
4. [Настройка базы данных](#настройка-базы-данных)
5. [Настройка Backend (Laravel)](#настройка-backend-laravel)
6. [Настройка Frontend (Next.js)](#настройка-frontend-nextjs)
7. [Настройка веб-сервера (Nginx)](#настройка-веб-сервера-nginx)
8. [Настройка SSL (HTTPS)](#настройка-ssl-https)
9. [Настройка процессов (PM2/Supervisor)](#настройка-процессов)
10. [Настройка Google API](#настройка-google-api)
11. [Проверка и тестирование](#проверка-и-тестирование)
12. [Мониторинг и обслуживание](#мониторинг-и-обслуживание)

---

## 🖥️ Требования к серверу

### Минимальные требования:
- **ОС**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM**: 4GB (рекомендуется 8GB+)
- **CPU**: 2 ядра (рекомендуется 4+)
- **Диск**: 20GB свободного места (рекомендуется 50GB+)
- **Сеть**: Статический IP адрес или доменное имя

### Необходимое ПО:
- **PHP**: 8.1 или выше
- **Composer**: 2.0+
- **Node.js**: 18.x или 20.x (LTS)
- **NPM**: 9.x+
- **MySQL**: 8.0+ или PostgreSQL 13+
- **Nginx**: 1.18+ или Apache 2.4+
- **Git**: для клонирования репозитория

---

## 🔧 Подготовка сервера

### 1. Обновление системы

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Установка базовых пакетов

```bash
# Ubuntu/Debian
sudo apt install -y curl wget git unzip software-properties-common

# CentOS/RHEL
sudo yum install -y curl wget git unzip
```

### 3. Установка PHP 8.1+

```bash
# Ubuntu/Debian
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.1 php8.1-fpm php8.1-cli php8.1-common \
    php8.1-mysql php8.1-zip php8.1-gd php8.1-mbstring \
    php8.1-curl php8.1-xml php8.1-bcmath php8.1-intl

# CentOS/RHEL (используйте Remi repository)
sudo yum install -y epel-release
sudo yum install -y https://rpms.remirepo.net/enterprise/remi-release-8.rpm
sudo yum install -y php81 php81-php-fpm php81-php-cli php81-php-common \
    php81-php-mysqlnd php81-php-zip php81-php-gd php81-php-mbstring \
    php81-php-curl php81-php-xml php81-php-bcmath php81-php-intl
```

### 4. Установка Composer

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer
composer --version
```

### 5. Установка Node.js и NPM

```bash
# Используем NodeSource repository для стабильной версии
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка версий
node --version  # Должно быть v20.x.x
npm --version   # Должно быть 9.x.x
```

### 6. Установка MySQL

```bash
# Ubuntu/Debian
sudo apt install -y mysql-server
sudo mysql_secure_installation

# CentOS/RHEL
sudo yum install -y mysql-server
sudo systemctl start mysqld
sudo systemctl enable mysqld
sudo mysql_secure_installation
```

### 7. Установка Nginx

```bash
# Ubuntu/Debian
sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# Запуск и автозагрузка
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 💾 Настройка базы данных

### 1. Создание базы данных и пользователя

```bash
# Вход в MySQL
sudo mysql -u root -p

# В MySQL консоли:
CREATE DATABASE ecme_marketplace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ecme_user'@'localhost' IDENTIFIED BY 'ваш_надежный_пароль';
GRANT ALL PRIVILEGES ON ecme_marketplace.* TO 'ecme_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Важно:** База данных создается пустой. Все данные будут перенесены из существующей БД с тестового сервера на следующем шаге (раздел "Перенос данных из существующей базы данных").

### 2. Проверка подключения

```bash
mysql -u ecme_user -p ecme_marketplace
# Если подключение успешно, выйдите командой: EXIT;
```

---

## 🚀 Настройка Backend (Laravel)

### 1. Клонирование проекта

```bash
# Создаем директорию для проекта
sudo mkdir -p /var/www
cd /var/www

# Клонируем репозиторий (замените на ваш URL)
sudo git clone https://github.com/your-username/rexten.git
cd rexten/backend

# Или загрузите архив и распакуйте
# sudo unzip rexten.zip -d /var/www
```

### 2. Установка зависимостей

```bash
cd /var/www/rexten/backend
composer install --no-dev --optimize-autoloader
```

### 3. Настройка переменных окружения

```bash
# Копируем пример файла окружения
cp .env.example .env

# Генерируем ключ приложения
php artisan key:generate

# Генерируем JWT секрет
php artisan jwt:secret
```

### 4. Редактирование `.env` файла

```bash
nano .env
```

**Минимальная конфигурация `.env`:**

```env
APP_NAME="REXTEN"
APP_ENV=production
APP_KEY=base64:... (сгенерирован автоматически)
APP_DEBUG=false
APP_URL=https://yourdomain.com

# База данных
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ecme_marketplace
DB_USERNAME=ecme_user
DB_PASSWORD=ваш_надежный_пароль

# JWT (сгенерирован автоматически)
JWT_SECRET=... (сгенерирован автоматически)

# Frontend URL (для CORS)
FRONTEND_URL=https://yourdomain.com

# Почта (настройте по необходимости)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"

# Файлы
FILESYSTEM_DISK=local

# Временная зона (опционально)
APP_TIMEZONE=America/Los_Angeles
# Или для России: APP_TIMEZONE=Europe/Moscow

# Google OAuth (для авторизации через Google)
GOOGLE_CLIENT_ID=ваш_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=ваш_google_client_secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/auth/google/callback
# Или если API в корне:
# GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

### 5. Перенос данных из существующей базы данных

**Важно:** При переносе проекта на новый сервер необходимо перенести все данные из существующей базы данных. **НЕ используйте** `php artisan db:seed` - это создаст только тестовые данные и удалит существующие.

#### Вариант 1: Экспорт/Импорт через mysqldump (рекомендуется)

**На тестовом сервере:**

```bash
# Экспорт базы данных
mysqldump -u ваш_пользователь_бд -p название_базы_данных > ecme_marketplace_backup.sql

# Или с дополнительными опциями для лучшей совместимости:
mysqldump -u ваш_пользователь_бд -p \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  название_базы_данных > ecme_marketplace_backup.sql
```

**На новом сервере:**

```bash
# Загрузите файл backup на новый сервер (через scp, sftp или другой способ)
# Например:
scp ecme_marketplace_backup.sql user@new-server:/tmp/

# Импорт базы данных
mysql -u ecme_user -p ecme_marketplace < /tmp/ecme_marketplace_backup.sql

# Или если файл уже на сервере:
mysql -u ecme_user -p ecme_marketplace < ecme_marketplace_backup.sql
```

#### Вариант 2: Перенос через SSH туннель (если есть прямой доступ)

```bash
# На новом сервере создайте SSH туннель и импортируйте напрямую
ssh -L 3307:localhost:3306 user@test-server
# В другом терминале:
mysqldump -h 127.0.0.1 -P 3307 -u пользователь_бд -p название_базы | \
  mysql -u ecme_user -p ecme_marketplace
```

#### Вариант 3: Перенос только структуры + данных отдельно

```bash
# На тестовом сервере - только структура (без данных)
mysqldump -u пользователь -p --no-data название_базы > structure.sql

# На тестовом сервере - только данные (без структуры)
mysqldump -u пользователь -p --no-create-info название_базы > data.sql

# На новом сервере - сначала структура
mysql -u ecme_user -p ecme_marketplace < structure.sql

# Затем выполните миграции (на случай если структура изменилась)
cd /var/www/rexten/backend
php artisan migrate --force

# Затем данные
mysql -u ecme_user -p ecme_marketplace < data.sql
```

**Важные замечания при переносе:**

1. **Проверьте версию MySQL** - убедитесь, что версии совметимы (рекомендуется MySQL 8.0+)
2. **Проверьте кодировку** - должна быть `utf8mb4` (указана при создании БД)
3. **Проверьте внешние ключи** - при импорте могут быть ошибки, если порядок таблиц неправильный. Используйте `--single-transaction` для консистентности
4. **Проверьте пользователей** - после импорта все пользователи и их данные будут сохранены
5. **Проверьте данные** - после импорта проверьте несколько записей в ключевых таблицах (users, companies, services, bookings)

**Проверка после импорта:**

```bash
# Войдите в MySQL
mysql -u ecme_user -p ecme_marketplace

# Проверьте количество записей в основных таблицах
SELECT COUNT(*) as users_count FROM users;
SELECT COUNT(*) as companies_count FROM companies;
SELECT COUNT(*) as services_count FROM services;
SELECT COUNT(*) as bookings_count FROM bookings;

# Выйдите
EXIT;
```

### 6. Запуск миграций (если структура изменилась)

```bash
# Если вы перенесли данные из старой БД, миграции могут быть уже выполнены
# Но на всякий случай запустите с флагом --force (не создаст дубликаты)
php artisan migrate --force
```

**Если миграции уже выполнены в импортированной БД:**
```bash
# Проверьте статус миграций
php artisan migrate:status

# Если все миграции применены, ничего делать не нужно
```

### 7. Перенос файлов (storage)

Если на тестовом сервере есть загруженные файлы (аватары, изображения объявлений и т.д.):

```bash
# На тестовом сервере - создайте архив storage
cd /path/to/test-server/backend
tar -czf storage_backup.tar.gz storage/app/public

# Перенесите на новый сервер (через scp, sftp и т.д.)
scp storage_backup.tar.gz user@new-server:/tmp/

# На новом сервере - распакуйте
cd /var/www/rexten/backend
tar -xzf /tmp/storage_backup.tar.gz

# Убедитесь, что права доступа правильные
sudo chown -R www-data:www-data storage
sudo chmod -R 775 storage/app/public
```

### 8. Настройка прав доступа

```bash
# Устанавливаем владельца
sudo chown -R www-data:www-data /var/www/rexten/backend

# Устанавливаем права
sudo chmod -R 755 /var/www/rexten/backend
sudo chmod -R 775 /var/www/rexten/backend/storage
sudo chmod -R 775 /var/www/rexten/backend/bootstrap/cache

# Создаем символическую ссылку для storage (если нужно)
cd /var/www/rexten/backend
php artisan storage:link
```

**Важно:** Убедитесь, что директория `storage/app/public` существует и доступна для записи, так как там хранятся загруженные файлы (аватары, изображения объявлений и т.д.).

### 9. Оптимизация Laravel

```bash
# Кеширование конфигурации
php artisan config:cache

# Кеширование маршрутов
php artisan route:cache

# Кеширование представлений
php artisan view:cache

# Оптимизация автозагрузчика
composer dump-autoload --optimize
```

---

## 🎨 Настройка Frontend (Next.js)

### 1. Переход в директорию frontend

```bash
cd /var/www/rexten
```

### 2. Установка зависимостей

```bash
npm ci --production
# или
npm install --production
```

### 3. Настройка переменных окружения

```bash
# Создаем .env.local
nano .env.local
```

**Конфигурация `.env.local`:**

```env
# Laravel API URL
NEXT_PUBLIC_LARAVEL_API_URL=https://yourdomain.com/api
# Или если API на поддомене:
# NEXT_PUBLIC_LARAVEL_API_URL=https://api.yourdomain.com/api

# Auth
AUTH_SECRET=ваш-секретный-ключ-для-next-auth
AUTH_URL=https://yourdomain.com

# BasePath (если приложение не в корне, например /project3)
# Для корня оставьте пустым: NEXT_PUBLIC_BASE_PATH=
NEXT_PUBLIC_BASE_PATH=

# Использование mock авторизации (только для разработки)
NEXT_PUBLIC_USE_MOCK_AUTH=false

# Google Maps API (для автозаполнения адресов)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=ваш_google_maps_api_ключ
```

**Важно:**
- Если приложение размещено не в корне домена (например, `/project3`), установите `NEXT_PUBLIC_BASE_PATH=/project3`
- `NEXT_PUBLIC_LARAVEL_API_URL` должен указывать на полный URL вашего Laravel API
- После изменения `.env.local` необходимо пересобрать проект: `npm run build`

**Генерация AUTH_SECRET:**

```bash
openssl rand -base64 32
```

### 4. Сборка проекта

```bash
# Production сборка (с увеличенным лимитом памяти)
NODE_OPTIONS='--max-old-space-size=6144' npm run build
```

**Примечание:** Если сборка падает с ошибкой нехватки памяти, увеличьте значение:
```bash
NODE_OPTIONS='--max-old-space-size=8192' npm run build
```

### 5. Настройка прав доступа

```bash
sudo chown -R www-data:www-data /var/www/rexten
sudo chmod -R 755 /var/www/rexten
```

---

## 🌐 Настройка веб-сервера (Nginx)

### 1. Создание конфигурации для Backend

```bash
sudo nano /etc/nginx/sites-available/ecme-backend
```

**Конфигурация `/etc/nginx/sites-available/ecme-backend`:**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # или yourdomain.com/api
    root /var/www/rexten/backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Разрешаем доступ к storage для загруженных файлов
    location /storage {
        alias /var/www/rexten/backend/storage/app/public;
        try_files $uri $uri/ =404;
    }
}
```

### 2. Создание конфигурации для Frontend

```bash
sudo nano /etc/nginx/sites-available/ecme-frontend
```

**Конфигурация `/etc/nginx/sites-available/ecme-frontend`:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/rexten/.next;

    # Логи
    access_log /var/log/nginx/ecme-frontend-access.log;
    error_log /var/log/nginx/ecme-frontend-error.log;

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Статические файлы
    location /_next/static {
        alias /var/www/rexten/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Все остальные запросы проксируем на Next.js
    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Активация конфигураций

```bash
# Создаем символические ссылки
sudo ln -s /etc/nginx/sites-available/ecme-backend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/ecme-frontend /etc/nginx/sites-enabled/

# Проверяем конфигурацию
sudo nginx -t

# Перезагружаем Nginx
sudo systemctl reload nginx
```

---

## 🔒 Настройка SSL (HTTPS)

### 1. Установка Certbot

```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-nginx
```

### 2. Получение SSL сертификата

```bash
# Для frontend
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Для backend (если используете поддомен)
sudo certbot --nginx -d api.yourdomain.com
```

### 3. Автоматическое обновление

```bash
# Проверка автообновления
sudo certbot renew --dry-run
```

---

## ⚙️ Настройка процессов

### Вариант 1: PM2 (рекомендуется для Next.js)

```bash
# Установка PM2
sudo npm install -g pm2

# Запуск Next.js через PM2 с увеличенным лимитом памяти
cd /var/www/rexten
pm2 start npm --name "ecme-frontend" -- start -- --max-old-space-size=6144

# Или создайте ecosystem.config.js для более детальной настройки
nano ecosystem.config.js
```

**Конфигурация `ecosystem.config.js` (опционально, но рекомендуется):**

```javascript
module.exports = {
  apps: [{
    name: 'ecme-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/rexten',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=6144',
      PORT: 3003
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/ecme-frontend-error.log',
    out_file: '/var/log/pm2/ecme-frontend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
```

```bash
# Запуск с конфигурацией
pm2 start ecosystem.config.js

# Сохранение конфигурации PM2
pm2 save

# Настройка автозапуска
pm2 startup
# Выполните команду, которую выведет PM2
```

### Вариант 2: Supervisor (для Laravel Queue)

```bash
# Установка Supervisor
sudo apt install -y supervisor

# Создание конфигурации
sudo nano /etc/supervisor/conf.d/ecme-queue.conf
```

**Конфигурация `/etc/supervisor/conf.d/ecme-queue.conf`:**

```ini
[program:ecme-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/rexten/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/rexten/backend/storage/logs/queue.log
stopwaitsecs=3600
```

```bash
# Перезагрузка Supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start ecme-queue:*
```

### Вариант 3: Systemd (для Laravel)

```bash
sudo nano /etc/systemd/system/ecme-backend.service
```

**Конфигурация `/etc/systemd/system/ecme-backend.service`:**

```ini
[Unit]
Description=REXTEN Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/rexten/backend
ExecStart=/usr/bin/php artisan serve --host=127.0.0.1 --port=8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ecme-backend
sudo systemctl start ecme-backend
```

---

## ✅ Проверка и тестирование

### 1. Проверка Backend API

```bash
# Проверка доступности API
curl http://localhost:8000/api/health
# или
curl https://api.yourdomain.com/api/health
```

### 2. Проверка Frontend

```bash
# Проверка доступности
curl http://localhost:3003
# или
curl https://yourdomain.com
```

### 3. Проверка базы данных

```bash
# Вход в MySQL
mysql -u ecme_user -p ecme_marketplace

# Проверка таблиц
SHOW TABLES;
EXIT;
```

### 4. Проверка логов

```bash
# Laravel логи
tail -f /var/www/rexten/backend/storage/logs/laravel.log

# Nginx логи
tail -f /var/log/nginx/ecme-frontend-error.log
tail -f /var/log/nginx/ecme-backend-error.log

# PM2 логи
pm2 logs ecme-frontend
```

---

## 📊 Мониторинг и обслуживание

### 1. Регулярные задачи (Cron)

```bash
# Редактирование crontab
sudo crontab -e -u www-data
```

**Добавьте следующие задачи:**

```cron
# Очистка кеша Laravel каждый час
0 * * * * cd /var/www/rexten/backend && php artisan cache:clear

# Оптимизация Laravel каждый день в 3:00
0 3 * * * cd /var/www/rexten/backend && php artisan optimize:clear && php artisan optimize

# Резервное копирование базы данных каждый день в 2:00
0 2 * * * mysqldump -u ecme_user -p'ваш_пароль' ecme_marketplace > /var/backups/ecme_$(date +\%Y\%m\%d).sql
```

### 2. Мониторинг ресурсов

```bash
# Мониторинг процессов PM2
pm2 monit

# Мониторинг системных ресурсов
htop
# или
top
```

### 3. Обновление проекта

```bash
# Backend
cd /var/www/rexten/backend
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Frontend
cd /var/www/rexten
git pull origin main
npm ci --production
NODE_OPTIONS='--max-old-space-size=6144' npm run build
pm2 restart ecme-frontend
```

### 4. Настройка CORS для Production

После настройки SSL и получения финальных URL, обновите CORS настройки в Laravel:

```bash
nano /var/www/rexten/backend/config/cors.php
```

Убедитесь, что в `allowed_origins` указан ваш production URL:

```php
'allowed_origins' => [
    env('FRONTEND_URL', 'https://yourdomain.com'),
    'https://yourdomain.com',
    'https://www.yourdomain.com',
],
```

Также проверьте `.env` файл backend:

```env
FRONTEND_URL=https://yourdomain.com
```

После изменений очистите кеш Laravel:

```bash
cd /var/www/rexten/backend
php artisan config:cache
```

### 5. Резервное копирование

```bash
# Создание директории для бэкапов
sudo mkdir -p /var/backups/ecme

# Скрипт резервного копирования
sudo nano /usr/local/bin/ecme-backup.sh
```

**Содержимое скрипта:**

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/ecme"
DATE=$(date +%Y%m%d_%H%M%S)

# Бэкап базы данных
mysqldump -u ecme_user -p'ваш_пароль' ecme_marketplace > "$BACKUP_DIR/db_$DATE.sql"

# Бэкап файлов
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" /var/www/rexten/backend/storage

# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -type f -mtime +7 -delete
```

```bash
# Делаем скрипт исполняемым
sudo chmod +x /usr/local/bin/ecme-backup.sh

# Добавляем в cron (ежедневно в 2:00)
sudo crontab -e
# Добавьте: 0 2 * * * /usr/local/bin/ecme-backup.sh
```

---

## 🔧 Решение проблем

### Проблема: 502 Bad Gateway

```bash
# Проверьте, запущен ли PHP-FPM
sudo systemctl status php8.1-fpm

# Перезапустите PHP-FPM
sudo systemctl restart php8.1-fpm

# Проверьте логи
sudo tail -f /var/log/nginx/error.log
```

### Проблема: 500 Internal Server Error

```bash
# Проверьте права доступа
sudo chmod -R 775 /var/www/rexten/backend/storage
sudo chmod -R 775 /var/www/rexten/backend/bootstrap/cache

# Проверьте логи Laravel
tail -f /var/www/rexten/backend/storage/logs/laravel.log
```

### Проблема: Next.js не запускается

```bash
# Проверьте логи PM2
pm2 logs ecme-frontend

# Перезапустите процесс
pm2 restart ecme-frontend

# Проверьте использование памяти
free -h
```

### Проблема: CORS ошибки

```bash
# Проверьте настройки CORS в backend/config/cors.php
# Убедитесь, что FRONTEND_URL в .env правильный
nano /var/www/rexten/backend/.env
# Проверьте: FRONTEND_URL=https://yourdomain.com

# Очистите кеш конфигурации
cd /var/www/rexten/backend
php artisan config:clear
php artisan config:cache
```

### Проблема: Next.js не собирается (нехватка памяти)

```bash
# Увеличьте лимит памяти
NODE_OPTIONS='--max-old-space-size=8192' npm run build

# Или добавьте в package.json:
# "build": "NODE_OPTIONS='--max-old-space-size=8192' next build"
```

### Проблема: basePath не работает

```bash
# Убедитесь, что NEXT_PUBLIC_BASE_PATH установлен в .env.local
# После изменения пересоберите проект
npm run build

# Проверьте, что Nginx правильно проксирует запросы с basePath
```

### Проблема: Статические файлы не загружаются

```bash
# Проверьте права доступа на .next директорию
sudo chown -R www-data:www-data /var/www/rexten/.next
sudo chmod -R 755 /var/www/rexten/.next

# Проверьте конфигурацию Nginx для статических файлов
```

---

## 📝 Чеклист установки

### Подготовка сервера
- [ ] Обновлена система
- [ ] Установлен PHP 8.1+ с необходимыми расширениями
- [ ] Установлен Composer
- [ ] Установлен Node.js 18+ или 20+ (LTS)
- [ ] Установлен NPM
- [ ] Установлен MySQL 8.0+
- [ ] Установлен Nginx

### База данных
- [ ] Создана база данных `ecme_marketplace`
- [ ] Создан пользователь БД с правами
- [ ] Проверено подключение к БД

### Backend (Laravel)
- [ ] Клонирован/загружен проект
- [ ] Установлены зависимости (`composer install --no-dev`)
- [ ] Создан `.env` файл
- [ ] Сгенерирован `APP_KEY` (`php artisan key:generate`)
- [ ] Сгенерирован `JWT_SECRET` (`php artisan jwt:secret`)
- [ ] Настроены переменные окружения в `.env`
- [ ] Создана база данных на новом сервере
- [ ] Перенесены данные из существующей БД с тестового сервера (через mysqldump)
- [ ] Проверена корректность импорта данных
- [ ] Выполнены миграции (`php artisan migrate --force`) - если структура изменилась
- [ ] Перенесены файлы из storage (аватары, изображения и т.д.)
- [ ] Настроены права доступа (storage, bootstrap/cache)
- [ ] Выполнена оптимизация Laravel (config:cache, route:cache, view:cache)

### Frontend (Next.js)
- [ ] Установлены зависимости (`npm ci --production`)
- [ ] Создан `.env.local` файл
- [ ] Настроены переменные окружения (API URL, AUTH_SECRET, BASE_PATH)
- [ ] Выполнена сборка проекта (`npm run build`)
- [ ] Проверена работа сборки

### Веб-сервер (Nginx)
- [ ] Создана конфигурация для Backend
- [ ] Создана конфигурация для Frontend
- [ ] Активированы конфигурации (символические ссылки)
- [ ] Проверена конфигурация Nginx (`nginx -t`)
- [ ] Перезагружен Nginx

### SSL/HTTPS
- [ ] Установлен Certbot
- [ ] Получен SSL сертификат для Frontend
- [ ] Получен SSL сертификат для Backend (если на поддомене)
- [ ] Проверено автообновление сертификатов

### Процессы
- [ ] Установлен PM2
- [ ] Настроен PM2 для Frontend (с NODE_OPTIONS)
- [ ] Настроен автозапуск PM2
- [ ] Настроен Supervisor для Laravel Queue (если используется)
- [ ] Настроен Systemd для Backend (если используется)

### Проверка
- [ ] Проверена работа Backend API (curl или браузер)
- [ ] Проверена работа Frontend (браузер)
- [ ] Проверены логи (Laravel, Nginx, PM2)
- [ ] Обновлены CORS настройки для production URL
- [ ] Проверена работа авторизации
- [ ] Проверена работа API запросов
- [ ] Настроен Google Maps API ключ
- [ ] Настроен Google OAuth (если используется)
- [ ] Проверена работа автозаполнения адресов
- [ ] Проверена работа Google авторизации

### Обслуживание
- [ ] Настроено резервное копирование БД
- [ ] Настроено резервное копирование файлов
- [ ] Настроены cron задачи (очистка кеша, оптимизация)
- [ ] Настроен мониторинг (опционально)

## 🗺️ Настройка Google API

Проект использует Google API для двух целей:
1. **Google Maps Places API** - для автозаполнения адресов
2. **Google OAuth** - для авторизации через Google

### 1. Получение Google Maps API ключа

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в **APIs & Services** → **Library**
4. Найдите и включите следующие API:
   - **Places API** (для автозаполнения адресов)
   - **Maps JavaScript API** (опционально, если используются карты)
5. Перейдите в **APIs & Services** → **Credentials**
6. Нажмите **Create Credentials** → **API Key**
7. Скопируйте созданный ключ
8. (Рекомендуется) Ограничьте ключ:
   - **Application restrictions**: HTTP referrers
   - **Website restrictions**: Добавьте ваш домен (например, `https://yourdomain.com/*`)

### 2. Получение Google OAuth credentials

1. В том же проекте Google Cloud Console перейдите в **APIs & Services** → **Credentials**
2. Нажмите **Create Credentials** → **OAuth client ID**
3. Если запросит, настройте **OAuth consent screen**:
   - Выберите **External** (для публичного приложения)
   - Заполните обязательные поля (App name, User support email, Developer contact)
   - Сохраните
4. Создайте **OAuth client ID**:
   - **Application type**: Web application
   - **Name**: REXTEN
   - **Authorized JavaScript origins**: 
     - `https://yourdomain.com`
     - `https://api.yourdomain.com` (если API на поддомене)
   - **Authorized redirect URIs**:
     - `https://api.yourdomain.com/api/auth/google/callback`
     - Или `https://yourdomain.com/api/auth/google/callback` (если API в корне)
5. Скопируйте **Client ID** и **Client Secret**

### 3. Настройка переменных окружения

#### Frontend (`.env.local`)

Добавьте в `/var/www/rexten/.env.local`:

```env
# Google Maps API Key (для автозаполнения адресов)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=ваш_google_maps_api_ключ
```

#### Backend (`.env`)

Добавьте в `/var/www/rexten/backend/.env`:

```env
# Google OAuth (для авторизации через Google)
GOOGLE_CLIENT_ID=ваш_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=ваш_google_client_secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/auth/google/callback
# Или если API в корне:
# GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

### 4. Применение изменений

```bash
# Frontend - пересоберите проект
cd /var/www/rexten
npm run build
pm2 restart ecme-frontend

# Backend - очистите кеш конфигурации
cd /var/www/rexten/backend
php artisan config:clear
php artisan config:cache
```

### 5. Проверка работы

**Google Maps:**
- Откройте форму регистрации бизнеса или форму бронирования
- Попробуйте ввести адрес - должно появиться автозаполнение

**Google OAuth:**
- Откройте страницу входа
- Нажмите "Войти через Google"
- Должно произойти перенаправление на Google и обратно

### 6. Ограничения и безопасность

**Важно для безопасности:**
- Ограничьте Google Maps API ключ по HTTP referrers (только ваш домен)
- Не коммитьте ключи в Git
- Используйте разные ключи для development и production
- Регулярно проверяйте использование API в Google Cloud Console

**Лимиты Google Maps API:**
- Бесплатный тариф: $200 кредитов в месяц
- Places API (Autocomplete): $2.83 за 1000 запросов
- Следите за использованием в Google Cloud Console

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `/var/www/rexten/backend/storage/logs/laravel.log`
2. Проверьте логи Nginx: `/var/log/nginx/error.log`
3. Проверьте статус сервисов: `sudo systemctl status nginx php8.1-fpm`
4. Проверьте PM2: `pm2 status` и `pm2 logs`

---

**Дата создания**: 2026-01-09  
**Версия**: 1.0

