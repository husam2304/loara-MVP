<?php

use App\Http\Middleware\CheckPlanFeature;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\EnsureActiveSubscription;
use App\Http\Middleware\EnsureClinicEnabled;
use App\Http\Middleware\EnsureClinicExists;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectIfNotInstalled;
use App\Http\Middleware\RedirectSuperAdmin;
use App\Http\Middleware\SetLocale;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(
            at: '*',
        );

        $middleware->web(prepend: [
            RedirectIfNotInstalled::class,

        ]);

        $middleware->web(append: [
            EnsureClinicExists::class,
            HandleInertiaRequests::class,
            SetLocale::class,

        ]);

        $middleware->alias([
            'subscribed' => EnsureActiveSubscription::class,
            'role' => CheckRole::class,
            'feature' => CheckPlanFeature::class,
            'verified' => EnsureEmailIsVerified::class,
            'redirect_super_admin' => RedirectSuperAdmin::class,
            'clinic_enabled' => EnsureClinicEnabled::class,
        ]);

        $middleware->redirectGuestsTo('/login');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();
