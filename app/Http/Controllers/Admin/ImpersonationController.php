<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class ImpersonationController extends Controller
{
    public function start(User $user): RedirectResponse
    {
        $admin = Auth::user();

        if (session()->has('impersonating_from')) {
            return back()->with('error', 'You are already impersonating a user. Stop the current session first.');
        }

        if ($user->id === $admin->id) {
            return back()->with('error', 'You cannot impersonate yourself.');
        }

        if ($user->isSuperAdmin()) {
            return back()->with('error', 'You cannot impersonate another super admin.');
        }

        // SuperAdmin can impersonate any user across clinics
        // ClinicOwner can only impersonate users in their own clinic
        if (! $admin->isSuperAdmin()) {
            if (! $admin->clinic || $user->clinic_id !== $admin->clinic_id) {
                abort(403);
            }
        }

        session()->put('impersonating_from', $admin->id);

        AuditLog::create([
            'clinic_id' => $user->clinic_id,
            'user_id' => $admin->id,
            'action' => 'impersonation_started',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'description' => "{$admin->name} started impersonating {$user->name} ({$user->role->value})",
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'status' => AuditStatus::Success,
            'created_at' => now(),
        ]);

        Auth::login($user);

        return redirect()->route('dashboard')
            ->with('success', "Now impersonating {$user->name}.");
    }

    public function stop(): RedirectResponse
    {
        $impersonatingFromId = session('impersonating_from');

        if (! $impersonatingFromId) {
            return redirect()->route('dashboard')
                ->with('error', 'You are not currently impersonating anyone.');
        }

        $originalAdmin = User::findOrFail($impersonatingFromId);
        $impersonatedUser = Auth::user();
        $clinic = $impersonatedUser->clinic;

        session()->forget('impersonating_from');

        AuditLog::create([
            'clinic_id' => $clinic->id,
            'user_id' => $originalAdmin->id,
            'action' => 'impersonation_stopped',
            'auditable_type' => User::class,
            'auditable_id' => $impersonatedUser->id,
            'description' => "{$originalAdmin->name} stopped impersonating {$impersonatedUser->name}",
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'status' => AuditStatus::Success,
            'created_at' => now(),
        ]);

        Auth::login($originalAdmin);

        $redirectTo = $originalAdmin->isSuperAdmin() ? '/platform/clinics' : '/admin/users';

        return redirect($redirectTo)
            ->with('success', "Stopped impersonating {$impersonatedUser->name}. Welcome back!");
    }
}
