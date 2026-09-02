<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfNotInstalled
{
    /**
     * Force first-run buyers through the web installer until it completes.
     * The test suite always runs against a fully migrated database, so the
     * `testing` environment is treated as already installed.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $installed = app()->environment('testing') || file_exists(storage_path('installed')) || $this->databaseIsReady();

        // Already installed: keep buyers out of the installer.
        if ($installed) {
            if ($request->is('install', 'install/*')) {
                return redirect('/');
            }

            return $next($request);
        }

        // Not installed: allow only the installer and its assets through.
        if ($request->is('install', 'install/*')) {
            return $next($request);
        }

        return redirect('/install');
    }

    /**
     * Treat the app as installed when the database is reachable and migrated
     * (handles manual installs done via composer + artisan migrate, without the
     * wizard). Writes the lock file so subsequent requests skip the DB check.
     */
    private function databaseIsReady(): bool
    {
        try {
            if (Schema::hasTable('users')) {
                @file_put_contents(storage_path('installed'), 'detected installed at '.now()->toIso8601String().PHP_EOL);

                return true;
            }
        } catch (\Throwable) {
            // Database not configured/reachable yet — fall through to the installer.
        }

        return false;
    }
}
