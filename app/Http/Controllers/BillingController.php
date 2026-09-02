<?php

namespace App\Http\Controllers;

use App\Enums\BillingCycle;
use App\Enums\SubscriptionPlan;
use App\Enums\UsageType;
use App\Http\Requests\CheckoutRequest;
use App\Http\Requests\SwapPlanRequest;
use App\Models\PlanConfiguration;
use App\Services\SubscriptionService;
use App\Services\UsageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as BaseResponse;

class BillingController extends Controller
{
    public function __construct(
        private SubscriptionService $subscriptionService,
        private UsageService $usageService,
    ) {}

    public function index(Request $request): Response
    {
        $clinic = auth()->user()->clinic;

        // Stripe redirects back to this page with ?session_id=... after checkout.
        // The subscription is created asynchronously by the webhook, so it may not
        // exist locally yet. Flag that state so the UI shows a "finalizing" message
        // and polls instead of telling the buyer to subscribe again.
        $checkoutReturn = $request->filled('session_id');

        if (! $clinic) {
            $plans = PlanConfiguration::query()
                ->active()
                ->ordered()
                ->get()
                ->map(fn (PlanConfiguration $plan) => [
                    'key' => $plan->slug,
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'price_monthly' => (float) $plan->price_monthly,
                    'price_yearly' => (float) $plan->price_yearly,
                    'minutes_limit' => $plan->minutes_limit,
                    'concurrent_limit' => $plan->concurrent_limit,
                    'team_member_limit' => $plan->team_member_limit,
                    'features' => $plan->features,
                ]);

            return Inertia::render('Billing', [
                'subscription' => null,
                'plans' => $plans,
                'usage' => [
                    'minutes_used' => 0,
                    'minutes_limit' => 0,
                    'minutes_percentage' => 0,
                    'remaining_minutes' => 0,
                    'daily_usage' => [],
                ],
                'invoices' => collect(),
                'trialDays' => config('subscriptions.trial_days'),
            ]);
        }

        $subscription = $clinic->subscription;

        $plans = PlanConfiguration::query()
            ->active()
            ->ordered()
            ->get()
            ->map(fn (PlanConfiguration $plan) => [
                'key' => $plan->slug,
                'name' => $plan->name,
                'description' => $plan->description,
                'price_monthly' => (float) $plan->price_monthly,
                'price_yearly' => (float) $plan->price_yearly,
                'minutes_limit' => $plan->minutes_limit,
                'concurrent_limit' => $plan->concurrent_limit,
                'team_member_limit' => $plan->team_member_limit,
                'features' => $plan->features,
            ]);

        $usage = [
            'minutes_used' => $this->usageService->currentPeriodUsage($clinic, UsageType::AiCallMinutes),
            'minutes_limit' => $subscription?->minutes_limit ?? 0,
            'minutes_percentage' => $this->usageService->usagePercentage($clinic, UsageType::AiCallMinutes),
            'remaining_minutes' => $this->usageService->remainingMinutes($clinic),
            'daily_usage' => $this->usageService->dailyUsage($clinic, UsageType::AiCallMinutes, 30),
        ];

        $invoices = $subscription
            ? $subscription->invoices()->latest('paid_at')->limit(12)->get()
            : collect();

        return Inertia::render('Billing', [
            'subscription' => $subscription,
            'plans' => $plans,
            'usage' => $usage,
            'invoices' => $invoices,
            'trialDays' => config('subscriptions.trial_days'),
            'checkoutProcessing' => $checkoutReturn && ! ($subscription?->isActive() ?? false),
        ]);
    }

    public function checkout(CheckoutRequest $request): BaseResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        $plan = SubscriptionPlan::from($request->validated('plan'));
        $cycle = BillingCycle::from($request->validated('billing_cycle'));

        try {
            $checkoutUrl = $this->subscriptionService->createCheckoutSession($clinic, $plan, $cycle);

            return Inertia::location($checkoutUrl);
        } catch (\Exception $e) {
            return back()->with('error', 'Unable to create checkout session. Please try again.');
        }
    }

    public function portal(): BaseResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        if (! $clinic->subscription?->gateway_customer_id) {
            return back()->with('error', 'No active subscription. Please subscribe first.');
        }

        try {
            $portalUrl = $this->subscriptionService->createBillingPortalSession($clinic);

            return Inertia::location($portalUrl);
        } catch (\Exception $e) {
            return back()->with('error', 'Unable to open billing portal. Please try again.');
        }
    }

    public function cancel(): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        $subscription = $clinic->subscription;

        if (! $subscription) {
            return back()->with('error', 'No active subscription to cancel.');
        }

        try {
            $this->subscriptionService->cancel($subscription);

            return back()->with('success', 'Subscription will be cancelled at the end of your billing period.');
        } catch (\Exception $e) {
            return back()->with('error', 'Unable to cancel subscription. Please try again.');
        }
    }

    public function resume(): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        $subscription = $clinic->subscription;

        if (! $subscription) {
            return back()->with('error', 'No subscription to resume.');
        }

        try {
            $this->subscriptionService->resume($subscription);

            return back()->with('success', 'Subscription resumed successfully.');
        } catch (\Exception $e) {
            return back()->with('error', 'Unable to resume subscription. Please try again.');
        }
    }

    public function swap(SwapPlanRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        $subscription = $clinic->subscription;

        if (! $subscription) {
            return back()->with('error', 'No active subscription. Please subscribe first.');
        }

        $plan = SubscriptionPlan::from($request->validated('plan'));
        $cycle = BillingCycle::from($request->validated('billing_cycle'));

        try {
            $this->subscriptionService->swap($subscription, $plan, $cycle);

            return back()->with('success', 'Plan updated successfully.');
        } catch (\Exception $e) {
            return back()->with('error', 'Unable to change plan. Please try again.');
        }
    }
}
