<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LoginController extends Controller
{
    public function showLoginForm(): Response
    {
        $demoMode = (bool) config('app.demo_mode');

        return Inertia::render('Auth/Login', [
            'demoMode' => $demoMode,
            'demoCredentials' => $demoMode ? [
                ['label' => 'Platform Admin', 'email' => 'loara@mail.com', 'password' => 'password'],
                ['label' => 'Clinic Owner', 'email' => 'clinic@mail.com', 'password' => 'password'],
            ] : [],
        ]);
    }

    public function login(LoginRequest $request): RedirectResponse
    {
        $throttleKey = Str::transliterate(Str::lower($request->string('email')).'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            throw ValidationException::withMessages([
                'email' => __('Too many login attempts. Please try again in :seconds seconds.', ['seconds' => $seconds]),
            ]);
        }

        if (! Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            RateLimiter::hit($throttleKey, 60);

            throw ValidationException::withMessages([
                'email' => __('These credentials do not match our records.'),
            ]);
        }

        RateLimiter::clear($throttleKey);

        if (! $request->user()->is_active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'email' => __('Your account has been deactivated.'),
            ]);
        }

        $clinic = $request->user()->clinic;
        if ($clinic && ! $clinic->is_enabled && ! $request->user()->isSuperAdmin()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'email' => __('This clinic account has been disabled. Please contact support.'),
            ]);
        }

        $request->session()->regenerate();

        $intended = $request->user()->isSuperAdmin() ? '/platform/dashboard' : '/dashboard';

        return redirect()->intended($intended);
    }

    public function logout(Request $request): RedirectResponse
    {
        $impersonatingFromId = $request->session()->get('impersonating_from');

        if ($impersonatingFromId) {
            $originalAdmin = User::findOrFail($impersonatingFromId);
            $request->session()->forget('impersonating_from');
            Auth::login($originalAdmin);

            $redirectTo = $originalAdmin->isSuperAdmin() ? '/platform/clinics' : '/admin/users';

            return redirect($redirectTo)
                ->with('success', 'Stopped impersonating. Welcome back!');
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
