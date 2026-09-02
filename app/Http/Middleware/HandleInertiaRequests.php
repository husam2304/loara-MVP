<?php

namespace App\Http\Middleware;

use App\Enums\AppointmentStatus;
use App\Enums\CallStatus;
use App\Models\Appointment;
use App\Models\Call;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\FeatureGateService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'appName' => fn () => PlatformSetting::where('group', 'branding')->where('key', 'app_name')->value('value') ?? config('app.name', 'Loara'),
            'clinic' => fn () => $request->user()?->clinic?->load('operatingHours'),
            'auth' => [
                'user' => fn () => $request->user()
                    ? [
                        ...$request->user()->only(['id', 'name', 'email', 'role', 'avatar_url', 'title', 'is_active']),
                        'email_verified' => (bool) $request->user()->hasVerifiedEmail(),
                    ]
                    : null,
            ],
            'planFeatures' => function () use ($request) {
                $clinic = $request->user()?->clinic;
                if (! $clinic) {
                    return [];
                }

                return app(FeatureGateService::class)->getClinicFeatures($clinic);
            },
            'impersonating' => function () use ($request) {
                $adminId = $request->session()->get('impersonating_from');
                if (! $adminId) {
                    return null;
                }

                $admin = User::find($adminId);

                return $admin ? [
                    'admin_name' => $admin->name,
                    'admin_id' => $admin->id,
                ] : null;
            },
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'outbound_calls' => fn () => $request->session()->get('outbound_calls'),
                'billing_warning' => fn () => $request->session()->get('billing_warning'),
            ],
            'notifications' => function () use ($request) {
                $clinic = $request->user()?->clinic;
                if (! $clinic) {
                    return [];
                }

                $items = collect();

                // Missed calls from last 24 hours
                Call::where('clinic_id', $clinic->id)
                    ->where('status', CallStatus::Missed)
                    ->where('started_at', '>=', now()->subDay())
                    ->with('patient:id,first_name,last_name')
                    ->latest('started_at')
                    ->limit(5)
                    ->get()
                    ->each(function ($call) use ($items) {
                        $name = $call->patient
                            ? "{$call->patient->first_name} {$call->patient->last_name}"
                            : ($call->caller_name ?? $call->caller_phone);
                        $items->push([
                            'id' => "call-{$call->id}",
                            'type' => 'missed_call',
                            'title' => "Missed call from {$name}",
                            'time' => $call->started_at->toIso8601String(),
                            'url' => '/call-center',
                        ]);
                    });

                // Cancelled appointments from last 24 hours
                Appointment::where('clinic_id', $clinic->id)
                    ->where('status', AppointmentStatus::Cancelled)
                    ->where('cancelled_at', '>=', now()->subDay())
                    ->with('patient:id,first_name,last_name')
                    ->latest('cancelled_at')
                    ->limit(5)
                    ->get()
                    ->each(function ($appt) use ($items) {
                        $name = $appt->patient
                            ? "{$appt->patient->first_name} {$appt->patient->last_name}"
                            : 'Unknown patient';
                        $items->push([
                            'id' => "appt-cancel-{$appt->id}",
                            'type' => 'cancelled_appointment',
                            'title' => "{$name} cancelled appointment",
                            'time' => $appt->cancelled_at->toIso8601String(),
                            'url' => '/appointments',
                        ]);
                    });

                // Upcoming appointments in next 30 minutes
                Appointment::where('clinic_id', $clinic->id)
                    ->whereIn('status', [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed])
                    ->whereBetween('scheduled_at', [now(), now()->addMinutes(30)])
                    ->with(['patient:id,first_name,last_name', 'provider:id,first_name,last_name,title'])
                    ->orderBy('scheduled_at')
                    ->limit(5)
                    ->get()
                    ->each(function ($appt) use ($items) {
                        $name = $appt->patient
                            ? "{$appt->patient->first_name} {$appt->patient->last_name}"
                            : 'Unknown patient';
                        $provider = $appt->provider
                            ? " with {$appt->provider->title} {$appt->provider->last_name}"
                            : '';
                        $items->push([
                            'id' => "appt-soon-{$appt->id}",
                            'type' => 'upcoming_appointment',
                            'title' => "{$name}{$provider} in ".$appt->scheduled_at->diffForHumans(),
                            'time' => $appt->scheduled_at->toIso8601String(),
                            'url' => '/appointments',
                        ]);
                    });

                return $items->sortByDesc('time')->values()->take(10);
            },
            'locale' => app()->getLocale(),

        ];
    }
}
