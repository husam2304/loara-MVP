<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureClinicEnabled
{
    /**
     * Block access for users whose clinic has been disabled by a platform admin.
     * Super admins are never bound to a clinic and are unaffected.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $clinic = $request->user()?->clinic;

        if ($clinic && ! $clinic->is_enabled) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect('/login')->withErrors([
                'email' => 'This clinic account has been disabled. Please contact support.',
            ]);
        }

        return $next($request);
    }
}
