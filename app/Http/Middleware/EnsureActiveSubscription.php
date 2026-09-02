<?php

namespace App\Http\Middleware;

use App\Models\Clinic;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveSubscription
{
    public function handle(Request $request, Closure $next): Response
    {
        // Always allow billing pages, dashboard, logout, and email verification
        if ($request->routeIs('billing.*') || $request->routeIs('logout') || $request->routeIs('dashboard') || $request->is('email/*')) {
            return $next($request);
        }

        $clinic = $request->user()?->clinic;
        $subscription = $clinic?->subscription;

        if (! $subscription || ! $this->isSubscriptionValid($subscription)) {
            // Check grace period for past_due subscriptions
            if ($subscription?->isPastDue() && $this->isWithinGracePeriod($subscription)) {
                session()->flash('billing_warning', 'Your payment is past due. Please update your payment method to avoid service interruption.');

                return $next($request);
            }

            return $this->redirectWithError($request);
        }

        return $next($request);
    }

    /**
     * Check if the subscription is valid (active or trialing with unexpired trial).
     */
    private function isSubscriptionValid(\App\Models\ClinicSubscription $subscription): bool
    {
        if ($subscription->isActive()) {
            // For trialing subscriptions, verify the trial hasn't expired
            if ($subscription->status === \App\Enums\SubscriptionStatus::Trialing
                && $subscription->trial_ends_at
                && $subscription->trial_ends_at->isPast()) {
                return false;
            }

            return true;
        }

        return false;
    }

    /**
     * Check if a past_due subscription is within the grace period.
     */
    private function isWithinGracePeriod(\App\Models\ClinicSubscription $subscription): bool
    {
        if (! $subscription->current_period_end) {
            return false;
        }

        $graceDays = config('subscriptions.grace_period_days', 7);

        return now()->isBefore($subscription->current_period_end->addDays($graceDays));
    }

    /**
     * Redirect the user based on their role.
     */
    private function redirectWithError(Request $request): Response
    {
        $message = 'Please subscribe to a plan to access the application.';

        if ($request->expectsJson()) {
            abort(403, $message);
        }

        // Clinic owner, billing, and customer roles go to billing page to subscribe
        $user = $request->user();
        if ($user && ($user->hasRole(\App\Enums\UserRole::ClinicOwner, \App\Enums\UserRole::Billing, \App\Enums\UserRole::Customer))) {
            return redirect()->route('billing.index')->with('error', $message);
        }

        // Staff/provider roles go to dashboard with a message
        return redirect()->route('dashboard')->with('error', $message);
    }
}
