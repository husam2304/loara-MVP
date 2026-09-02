<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PlatformClinicController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Clinic::query()
            ->withCount('users')
            ->with('subscription');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $clinics = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('Platform/Clinics', [
            'clinics' => $clinics,
            'filters' => ['search' => $search],
        ]);
    }

    public function show(Clinic $clinic): Response
    {
        $clinic->load(['subscription', 'aiConfiguration']);

        $users = $clinic->users()
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'is_active', 'last_active_at']);

        return Inertia::render('Platform/ClinicDetail', [
            'clinic' => $clinic,
            'users' => $users,
        ]);
    }

    public function toggleEnabled(Clinic $clinic): RedirectResponse
    {
        $clinic->update(['is_enabled' => ! $clinic->is_enabled]);

        $status = $clinic->is_enabled ? 'enabled' : 'disabled';

        return back()->with('success', "Clinic {$status} successfully.");
    }

    public function impersonate(Clinic $clinic, User $user): RedirectResponse
    {
        $admin = Auth::user();

        if ($user->clinic_id !== $clinic->id) {
            abort(403, 'User does not belong to this clinic.');
        }

        if ($user->isSuperAdmin()) {
            return back()->with('error', 'Cannot impersonate another super admin.');
        }

        if (session()->has('impersonating_from')) {
            return back()->with('error', 'Already impersonating a user.');
        }

        session()->put('impersonating_from', $admin->id);

        AuditLog::create([
            'clinic_id' => $clinic->id,
            'user_id' => $admin->id,
            'action' => 'impersonation_started',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'description' => "Super admin {$admin->name} started impersonating {$user->name}",
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'status' => 'success',
        ]);

        Auth::login($user);

        return redirect('/dashboard')->with('success', "Now viewing as {$user->name}");
    }
}
