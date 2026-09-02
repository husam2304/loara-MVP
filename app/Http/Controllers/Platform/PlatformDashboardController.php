<?php

namespace App\Http\Controllers\Platform;

use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\ClinicSubscription;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class PlatformDashboardController extends Controller
{
    public function index(): Response
    {
        $totalClinics = Clinic::count();
        $totalUsers = User::whereNotNull('clinic_id')->count();
        $activeSubscriptions = ClinicSubscription::where('status', SubscriptionStatus::Active)->count();

        $monthlyRevenue = ClinicSubscription::query()
            ->whereIn('status', [SubscriptionStatus::Active, SubscriptionStatus::Trialing])
            ->sum('price_monthly');

        $recentClinics = Clinic::query()
            ->withCount('users')
            ->with('subscription')
            ->latest()
            ->limit(10)
            ->get(['id', 'name', 'email', 'phone', 'is_enabled', 'created_at']);

        return Inertia::render('Platform/Dashboard', [
            'stats' => [
                'totalClinics' => $totalClinics,
                'totalUsers' => $totalUsers,
                'activeSubscriptions' => $activeSubscriptions,
                'monthlyRevenue' => round((float) $monthlyRevenue, 2),
            ],
            'recentClinics' => $recentClinics,
        ]);
    }
}
