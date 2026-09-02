<?php

namespace App\Http\Middleware;

use App\Models\Clinic;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureClinicExists
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('install', 'install/*', 'register*', 'login', 'logout', 'forgot-password', 'reset-password*', 'email/*', 'platform*')) {
            return $next($request);
        }

        if (! Clinic::exists()) {
            abort(503, 'No clinic configured. Please run database seeders.');
        }

        return $next($request);
    }
}
