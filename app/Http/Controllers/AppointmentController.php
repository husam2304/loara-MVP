<?php

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Enums\WaitlistStatus;
use App\Http\Requests\CancelAppointmentRequest;
use App\Http\Requests\RescheduleAppointmentRequest;
use App\Http\Requests\StoreAppointmentRequest;
use App\Models\Appointment;
use App\Models\AppointmentType;
use App\Models\Patient;
use App\Models\Provider;
use App\Models\WaitlistEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function index(Request $request): Response
    {
        $clinic = $request->user()->clinic;

        if (! $clinic) {
            return Inertia::render('Appointments', [
                'providers' => collect(),
                'appointmentTypes' => collect(),
                'waitlistEntries' => collect(),
                'patients' => collect(),
                'stats' => [
                    'todayAppointmentCount' => 0,
                    'dateAppointmentCount' => 0,
                    'remainingCount' => 0,
                    'waitlistCount' => 0,
                    'noShowRate' => 0,
                    'noShowChange' => 'no change',
                    'avgDuration' => '--',
                ],
                'filters' => [
                    'date' => today()->toDateString(),
                    'view' => $request->input('view', 'day'),
                ],
            ]);
        }

        $date = $request->date('date') ?? today();
        $view = $request->input('view', 'day');

        if ($view === 'week') {
            $startDate = $date->copy()->startOfWeek(Carbon::MONDAY);
            $endDate = $startDate->copy()->addDays(6)->endOfDay();
        } else {
            $startDate = $date->copy()->startOfDay();
            $endDate = $date->copy()->endOfDay();
        }

        $excludedStatuses = [AppointmentStatus::Cancelled, AppointmentStatus::NoShow];

        $providers = Provider::query()
            ->where('clinic_id', $clinic->id)
            ->where('is_active', true)
            ->with([
                'appointments' => fn ($q) => $q
                    ->whereBetween('scheduled_at', [$startDate, $endDate])
                    ->with(['patient', 'appointmentType'])
                    ->orderBy('scheduled_at'),
                'schedules',
                'blockTimes' => fn ($q) => $q
                    ->where('start_at', '<=', $endDate)
                    ->where('end_at', '>=', $startDate),
            ])
            ->get();

        $appointmentTypes = AppointmentType::query()
            ->where('clinic_id', $clinic->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $waitlistEntries = WaitlistEntry::query()
            ->where('clinic_id', $clinic->id)
            ->where('status', WaitlistStatus::Waiting)
            ->with('patient')
            ->latest()
            ->get();

        $todayAppointmentCount = Appointment::query()
            ->where('clinic_id', $clinic->id)
            ->whereDate('scheduled_at', today())
            ->whereNotIn('status', $excludedStatuses)
            ->count();

        $dateAppointmentCount = Appointment::query()
            ->where('clinic_id', $clinic->id)
            ->whereBetween('scheduled_at', [$startDate, $endDate])
            ->whereNotIn('status', $excludedStatuses)
            ->count();

        $remainingCount = Appointment::query()
            ->where('clinic_id', $clinic->id)
            ->whereDate('scheduled_at', today())
            ->where('scheduled_at', '>', now())
            ->whereIn('status', [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed])
            ->count();

        // No-show rate: no_show / (completed + no_show) over last 30 days
        $thirtyDaysAgo = now()->subDays(30);
        $noShowCount = Appointment::query()
            ->where('clinic_id', $clinic->id)
            ->where('scheduled_at', '>=', $thirtyDaysAgo)
            ->where('status', AppointmentStatus::NoShow)
            ->count();
        $completedCount = Appointment::query()
            ->where('clinic_id', $clinic->id)
            ->where('scheduled_at', '>=', $thirtyDaysAgo)
            ->where('status', AppointmentStatus::Completed)
            ->count();
        $noShowDenominator = $completedCount + $noShowCount;
        $noShowRate = $noShowDenominator > 0 ? (int) round(($noShowCount / $noShowDenominator) * 100) : 0;

        // Compare with previous 30-day period
        $sixtyDaysAgo = now()->subDays(60);
        $prevNoShowCount = Appointment::query()
            ->where('clinic_id', $clinic->id)
            ->whereBetween('scheduled_at', [$sixtyDaysAgo, $thirtyDaysAgo])
            ->where('status', AppointmentStatus::NoShow)
            ->count();
        $prevCompletedCount = Appointment::query()
            ->where('clinic_id', $clinic->id)
            ->whereBetween('scheduled_at', [$sixtyDaysAgo, $thirtyDaysAgo])
            ->where('status', AppointmentStatus::Completed)
            ->count();
        $prevDenominator = $prevCompletedCount + $prevNoShowCount;
        $prevNoShowRate = $prevDenominator > 0 ? (int) round(($prevNoShowCount / $prevDenominator) * 100) : 0;
        $noShowDiff = $noShowRate - $prevNoShowRate;
        if ($noShowDiff === 0) {
            $noShowChange = 'no change';
        } elseif ($noShowDiff > 0) {
            $noShowChange = '↑ '.$noShowDiff.'%';
        } else {
            $noShowChange = '↓ '.abs($noShowDiff).'%';
        }

        // Avg duration from completed appointments this month
        $completedThisMonth = Appointment::query()
            ->where('clinic_id', $clinic->id)
            ->where('status', AppointmentStatus::Completed)
            ->where('scheduled_at', '>=', now()->startOfMonth())
            ->get(['scheduled_at', 'ends_at']);

        if ($completedThisMonth->isNotEmpty()) {
            $totalMinutes = $completedThisMonth->sum(fn ($a) => Carbon::parse($a->scheduled_at)->diffInMinutes(Carbon::parse($a->ends_at)));
            $avgDuration = (int) round($totalMinutes / $completedThisMonth->count()).'m';
        } else {
            $avgDuration = '--';
        }

        // Seed the picker with recent patients only; the typeahead fetches the rest
        // from /patients/search so we never ship the whole patient table.
        $patients = Patient::query()
            ->where('clinic_id', $clinic->id)
            ->where('status', 'active')
            ->latest()
            ->limit(20)
            ->get(['id', 'first_name', 'last_name']);

        return Inertia::render('Appointments', [
            'providers' => $providers,
            'appointmentTypes' => $appointmentTypes,
            'waitlistEntries' => $waitlistEntries,
            'patients' => $patients,
            'stats' => [
                'todayAppointmentCount' => $todayAppointmentCount,
                'dateAppointmentCount' => $dateAppointmentCount,
                'remainingCount' => $remainingCount,
                'waitlistCount' => $waitlistEntries->count(),
                'noShowRate' => $noShowRate,
                'noShowChange' => $noShowChange,
                'avgDuration' => $avgDuration,
            ],
            'filters' => [
                'date' => $date->toDateString(),
                'view' => $view,
            ],
        ]);
    }

    public function store(StoreAppointmentRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;
        $appointmentType = AppointmentType::findOrFail($request->validated('appointment_type_id'));
        $scheduledAt = Carbon::parse($request->validated('scheduled_at'));
        $endsAt = $scheduledAt->copy()->addMinutes($appointmentType->duration_minutes);

        if (Appointment::hasConflict($clinic->id, (int) $request->validated('provider_id'), $scheduledAt, $endsAt)) {
            return back()->withErrors([
                'scheduled_at' => 'This provider already has an appointment during the selected time. Please choose another slot.',
            ]);
        }

        Appointment::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $request->validated('patient_id'),
            'provider_id' => $request->validated('provider_id'),
            'appointment_type_id' => $appointmentType->id,
            'scheduled_at' => $scheduledAt,
            'ends_at' => $endsAt,
            'status' => AppointmentStatus::Scheduled,
            'source' => 'online',
            'room' => $request->validated('room'),
            'reason' => $request->validated('reason'),
            'notes' => $request->validated('notes'),
        ]);

        return redirect()->back()->with('success', 'Appointment created successfully.');
    }

    public function checkIn(Appointment $appointment): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $appointment->clinic_id !== $clinic->id) {
            abort(403);
        }

        if (! in_array($appointment->status, [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed])) {
            abort(422, 'Only scheduled or confirmed appointments can be checked in.');
        }

        $appointment->update(['status' => AppointmentStatus::CheckedIn]);

        return redirect()->back()->with('success', 'Patient checked in successfully.');
    }

    public function reschedule(RescheduleAppointmentRequest $request, Appointment $appointment): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic || $appointment->clinic_id !== $clinic->id) {
            abort(403);
        }

        if (! in_array($appointment->status, [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed])) {
            abort(422, 'Only scheduled or confirmed appointments can be rescheduled.');
        }

        $scheduledAt = Carbon::parse($request->validated('scheduled_at'));
        $appointmentType = $appointment->appointmentType;
        $endsAt = $scheduledAt->copy()->addMinutes($appointmentType->duration_minutes);
        $providerId = (int) ($request->validated('provider_id') ?? $appointment->provider_id);

        if (Appointment::hasConflict($clinic->id, $providerId, $scheduledAt, $endsAt, $appointment->id)) {
            return back()->withErrors([
                'scheduled_at' => 'This provider already has an appointment during the selected time. Please choose another slot.',
            ]);
        }

        $data = [
            'scheduled_at' => $scheduledAt,
            'ends_at' => $endsAt,
            'status' => AppointmentStatus::Scheduled,
        ];

        if ($request->validated('provider_id')) {
            $data['provider_id'] = $request->validated('provider_id');
        }

        if ($request->validated('reason')) {
            $existingNotes = $appointment->notes;
            $rescheduleNote = 'Rescheduled: '.$request->validated('reason');
            $data['notes'] = $existingNotes ? $existingNotes."\n".$rescheduleNote : $rescheduleNote;
        }

        $appointment->update($data);

        return redirect()->back()->with('success', 'Appointment rescheduled successfully.');
    }

    public function cancel(CancelAppointmentRequest $request, Appointment $appointment): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic || $appointment->clinic_id !== $clinic->id) {
            abort(403);
        }

        if ($appointment->status === AppointmentStatus::Cancelled) {
            abort(422, 'This appointment is already cancelled.');
        }

        $appointment->update([
            'status' => AppointmentStatus::Cancelled,
            'cancelled_at' => now(),
            'cancellation_reason' => $request->validated('cancellation_reason'),
        ]);

        return redirect()->back()->with('success', 'Appointment cancelled successfully.');
    }
}
