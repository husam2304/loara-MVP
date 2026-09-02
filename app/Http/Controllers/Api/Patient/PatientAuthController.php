<?php

namespace App\Http\Controllers\Api\Patient;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Authentication for the patient-facing mobile app — deliberately separate
 * from the staff auth flow (Auth\RegisterController /
 * Auth\LoginController). Mobile clients authenticate with a Bearer token
 * (Sanctum personal access token), not a cookie session — staff and patient
 * auth are two different mechanisms on purpose, since a mobile app can't do
 * cookie-based session auth cleanly and shouldn't share a session guard
 * with the staff web app anyway.
 *
 * Every account created or authenticated here is forced to the `customer`
 * role with clinic_id = null (mirroring how SuperAdmin already has no
 * clinic_id) — a mobile patient is not scoped to one clinic, they browse
 * the public directory and can contact any publicly-listed clinic.
 */
class PatientAuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => UserRole::Customer,
            'clinic_id' => null,
            'is_active' => true,
        ]);

        event(new Registered($user));

        $token = $user->createToken('patient-mobile-app', ['patient']);

        return response()->json([
            'user' => $this->formatUser($user),
            'token' => $token->plainTextToken,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        // A valid password alone isn't enough — this endpoint is for patients
        // only. A clinic staff member's credentials being valid here would
        // otherwise let them mint a patient-scoped token for their staff
        // account, which is a role-confusion risk worth blocking explicitly
        // rather than assuming "authenticated" implies "allowed here".
        if ($user->role !== UserRole::Customer) {
            throw ValidationException::withMessages([
                'email' => ['This account is not a patient account.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated.'],
            ]);
        }

        $tokenName = $validated['device_name'] ?? 'patient-mobile-app';
        $token = $user->createToken($tokenName, ['patient']);

        return response()->json([
            'user' => $this->formatUser($user),
            'token' => $token->plainTextToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->formatUser($request->user()),
        ]);
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
        ];
    }
}
