<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    public function index(): Response
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic) {
            return Inertia::render('Admin/UserManagement', [
                'users' => collect(),
                'roleStats' => collect(),
                'totalUsers' => 0,
                'activeUsers' => 0,
            ]);
        }

        $users = User::query()
            ->where('clinic_id', $clinic->id)
            ->latest()
            ->get();

        $roleStats = $users->groupBy(fn (User $user) => $user->role->value)
            ->map->count();

        return Inertia::render('Admin/UserManagement', [
            'users' => $users,
            'roleStats' => $roleStats,
            'totalUsers' => $users->count(),
            'activeUsers' => $users->where('is_active', true)->count(),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        User::create([
            'clinic_id' => $clinic->id,
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'role' => $request->validated('role'),
            'title' => $request->validated('title'),
            'phone' => $request->validated('phone'),
            'password' => Hash::make(Str::random(32)),
            'is_active' => true,
        ]);

        return back()->with('success', 'User created successfully.');
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic || $user->clinic_id !== $clinic->id) {
            abort(403);
        }

        $validated = $request->validated();

        // Guard against locking the clinic out by demoting or deactivating its
        // last active owner (would leave nobody able to reach admin/settings/billing).
        if ($user->role === UserRole::ClinicOwner) {
            $demoting = isset($validated['role']) && $validated['role'] !== UserRole::ClinicOwner->value;
            $deactivating = array_key_exists('is_active', $validated) && ! $validated['is_active'];

            if (($demoting || $deactivating) && $this->isLastActiveOwner($clinic->id, $user->id)) {
                return back()->with('error', 'You cannot demote or deactivate the clinic\'s last owner. Assign another owner first.');
            }
        }

        $user->update($validated);

        return back()->with('success', 'User updated successfully.');
    }

    public function destroy(User $user): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $user->clinic_id !== $clinic->id) {
            abort(403);
        }

        if ($user->id === auth()->id()) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        if ($user->role === UserRole::ClinicOwner && $this->isLastActiveOwner($clinic->id, $user->id)) {
            return back()->with('error', 'You cannot delete the clinic\'s last owner. Assign another owner first.');
        }

        $user->delete();

        return back()->with('success', 'User deleted successfully.');
    }

    /**
     * True when {$excludeUserId} is the only remaining active clinic owner.
     */
    private function isLastActiveOwner(int $clinicId, int $excludeUserId): bool
    {
        return ! User::where('clinic_id', $clinicId)
            ->where('role', UserRole::ClinicOwner)
            ->where('is_active', true)
            ->whereKeyNot($excludeUserId)
            ->exists();
    }
}
