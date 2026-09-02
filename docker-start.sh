#!/bin/sh
set -e

# Generate an APP_KEY only if one wasn't supplied via env vars (first boot safety net).
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --force
fi

# Re-link storage (ephemeral filesystem on free tiers, so this must run every boot).
php artisan storage:link || true

# Apply any pending migrations. Safe to run on every boot — Laravel tracks
# what's already been applied and skips it.
php artisan migrate --force

# Seed demo data (super admin + demo clinic) only on a genuinely empty
# database — Render's free tier restarts the container on every cold wake,
# so this must not re-run and duplicate demo rows on every restart.
NEEDS_SEED=$(php -r "
require 'vendor/autoload.php';
\$app = require 'bootstrap/app.php';
\$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
try {
    echo \App\Models\User::count() > 0 ? 'no' : 'yes';
} catch (\Throwable \$e) {
    echo 'no';
}
")
if [ "$NEEDS_SEED" = "yes" ]; then
    echo 'Empty database detected — seeding demo data (super admin: hiro@mail.com / password)...'
    php artisan db:seed --force
fi

# Cache config/routes for a faster boot (skip in local/dev).
if [ "$APP_ENV" != "local" ]; then
    php artisan config:cache
    php artisan route:cache
fi

PORT="${PORT:-10000}"
echo "Starting on port $PORT"
exec php artisan serve --host=0.0.0.0 --port="$PORT"
