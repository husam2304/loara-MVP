<?php

namespace App\Http\Controllers;

use App\Enums\CallResolution;
use App\Enums\CallSentiment;
use App\Enums\CallStatus;
use App\Models\Call;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function index(): Response
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic) {
            return Inertia::render('Analytics', [
                'stats' => [
                    'totalCalls' => 0,
                    'aiResolutionRate' => 0,
                    'avgHandleSeconds' => 0,
                    'patientSatisfaction' => 0,
                ],
                'volumeData' => [],
                'aiMetrics' => [
                    'intentRecognition' => 0,
                    'sentimentAnalysis' => 0,
                    'responseQuality' => 0,
                ],
                'categories' => [],
                'topIntents' => [],
            ]);
        }

        $monthStart = now()->startOfMonth();

        // Stats
        $totalCallsMonth = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $monthStart)
            ->count();

        $resolvedCallsMonth = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $monthStart)
            ->where('resolution', CallResolution::Resolved)
            ->count();

        $completedCallsMonth = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $monthStart)
            ->where('status', CallStatus::Completed)
            ->count();

        $aiResolutionRate = $completedCallsMonth > 0
            ? round(($resolvedCallsMonth / $completedCallsMonth) * 100, 1)
            : 0;

        $avgHandleSeconds = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $monthStart)
            ->whereNotNull('duration_seconds')
            ->where('duration_seconds', '>', 0)
            ->avg('duration_seconds');

        $positiveSentiment = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $monthStart)
            ->where('status', CallStatus::Completed)
            ->where('sentiment', CallSentiment::Positive)
            ->count();

        $totalSentimentCalls = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $monthStart)
            ->where('status', CallStatus::Completed)
            ->whereNotNull('sentiment')
            ->count();

        $satisfactionScore = $totalSentimentCalls > 0
            ? round(($positiveSentiment / $totalSentimentCalls) * 5, 1)
            : 0;

        // Call volume trends (last 7 days)
        $volumeData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dayStart = $date->copy()->startOfDay();
            $dayEnd = $date->copy()->endOfDay();

            $total = Call::where('clinic_id', $clinic->id)
                ->whereBetween('started_at', [$dayStart, $dayEnd])
                ->count();

            $resolved = Call::where('clinic_id', $clinic->id)
                ->whereBetween('started_at', [$dayStart, $dayEnd])
                ->where('resolution', CallResolution::Resolved)
                ->count();

            $escalated = Call::where('clinic_id', $clinic->id)
                ->whereBetween('started_at', [$dayStart, $dayEnd])
                ->where('resolution', CallResolution::Escalated)
                ->count();

            $volumeData[] = [
                'day' => $date->format('D'),
                'date' => $date->toDateString(),
                'total' => $total,
                'resolved' => $resolved,
                'escalated' => $escalated,
            ];
        }

        // AI performance metrics
        $avgConfidence = Call::where('clinic_id', $clinic->id)
            ->where('status', CallStatus::Completed)
            ->where('ai_handled', true)
            ->whereNotNull('ai_confidence_score')
            ->avg('ai_confidence_score');

        $neutralSentiment = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $monthStart)
            ->where('status', CallStatus::Completed)
            ->where('sentiment', CallSentiment::Neutral)
            ->count();

        $sentimentAccuracy = $totalSentimentCalls > 0
            ? round((($positiveSentiment + $neutralSentiment) / $totalSentimentCalls) * 100, 1)
            : 0;

        $responseQuality = $completedCallsMonth > 0
            ? round(($resolvedCallsMonth / $completedCallsMonth) * 100, 1)
            : 0;

        // Call categories (by type, this month)
        $callsByType = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $monthStart)
            ->selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type')
            ->toArray();

        $totalByType = array_sum($callsByType);
        $categories = [];
        $typeLabels = [
            'appointment' => 'Appointments',
            'prescription' => 'Prescriptions',
            'billing' => 'Billing Inquiries',
            'triage' => 'Urgent / Triage',
            'insurance' => 'Insurance',
            'general' => 'General',
            'follow_up' => 'Follow-up',
            'reminder' => 'Reminder',
        ];
        $typeColors = [
            'appointment' => '#22C55E',
            'prescription' => '#3B82F6',
            'billing' => '#F59E0B',
            'triage' => '#EF4444',
            'insurance' => '#8B5CF6',
            'general' => '#71717A',
            'follow_up' => '#22D3EE',
            'reminder' => '#F472B6',
        ];

        foreach ($callsByType as $type => $count) {
            $categories[] = [
                'label' => $typeLabels[$type] ?? ucfirst($type),
                'value' => $totalByType > 0 ? round(($count / $totalByType) * 100) : 0,
                'color' => $typeColors[$type] ?? '#71717A',
            ];
        }

        usort($categories, fn ($a, $b) => $b['value'] <=> $a['value']);

        // Top intents (call types by count)
        $topIntents = [];
        arsort($callsByType);
        foreach (array_slice($callsByType, 0, 5, true) as $type => $count) {
            $topIntents[] = [
                'label' => $typeLabels[$type] ?? ucfirst($type),
                'count' => $count,
            ];
        }

        return Inertia::render('Analytics', [
            'stats' => [
                'totalCalls' => $totalCallsMonth,
                'aiResolutionRate' => $aiResolutionRate,
                'avgHandleSeconds' => $avgHandleSeconds ? round($avgHandleSeconds) : 0,
                'patientSatisfaction' => $satisfactionScore,
            ],
            'volumeData' => $volumeData,
            'aiMetrics' => [
                'intentRecognition' => $avgConfidence ? round($avgConfidence * 100, 1) : 0,
                'sentimentAnalysis' => $sentimentAccuracy,
                'responseQuality' => $responseQuality,
            ],
            'categories' => $categories,
            'topIntents' => $topIntents,
        ]);
    }
}
