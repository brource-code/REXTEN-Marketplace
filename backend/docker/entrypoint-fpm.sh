#!/bin/sh
set -e
# Том с хоста монтируется с UID хоста; php-fpm пишет от www-data — без этого laravel.log и cache недоступны.
if [ -d /var/www/html/storage ]; then
    chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true
    chmod -R ug+rwX /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true
fi
exec docker-php-entrypoint "$@"
