<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProviderRequest;
use App\Http\Requests\UpdateProviderRequest;
use App\Models\Appointment;
use App\Models\Provider;
use App\Models\ProviderSchedule;
use App\Services\FeatureGateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class ProviderController extends Controller
{
    public function index(Request $request): Response
    {
        $clinic = $request->user()->clinic;

        if (! $clinic) {
            return Inertia::render('Providers', [
                'providers' => new LengthAwarePaginator([], 0, 15),
                'stats' => [
                    'totalProviders' => 0,
                    'activeProviders' => 0,
                    'specialtyCount' => 0,
                    'avgAppointmentsPerWeek' => 0,
                ],
                'specialties' => [],
                'filters' => [
                    'search' => '',
                    'specialty' => '',
                    'status' => '',
                ],
            ]);
        }

        $query = Provider::query()
            ->where('clinic_id', $clinic->id)
            ->with('schedules')
            ->withCount(['appointments', 'patients']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('specialty', 'like', "%{$search}%")
                    ->orWhere('npi_number', 'like', "%{$search}%");
            });
        }

        if ($specialty = $request->input('specialty')) {
            $query->where('specialty', $specialty);
        }

        if ($request->has('status')) {
            $query->where('is_active', $request->input('status') === 'active');
        }

        $providers = $query->latest()->paginate(15)->withQueryString();

        $totalProviders = Provider::where('clinic_id', $clinic->id)->count();
        $activeProviders = Provider::where('clinic_id', $clinic->id)->where('is_active', true)->count();

        $specialties = Provider::where('clinic_id', $clinic->id)
            ->distinct()
            ->pluck('specialty')
            ->sort()
            ->values();

        $avgAppointmentsPerWeek = 0;
        if ($activeProviders > 0) {
            $totalAppointments = Appointment::where('clinic_id', $clinic->id)
                ->where('scheduled_at', '>=', now()->subDays(30))
                ->whereHas('provider', fn ($q) => $q->where('is_active', true))
                ->count();

            $avgAppointmentsPerWeek = round($totalAppointments / 4.3);
        }

        return Inertia::render('Providers', [
            'providers' => $providers,
            'stats' => [
                'totalProviders' => $totalProviders,
                'activeProviders' => $activeProviders,
                'specialtyCount' => $specialties->count(),
                'avgAppointmentsPerWeek' => $avgAppointmentsPerWeek,
            ],
            'specialties' => $specialties,
            'filters' => [
                'search' => $request->input('search', ''),
                'specialty' => $request->input('specialty', ''),
                'status' => $request->input('status', ''),
            ],
        ]);
    }

    public function store(StoreProviderRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        if (app(FeatureGateService::class)->isTeamMemberLimitExceeded($clinic)) {
            return back()->with('error', 'Your plan\'s team member limit has been reached. Please upgrade your plan to add more providers.');
        }

        $provider = Provider::create([
            'clinic_id' => $clinic->id,
            'first_name' => $request->validated('first_name'),
            'last_name' => $request->validated('last_name'),
            'title' => $request->validated('title'),
            'specialty' => $request->validated('specialty'),
            'npi_number' => $request->validated('npi_number'),
            'color' => $request->validated('color'),
        ]);

        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        foreach ($days as $index => $day) {
            ProviderSchedule::create([
                'provider_id' => $provider->id,
                'day_of_week' => $index,
                'start_time' => '09:00',
                'end_time' => '17:00',
                'is_available' => $index >= 1 && $index <= 5,
            ]);
        }

        return redirect()->back()->with('success', 'Provider created successfully.');
    }

    public function update(UpdateProviderRequest $request, Provider $provider): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic || $provider->clinic_id !== $clinic->id) {
            abort(403);
        }

        $provider->update($request->safe()->except('schedules'));

        if ($request->has('schedules')) {
            $provider->schedules()->delete();

            foreach ($request->validated('schedules') as $schedule) {
                ProviderSchedule::create([
                    'provider_id' => $provider->id,
                    'day_of_week' => $schedule['day_of_week'],
                    'start_time' => $schedule['start_time'],
                    'end_time' => $schedule['end_time'],
                    'is_available' => $schedule['is_available'],
                ]);
            }
        }

        return redirect()->back()->with('success', 'Provider updated successfully.');
    }

    public function destroy(Provider $provider): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $provider->clinic_id !== $clinic->id) {
            abort(403);
        }

        $provider->delete();

        return redirect()->back()->with('success', 'Provider deleted successfully.');
    }
}
