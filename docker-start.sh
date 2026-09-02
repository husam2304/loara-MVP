#!/bin/sh
set -e

# Generate an APP_KEY only if one wasn't supplied via env vars (first boot safety net).
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --force
fi

PORT="${PORT:-10000}"

# Bind the port immediately. Render's free tier kills the deploy if it
# doesn't detect an open port within a short scan window — migrations plus
# the full demo seed (14 seeders) can take longer than that window, so the
# server has to be listening *before* that work starts, not after.
echo "Starting on port $PORT"
php artisan serve --host=0.0.0.0 --port="$PORT" &
SERVER_PID=$!
sleep 2

# Re-link storage (ephemeral filesystem on free tiers, so this must run every boot).
php artisan storage:link || true

# Apply any pending migrations. Safe to run on every boot — Laravel tracks
# what's already been applied and skips it.
php artisan migrate --force

# Seed demo data (super admin + demo clinic) only on a genuinely empty
# database — Render's free tier restarts the container on every cold wake,
# so this must not re-run and duplicate demo rows on every restart.
# The whole seed run is wrapped in a DB transaction so a crash partway
# through (as happened once) rolls back cleanly instead of leaving orphaned
# rows that break a later retry. A seed failure here logs and moves on
# instead of tearing down the already-running server.
php -r "
require 'vendor/autoload.php';
\$app = require 'bootstrap/app.php';
\$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
\$kernel->bootstrap();

\$alreadySeeded = false;
try {
    \$alreadySeeded = \App\Models\User::count() > 0 || \App\Models\Clinic::count() > 0;
} catch (\Throwable \$e) {
    // Tables not reachable/ready — treat as not seeded, migrate already ran above.
}

if (\$alreadySeeded) {
    echo \"Database already has data — skipping seed.\n\";
    exit(0);
}

echo \"Empty database detected — seeding demo data (super admin: hiro@mail.com / password)...\n\";

try {
    \Illuminate\Support\Facades\DB::transaction(function () use (\$kernel) {
        \$kernel->call('db:seed', ['--force' => true]);
    });
    echo \"Seed complete.\n\";
} catch (\Throwable \$e) {
    echo \"Seed failed and was rolled back: \" . \$e->getMessage() . \"\n\";
    exit(1);
}
" || echo "Seeding step failed — app is still running, but log in and check /platform once fixed."

# Cache config/routes for a faster boot on future restarts (skip in local/dev).
if [ "$APP_ENV" != "local" ]; then
    php artisan config:cache || true
    php artisan route:cache || true
fi

echo "Startup tasks complete."
wait "$SERVER_PID"