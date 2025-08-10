FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
    libsqlite3-dev libpng-dev libjpeg-dev libmagickwand-dev \
    zip unzip git \
    && pecl install imagick \
    && docker-php-ext-enable imagick \
    && docker-php-ext-install pdo pdo_sqlite \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
