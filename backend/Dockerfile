FROM docker:24-cli AS dockercli

FROM php:8.3-fpm

COPY --from=dockercli /usr/local/bin/docker /usr/local/bin/docker

# Устанавливаем системные зависимости (postgresql-client — дампы БД; docker CLI — platform:backup)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libsqlite3-dev \
    libpq-dev \
    postgresql-client \
    zip \
    unzip \
    sqlite3 \
    && docker-php-ext-install pdo_mysql pdo_sqlite pdo_pgsql pgsql mbstring exif pcntl bcmath gd \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Долгие запросы (создание бэкапа через API)
RUN printf '%s\n' 'max_execution_time = 0' 'max_input_time = -1' > /usr/local/etc/php/conf.d/zz-rexten.ini

# Устанавливаем Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Копируем composer файлы
COPY composer.json composer.lock ./

# Устанавливаем зависимости
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Копируем весь проект
COPY . .

# Генерируем autoload
RUN composer dump-autoload --optimize --no-interaction --no-scripts

# Устанавливаем права
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache \
    && chmod -R 755 /var/www/html/database

# php-fpm (порт 9000) — не использовать php artisan serve в production
RUN rm -f /usr/local/etc/php-fpm.d/www.conf
COPY docker/php-fpm/www.conf /usr/local/etc/php-fpm.d/www.conf

COPY docker/entrypoint-fpm.sh /usr/local/bin/rexten-entrypoint-fpm.sh
RUN chmod +x /usr/local/bin/rexten-entrypoint-fpm.sh

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/rexten-entrypoint-fpm.sh"]
CMD ["php-fpm"]
