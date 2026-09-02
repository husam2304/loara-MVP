<?php

namespace App\Http\Controllers;

use App\Enums\PatientSource;
use App\Enums\PatientStatus;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Models\AppointmentType;
use App\Models\Patient;
use App\Models\Provider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    public function index(Request $request): Response
    {
        $clinic = $request->user()->clinic;

        if (! $clinic) {
            return Inertia::render('Patients', [
                'patients' => new LengthAwarePaginator([], 0, 15),
                'stats' => [
                    'totalPatients' => 0,
                    'activePatients' => 0,
                    'newThisMonth' => 0,
                ],
                'filters' => [
                    'search' => $request->input('search', ''),
                    'status' => $request->input('status', ''),
                ],
            ]);
        }

        $query = Patient::query()
            ->where('clinic_id', $clinic->id)
            ->with(['insurancePolicies' => fn ($q) => $q->where('is_primary', true)->with('insuranceProvider')])
            ->withMax('appointments', 'scheduled_at');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $patients = $query->latest()->paginate(15)->withQueryString();

        $totalPatients = Patient::where('clinic_id', $clinic->id)->count();
        $activePatients = Patient::where('clinic_id', $clinic->id)->where('status', PatientStatus::Active)->count();
        $newThisMonth = Patient::where('clinic_id', $clinic->id)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        return Inertia::render('Patients', [
            'patients' => $patients,
            'stats' => [
                'totalPatients' => $totalPatients,
                'activePatients' => $activePatients,
                'newThisMonth' => $newThisMonth,
            ],
            'filters' => [
                'search' => $request->input('search', ''),
                'status' => $request->input('status', ''),
            ],
        ]);
    }

    public function store(StorePatientRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        $clinic->patients()->create([
            ...$request->validated(),
            'source' => PatientSource::WalkIn,
        ]);

        return redirect()->back()->with('success', 'Patient added successfully.');
    }

    /**
     * Typeahead lookup for the appointment / insurance patient pickers.
     * Returns at most 20 clinic-scoped active patients matching the query so the
     * frontend never has to load the full patient table to pick one.
     */
    public function search(Request $request): JsonResponse
    {
        $clinic = $request->user()->clinic;

        $q = trim((string) $request->query('q', ''));

        if (! $clinic || $q === '') {
            return response()->json(['patients' => []]);
        }

        $patients = Patient::query()
            ->where('clinic_id', $clinic->id)
            ->where('status', PatientStatus::Active)
            ->where(function ($query) use ($q) {
                $query->where('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%");

                // Support "first last" queries without DB-specific concat syntax.
                $parts = preg_split('/\s+/', $q);
                if (is_array($parts) && count($parts) >= 2) {
                    $query->orWhere(function ($sub) use ($parts) {
                        $sub->where('first_name', 'like', "%{$parts[0]}%")
                            ->where('last_name', 'like', "%{$parts[1]}%");
                    });
                }
            })
            ->with(['insurancePolicies.insuranceProvider'])
            ->orderBy('last_name')
            ->limit(20)
            ->get(['id', 'first_name', 'last_name']);

        return response()->json(['patients' => $patients]);
    }

    public function show(Patient $patient): Response
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $patient->clinic_id !== $clinic->id) {
            abort(403);
        }

        $patient->load([
            'allergies',
            'medications' => fn ($q) => $q->where('is_active', true),
            'vitals' => fn ($q) => $q->latest('recorded_at')->limit(1),
            'insurancePolicies' => fn ($q) => $q->where('is_primary', true)->with('insuranceProvider'),
            'appointments' => fn ($q) => $q->where('scheduled_at', '>=', now())
                ->with('provider', 'appointmentType')
                ->orderBy('scheduled_at')
                ->limit(5),
        ]);

        $timeline = collect()
            ->merge(
                $patient->appointments()
                    ->with('provider', 'appointmentType')
                    ->where('scheduled_at', '<', now())
                    ->latest('scheduled_at')
                    ->limit(10)
                    ->get()
                    ->map(fn ($apt) => [
                        'id' => $apt->id,
                        'date' => $apt->scheduled_at->toDateString(),
                        'date_formatted' => $apt->scheduled_at->format('M j'),
                        'date_long' => $apt->scheduled_at->format('F j, Y'),
                        'type' => 'visit',
                        'title' => 'Office Visit',
                        'subtitle' => ($apt->appointmentType?->name ?? 'Appointment').($apt->provider ? ' — '.$apt->provider->full_name : ''),
                    ])
            )
            ->merge(
                $patient->calls()
                    ->latest('started_at')
                    ->limit(10)
                    ->get()
                    ->map(fn ($call) => [
                        'id' => 'call-'.$call->id,
                        'date' => $call->started_at->toDateString(),
                        'date_formatted' => $call->started_at->format('M j'),
                        'date_long' => $call->started_at->format('F j, Y'),
                        'type' => 'ai-call',
                        'title' => 'AI Call',
                        'subtitle' => ucfirst(str_replace('_', ' ', $call->type->value)).
                            ($call->summary ? ' — '.Str::limit($call->summary, 50) : ''),
                    ])
            )
            ->sortByDesc('date')
            ->values()
            ->take(10);

        $latestVitals = $patient->vitals->first();

        $providers = Provider::query()
            ->where('clinic_id', $clinic->id)
            ->where('is_active', true)
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name', 'title', 'specialty']);

        $appointmentTypes = AppointmentType::query()
            ->where('clinic_id', $clinic->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'duration_minutes']);

        return Inertia::render('PatientDetail', [
            'patient' => $patient,
            'timeline' => $timeline,
            'upcomingAppointments' => $patient->appointments,
            'medications' => $patient->medications,
            'vitals' => $latestVitals ? [
                'heart_rate' => $latestVitals->heart_rate,
                'blood_pressure_systolic' => $latestVitals->blood_pressure_systolic,
                'blood_pressure_diastolic' => $latestVitals->blood_pressure_diastolic,
                'temperature' => $latestVitals->temperature,
                'weight' => $latestVitals->weight,
                'oxygen_saturation' => $latestVitals->oxygen_saturation,
            ] : null,
            'allergies' => $patient->allergies,
            'insurance' => $patient->insurancePolicies->first(),
            'providers' => $providers,
            'appointmentTypes' => $appointmentTypes,
        ]);
    }

    public function update(UpdatePatientRequest $request, Patient $patient): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic || $patient->clinic_id !== $clinic->id) {
            abort(403);
        }

        $patient->update($request->validated());

        return redirect()->back()->with('success', 'Patient updated successfully.');
    }
}
