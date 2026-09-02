# syntax=docker/dockerfile:1

# ---- Stage 1: build frontend assets (Vite/React/Inertia) ----
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# ---- Stage 2: PHP runtime ----
FROM php:8.4-cli

RUN apt-get update && apt-get install -y \
    git unzip libzip-dev libpng-dev libonig-dev libxml2-dev libicu-dev \
    && docker-php-ext-install pdo_mysql mbstring bcmath exif pcntl gd zip intl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install PHP dependencies. Deliberately not using --no-dev: this deployment
# runs DatabaseSeeder (demo super admin + demo clinic), which needs
# fakerphp/faker — a require-dev package. Once you're past the test/demo
# phase and stop needing the seeders, switch this back to --no-dev for a
# leaner image.
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --optimize-autoloader

# Copy app code, then bring in built frontend assets from stage 1
COPY . .
COPY --from=frontend /app/public/build ./public/build

RUN composer dump-autoload --optimize \
    && mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

COPY docker-start.sh /usr/local/bin/docker-start.sh
RUN chmod +x /usr/local/bin/docker-start.sh

EXPOSE 10000
CMD ["/usr/local/bin/docker-start.sh"]
