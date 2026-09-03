# syntax=docker/dockerfile:1

# ---- Stage 1: build frontend assets (Vite/React/Inertia) ----
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# ---- Stage 2: PHP runtime (FrankenPHP: Caddy + PHP in one binary, proper
# concurrency — unlike `php artisan serve`, which is dev-only and handles
# one request at a time) ----
FROM dunglas/frankenphp:1-php8.4

RUN install-php-extensions pdo_mysql mbstring bcmath exif pcntl gd zip intl opcache

# The official FrankenPHP image sets cap_net_bind_service on the binary so
# it CAN bind privileged ports (<1024) like 80/443. Render's sandboxed
# runtime refuses to exec binaries carrying Linux capabilities at all —
# "Operation not permitted" — regardless of which port we actually use.
# We bind Render's assigned high port ($PORT, e.g. 10000), so the
# capability isn't needed; stripping it lets the binary run normally.
RUN apt-get update && apt-get install -y --no-install-recommends libcap2-bin \
    && setcap -r "$(which frankenphp)" \
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
COPY Caddyfile /etc/caddy/Caddyfile
COPY opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini

RUN composer dump-autoload --optimize \
    && mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

COPY docker-start.sh /usr/local/bin/docker-start.sh
RUN chmod +x /usr/local/bin/docker-start.sh

EXPOSE 10000
CMD ["/usr/local/bin/docker-start.sh"]