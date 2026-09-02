<?php

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Enums\CallDirection;
use App\Enums\CallResolution;
use App\Enums\CallSentiment;
use App\Enums\CallStatus;
use App\Models\Appointment;
use App\Models\Call;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic) {
            return Inertia::render('Dashboard', [
                'stats' => [
                    'callsToday' => 0,
                    'appointmentsToday' => 0,
                    'avgResponseTime' => 0,
                    'resolutionRate' => 0,
                ],
                'callActivity' => [],
                'recentCalls' => collect(),
                'upcomingAppointments' => collect(),
                'aiPerformance' => [
                    'intentRecognition' => 0,
                    'callCompletion' => 0,
                    'patientSatisfaction' => 0,
                ],
            ]);
        }
        $todayStart = now()->startOfDay();

        // Stats
        $callsToday = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $todayStart)
            ->count();

        $appointmentsToday = Appointment::where('clinic_id', $clinic->id)
            ->whereDate('scheduled_at', today())
            ->count();

        $avgDurationSeconds = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $todayStart)
            ->whereNotNull('duration_seconds')
            ->where('duration_seconds', '>', 0)
            ->avg('duration_seconds');

        $totalResolved = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $todayStart)
            ->where('status', CallStatus::Completed)
            ->count();

        $resolvedSuccessfully = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $todayStart)
            ->where('resolution', CallResolution::Resolved)
            ->count();

        $resolutionRate = $totalResolved > 0
            ? round(($resolvedSuccessfully / $totalResolved) * 100, 1)
            : 0;

        // Call activity — last 7 days
        $callActivity = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dayStart = $date->copy()->startOfDay();
            $dayEnd = $date->copy()->endOfDay();

            $inbound = Call::where('clinic_id', $clinic->id)
                ->where('direction', CallDirection::Inbound)
                ->whereBetween('started_at', [$dayStart, $dayEnd])
                ->count();

            $outbound = Call::where('clinic_id', $clinic->id)
                ->where('direction', CallDirection::Outbound)
                ->whereBetween('started_at', [$dayStart, $dayEnd])
                ->count();

            $callActivity[] = [
                'day' => $date->format('D'),
                'date' => $date->toDateString(),
                'inbound' => $inbound,
                'outbound' => $outbound,
            ];
        }

        // Recent calls
        $recentCalls = Call::where('clinic_id', $clinic->id)
            ->with('patient')
            ->latest('started_at')
            ->limit(5)
            ->get();

        // Upcoming appointments
        $upcomingAppointments = Appointment::where('clinic_id', $clinic->id)
            ->where('scheduled_at', '>=', now())
            ->whereIn('status', [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed])
            ->with(['patient', 'provider', 'appointmentType'])
            ->orderBy('scheduled_at')
            ->limit(4)
            ->get();

        // AI performance metrics
        $completedCalls = Call::where('clinic_id', $clinic->id)
            ->where('status', CallStatus::Completed)
            ->where('ai_handled', true);

        $totalAiCalls = (clone $completedCalls)->count();

        $avgConfidence = (clone $completedCalls)
            ->whereNotNull('ai_confidence_score')
            ->avg('ai_confidence_score');

        $callCompletionTotal = Call::where('clinic_id', $clinic->id)->count();
        $callCompletionCompleted = Call::where('clinic_id', $clinic->id)
            ->where('status', CallStatus::Completed)
            ->count();

        $callCompletionRate = $callCompletionTotal > 0
            ? round(($callCompletionCompleted / $callCompletionTotal) * 100, 1)
            : 0;

        $avgSentimentScore = Call::where('clinic_id', $clinic->id)
            ->where('status', CallStatus::Completed)
            ->where('sentiment', CallSentiment::Positive)
            ->count();

        $totalSentimentCalls = Call::where('clinic_id', $clinic->id)
            ->where('status', CallStatus::Completed)
            ->whereNotNull('sentiment')
            ->count();

        $satisfactionRate = $totalSentimentCalls > 0
            ? round(($avgSentimentScore / $totalSentimentCalls) * 5, 1)
            : 0;

        return Inertia::render('Dashboard', [
            'stats' => [
                'callsToday' => $callsToday,
                'appointmentsToday' => $appointmentsToday,
                'avgResponseTime' => $avgDurationSeconds ? round($avgDurationSeconds, 1) : 0,
                'resolutionRate' => $resolutionRate,
            ],
            'callActivity' => $callActivity,
            'recentCalls' => $recentCalls,
            'upcomingAppointments' => $upcomingAppointments,
            'aiPerformance' => [
                'intentRecognition' => $avgConfidence ? round($avgConfidence * 100, 1) : 0,
                'callCompletion' => $callCompletionRate,
                'patientSatisfaction' => $satisfactionRate,
            ],
        ]);
    }
}
