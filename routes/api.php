<?php

use App\Http\Controllers\Api\Patient\PatientAuthController;
use App\Http\Controllers\Api\Public\PublicClinicController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\Api\VapiWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/webhooks/vapi', [VapiWebhookController::class, 'handleWebhook'])
    ->middleware('throttle:120,1')
    ->name('webhooks.vapi');

Route::post('/webhooks/stripe', [StripeWebhookController::class, 'handleWebhook'])
    ->middleware('throttle:120,1')
    ->name('webhooks.stripe');
// Public, unauthenticated clinic directory — consumed by the patient-facing
// mobile app. Rate-limited more tightly than the webhooks above since this is
// reachable by anyone, not just Vapi/Stripe's servers.
Route::prefix('public')->middleware('throttle:60,1')->name('public.')->group(function () {
    Route::get('/clinics', [PublicClinicController::class, 'index'])->name('clinics.index');
    Route::get('/clinics/{slug}', [PublicClinicController::class, 'show'])->name('clinics.show');
});

// Patient (mobile app) auth — Sanctum Bearer-token based, entirely separate
// from the staff cookie-session auth in routes/web.php. Login/register are
// tightly throttled (5/min) since they're unauthenticated and credential-
// guessable; the rest just needs a valid token.
Route::prefix('patient')->name('patient.')->group(function () {
    Route::middleware('throttle:5,1')->group(function () {
        Route::post('/register', [PatientAuthController::class, 'register'])->name('register');
        Route::post('/login', [PatientAuthController::class, 'login'])->name('login');
    });

    Route::middleware(['auth:sanctum', 'role:customer', 'throttle:60,1'])->group(function () {
        Route::post('/logout', [PatientAuthController::class, 'logout'])->name('logout');
        Route::get('/me', [PatientAuthController::class, 'me'])->name('me');
    });
});
