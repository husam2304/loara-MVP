<?php

namespace App\Services;

use App\Contracts\PaymentGatewayContract;
use App\Enums\BillingCycle;
use App\Enums\InvoiceStatus;
use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
use App\Models\Clinic;
use App\Models\ClinicSubscription;
use App\Models\Invoice;
use App\Models\PlanConfiguration;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubscriptionService
{
    public function __construct(
        private PaymentGatewayContract $gateway,
    ) {}

    /**
     * Get plan config by enum — reads from DB first, falls back to config file.
     *
     * @return array<string, mixed>
     */
    public function getPlanConfig(SubscriptionPlan $plan): array
    {
        $dbPlan = PlanConfiguration::where('slug', $plan->value)->first();

        if ($dbPlan) {
            return $dbPlan->toArray();
        }

        return config("subscriptions.plans.{$plan->value}", []);
    }

    /**
     * Get the gateway price ID for a plan + billing cycle.
     */
    public function getPriceId(SubscriptionPlan $plan, BillingCycle $cycle): string
    {
        $dbPlan = PlanConfiguration::where('slug', $plan->value)->first();

        if ($dbPlan) {
            return $cycle === BillingCycle::Yearly
                ? ($dbPlan->stripe_price_yearly ?? '')
                : ($dbPlan->stripe_price_monthly ?? '');
        }

        $config = $this->getPlanConfig($plan);
        $key = "stripe_price_{$cycle->value}";

        return $config[$key] ?? '';
    }

    /**
     * Create a checkout session for a new subscription.
     */
    public function createCheckoutSession(Clinic $clinic, SubscriptionPlan $plan, BillingCycle $cycle): string
    {
        $subscription = $clinic->subscription;
        $customerId = $subscription?->gateway_customer_id;

        if (! $customerId) {
            $customerId = $this->gateway->createCustomer($clinic);

            // Store the customer ID for future use
            if ($subscription) {
                $subscription->update([
                    'gateway_customer_id' => $customerId,
                    'gateway' => config('subscriptions.default_gateway'),
                ]);
            }
        }

        $priceId = $this->getPriceId($plan, $cycle);
        $trialDays = config('subscriptions.trial_days', 7);

        // Don't give trial if clinic already had a subscription
        if ($subscription && $subscription->trial_ends_at) {
            $trialDays = null;
        }

        return $this->gateway->createCheckoutSession(
            $customerId,
            $priceId,
            route('billing.index').'?checkout=success',
            route('billing.index').'?checkout=cancelled',
            $trialDays,
        );
    }

    /**
     * Create a billing portal session for the clinic.
     */
    public function createBillingPortalSession(Clinic $clinic): string
    {
        $subscription = $clinic->subscription;
        $customerId = $subscription?->gateway_customer_id;

        if (! $customerId) {
            $customerId = $this->gateway->createCustomer($clinic);

            if ($subscription) {
                $subscription->update([
                    'gateway_customer_id' => $customerId,
                    'gateway' => config('subscriptions.default_gateway'),
                ]);
            }
        }

        return $this->gateway->createBillingPortalSession(
            $customerId,
            route('billing.index'),
        );
    }

    /**
     * Handle subscription created webhook event — creates a new local subscription.
     */
    public function handleSubscriptionCreated(array $gatewayData): void
    {
        $gatewaySubscriptionId = $gatewayData['id'] ?? null;
        $gatewayCustomerId = $gatewayData['customer'] ?? null;

        if (! $gatewaySubscriptionId || ! $gatewayCustomerId) {
            return;
        }

        // Check if we already have this subscription (idempotency)
        $existing = ClinicSubscription::where('gateway_subscription_id', $gatewaySubscriptionId)->first();
        if ($existing) {
            $this->handleSubscriptionUpdated($gatewayData);

            return;
        }

        // Find the clinic by gateway_customer_id on an existing subscription record
        $existingByCustomer = ClinicSubscription::where('gateway_customer_id', $gatewayCustomerId)->first();
        $clinicId = $existingByCustomer?->clinic_id;

        if (! $clinicId) {
            Log::error('Stripe subscription created webhook: no local clinic found for customer', [
                'gateway_subscription_id' => $gatewaySubscriptionId,
                'gateway_customer_id' => $gatewayCustomerId,
            ]);

            return;
        }

        $status = $this->mapGatewayStatus($gatewayData['status'] ?? 'active');
        $planConfig = $this->detectPlanFromGatewayData($gatewayData);

        DB::transaction(function () use ($clinicId, $gatewaySubscriptionId, $gatewayCustomerId, $status, $planConfig, $gatewayData) {
            $createData = [
                'clinic_id' => $clinicId,
                'gateway' => config('subscriptions.default_gateway'),
                'gateway_subscription_id' => $gatewaySubscriptionId,
                'gateway_customer_id' => $gatewayCustomerId,
                'status' => $status,
                'plan' => $planConfig['plan'] ?? SubscriptionPlan::Starter,
                'billing_cycle' => $planConfig['billing_cycle'] ?? BillingCycle::Monthly,
                'price_monthly' => $planConfig['price_monthly'] ?? 0,
                'call_limit' => $planConfig['minutes_limit'] ?? 500,
                'minutes_limit' => $planConfig['minutes_limit'] ?? 500,
                'concurrent_limit' => $planConfig['concurrent_limit'] ?? 2,
                'team_member_limit' => $planConfig['team_member_limit'] ?? 3,
                'current_period_start' => ($start = $this->periodTimestamp($gatewayData, 'current_period_start'))
                    ? Carbon::createFromTimestamp($start)
                    : now(),
                'current_period_end' => ($end = $this->periodTimestamp($gatewayData, 'current_period_end'))
                    ? Carbon::createFromTimestamp($end)
                    : now()->addMonth(),
            ];

            if (isset($gatewayData['trial_end'])) {
                $createData['trial_ends_at'] = Carbon::createFromTimestamp($gatewayData['trial_end']);
            }

            // A clinic has a single subscription row (it gets one — trialing — at
            // registration, which checkout stamps with the gateway customer id).
            // Upsert by clinic_id so the created webhook updates that row rather
            // than inserting a duplicate (which the unique index now forbids).
            ClinicSubscription::updateOrCreate(['clinic_id' => $clinicId], $createData);
        });
    }

    /**
     * Handle subscription updated/deleted webhook event.
     */
    public function handleSubscriptionUpdated(array $gatewayData): void
    {
        $gatewaySubscriptionId = $gatewayData['id'] ?? null;
        $gatewayCustomerId = $gatewayData['customer'] ?? null;

        if (! $gatewaySubscriptionId || ! $gatewayCustomerId) {
            return;
        }

        $subscription = ClinicSubscription::where('gateway_subscription_id', $gatewaySubscriptionId)->first()
            ?? ClinicSubscription::where('gateway_customer_id', $gatewayCustomerId)->first();

        if (! $subscription) {
            return;
        }

        $status = $this->mapGatewayStatus($gatewayData['status'] ?? 'active');

        DB::transaction(function () use ($subscription, $gatewaySubscriptionId, $gatewayCustomerId, $status, $gatewayData) {
            $updateData = [
                'status' => $status,
                'gateway_subscription_id' => $gatewaySubscriptionId,
                'gateway_customer_id' => $gatewayCustomerId,
            ];

            // Detect plan from Stripe price ID (important for new subscriptions from checkout)
            $planConfig = $this->detectPlanFromGatewayData($gatewayData);
            if (! empty($planConfig)) {
                $updateData['plan'] = $planConfig['plan'];
                $updateData['billing_cycle'] = $planConfig['billing_cycle'];
                $updateData['price_monthly'] = $planConfig['price_monthly'];
                $updateData['minutes_limit'] = $planConfig['minutes_limit'];
                $updateData['concurrent_limit'] = $planConfig['concurrent_limit'];
                $updateData['team_member_limit'] = $planConfig['team_member_limit'];
            }

            if ($start = $this->periodTimestamp($gatewayData, 'current_period_start')) {
                $updateData['current_period_start'] = Carbon::createFromTimestamp($start);
            }
            if ($end = $this->periodTimestamp($gatewayData, 'current_period_end')) {
                $updateData['current_period_end'] = Carbon::createFromTimestamp($end);
            }
            if (isset($gatewayData['trial_end'])) {
                $updateData['trial_ends_at'] = Carbon::createFromTimestamp($gatewayData['trial_end']);
            }
            if ($status === SubscriptionStatus::Cancelled) {
                $updateData['cancelled_at'] = now();
            }

            $subscription->update($updateData);
        });
    }

    /**
     * Handle invoice.paid webhook event.
     */
    public function handleInvoicePaid(array $gatewayData): void
    {
        $gatewayCustomerId = $gatewayData['customer'] ?? null;

        if (! $gatewayCustomerId) {
            return;
        }

        $subscription = ClinicSubscription::where('gateway_customer_id', $gatewayCustomerId)->first();

        if (! $subscription) {
            return;
        }

        DB::transaction(function () use ($subscription, $gatewayData) {
            Invoice::updateOrCreate(
                ['stripe_invoice_id' => $gatewayData['id']],
                [
                    'clinic_id' => $subscription->clinic_id,
                    'subscription_id' => $subscription->id,
                    'number' => $gatewayData['number'] ?? 'INV-'.strtoupper(uniqid()),
                    'amount' => ($gatewayData['subtotal'] ?? 0) / 100,
                    'tax' => ($gatewayData['tax'] ?? 0) / 100,
                    'total' => ($gatewayData['total'] ?? 0) / 100,
                    'status' => InvoiceStatus::Paid,
                    'period_start' => isset($gatewayData['period_start'])
                        ? Carbon::createFromTimestamp($gatewayData['period_start'])->toDateString()
                        : now()->toDateString(),
                    'period_end' => isset($gatewayData['period_end'])
                        ? Carbon::createFromTimestamp($gatewayData['period_end'])->toDateString()
                        : now()->addMonth()->toDateString(),
                    'paid_at' => now(),
                    'due_at' => isset($gatewayData['due_date'])
                        ? Carbon::createFromTimestamp($gatewayData['due_date'])->toDateString()
                        : now()->toDateString(),
                    'pdf_url' => $gatewayData['invoice_pdf'] ?? null,
                ],
            );
        });
    }

    /**
     * Handle invoice.payment_failed webhook event.
     */
    public function handleInvoicePaymentFailed(array $gatewayData): void
    {
        $gatewayCustomerId = $gatewayData['customer'] ?? null;

        if (! $gatewayCustomerId) {
            return;
        }

        $subscription = ClinicSubscription::where('gateway_customer_id', $gatewayCustomerId)->first();

        if (! $subscription) {
            return;
        }

        DB::transaction(function () use ($subscription, $gatewayData) {
            $subscription->update(['status' => SubscriptionStatus::PastDue]);

            Invoice::updateOrCreate(
                ['stripe_invoice_id' => $gatewayData['id']],
                [
                    'clinic_id' => $subscription->clinic_id,
                    'subscription_id' => $subscription->id,
                    'number' => $gatewayData['number'] ?? 'INV-'.strtoupper(uniqid()),
                    'amount' => ($gatewayData['subtotal'] ?? 0) / 100,
                    'tax' => ($gatewayData['tax'] ?? 0) / 100,
                    'total' => ($gatewayData['total'] ?? 0) / 100,
                    'status' => InvoiceStatus::Failed,
                    'period_start' => isset($gatewayData['period_start'])
                        ? Carbon::createFromTimestamp($gatewayData['period_start'])->toDateString()
                        : now()->toDateString(),
                    'period_end' => isset($gatewayData['period_end'])
                        ? Carbon::createFromTimestamp($gatewayData['period_end'])->toDateString()
                        : now()->addMonth()->toDateString(),
                    'due_at' => isset($gatewayData['due_date'])
                        ? Carbon::createFromTimestamp($gatewayData['due_date'])->toDateString()
                        : now()->toDateString(),
                ],
            );
        });
    }

    /**
     * Cancel subscription at period end.
     */
    public function cancel(ClinicSubscription $subscription): void
    {
        if ($subscription->gateway_subscription_id) {
            $this->gateway->cancelSubscription($subscription->gateway_subscription_id);
        }

        // Cancel at period end: the clinic keeps access through the paid period.
        // Stripe keeps the subscription active until then and sends a webhook when
        // it actually ends, which transitions the status to Cancelled. We only
        // record the scheduled cancellation here (the UI uses cancelled_at to show
        // the cancelled state and offer Resume) — we do NOT flip the status now,
        // otherwise the subscription gate would lock the clinic out immediately.
        $subscription->update([
            'cancelled_at' => now(),
        ]);
    }

    /**
     * Resume a cancelled subscription.
     */
    public function resume(ClinicSubscription $subscription): void
    {
        if ($subscription->gateway_subscription_id) {
            $this->gateway->resumeSubscription($subscription->gateway_subscription_id);
        }

        $subscription->update([
            'status' => SubscriptionStatus::Active,
            'cancelled_at' => null,
        ]);
    }

    /**
     * Swap to a different plan.
     */
    public function swap(ClinicSubscription $subscription, SubscriptionPlan $newPlan, BillingCycle $cycle): void
    {
        $priceId = $this->getPriceId($newPlan, $cycle);
        $planConfig = $this->getPlanConfig($newPlan);

        if ($subscription->gateway_subscription_id && $priceId) {
            $result = $this->gateway->swapSubscription($subscription->gateway_subscription_id, $priceId);

            $subscription->update([
                'plan' => $newPlan,
                'billing_cycle' => $cycle,
                'price_monthly' => $planConfig['price_monthly'] ?? $subscription->price_monthly,
                'minutes_limit' => $planConfig['minutes_limit'] ?? $subscription->minutes_limit,
                'concurrent_limit' => $planConfig['concurrent_limit'] ?? $subscription->concurrent_limit,
                'team_member_limit' => $planConfig['team_member_limit'] ?? $subscription->team_member_limit,
                'current_period_start' => $result['current_period_start'],
                'current_period_end' => $result['current_period_end'],
                'cancelled_at' => null,
            ]);
        } else {
            $subscription->update([
                'plan' => $newPlan,
                'billing_cycle' => $cycle,
                'price_monthly' => $planConfig['price_monthly'] ?? $subscription->price_monthly,
                'minutes_limit' => $planConfig['minutes_limit'] ?? $subscription->minutes_limit,
                'concurrent_limit' => $planConfig['concurrent_limit'] ?? $subscription->concurrent_limit,
                'team_member_limit' => $planConfig['team_member_limit'] ?? $subscription->team_member_limit,
            ]);
        }
    }

    /**
     * Check if a clinic has an active subscription.
     */
    public function isActive(Clinic $clinic): bool
    {
        $subscription = $clinic->subscription;

        return $subscription?->isActive() ?? false;
    }

    /**
     * Check if a subscription is within the grace period after past_due.
     */
    public function isInGracePeriod(ClinicSubscription $subscription): bool
    {
        if ($subscription->status !== SubscriptionStatus::PastDue) {
            return false;
        }

        if (! $subscription->current_period_end) {
            return false;
        }

        $graceDays = config('subscriptions.grace_period_days', 7);
        $deadline = $subscription->current_period_end->addDays($graceDays);

        return now()->isBefore($deadline);
    }

    /**
     * Resolve a billing-period timestamp from a gateway subscription payload.
     * Stripe API version 2025-03-31+ moved current_period_start/end off the
     * subscription object onto each subscription item; older versions keep them
     * at the top level. Read the item first, then fall back to the legacy field.
     *
     * @param  array<string, mixed>  $gatewayData
     */
    private function periodTimestamp(array $gatewayData, string $key): ?int
    {
        $itemValue = $gatewayData['items']['data'][0][$key] ?? null;

        if ($itemValue) {
            return (int) $itemValue;
        }

        if (! empty($gatewayData[$key])) {
            return (int) $gatewayData[$key];
        }

        return null;
    }

    private function mapGatewayStatus(string $status): SubscriptionStatus
    {
        return match ($status) {
            'active' => SubscriptionStatus::Active,
            'trialing' => SubscriptionStatus::Trialing,
            'past_due' => SubscriptionStatus::PastDue,
            // Initial payment not yet completed / temporarily paused — must not
            // grant active access until payment clears.
            'incomplete', 'paused' => SubscriptionStatus::PastDue,
            'canceled', 'cancelled', 'unpaid', 'incomplete_expired' => SubscriptionStatus::Cancelled,
            default => SubscriptionStatus::Active,
        };
    }

    /**
     * @return array{plan?: SubscriptionPlan, billing_cycle?: BillingCycle, minutes_limit?: int, concurrent_limit?: int, team_member_limit?: int, price_monthly?: float}
     */
    private function detectPlanFromGatewayData(array $gatewayData): array
    {
        $priceId = $gatewayData['items']['data'][0]['price']['id'] ?? null;

        if (! $priceId) {
            return [];
        }

        // Check DB plans first
        $dbPlan = PlanConfiguration::where('stripe_price_monthly', $priceId)
            ->orWhere('stripe_price_yearly', $priceId)
            ->first();

        if ($dbPlan) {
            $isYearly = $dbPlan->stripe_price_yearly === $priceId;

            return [
                'plan' => SubscriptionPlan::from($dbPlan->slug),
                'billing_cycle' => $isYearly ? BillingCycle::Yearly : BillingCycle::Monthly,
                'minutes_limit' => $dbPlan->minutes_limit,
                'concurrent_limit' => $dbPlan->concurrent_limit,
                'team_member_limit' => $dbPlan->team_member_limit,
                'price_monthly' => (float) $dbPlan->price_monthly,
            ];
        }

        // Fallback to config
        foreach (config('subscriptions.plans', []) as $key => $plan) {
            $isMonthly = ($plan['stripe_price_monthly'] ?? '') === $priceId;
            $isYearly = ($plan['stripe_price_yearly'] ?? '') === $priceId;

            if ($isMonthly || $isYearly) {
                return [
                    'plan' => SubscriptionPlan::from($key),
                    'billing_cycle' => $isYearly ? BillingCycle::Yearly : BillingCycle::Monthly,
                    'minutes_limit' => $plan['minutes_limit'],
                    'concurrent_limit' => $plan['concurrent_limit'],
                    'team_member_limit' => $plan['team_member_limit'],
                    'price_monthly' => $plan['price_monthly'],
                ];
            }
        }

        return [];
    }
}
