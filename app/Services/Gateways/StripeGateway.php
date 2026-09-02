<?php

namespace App\Services\Gateways;

use App\Contracts\PaymentGatewayContract;
use App\Enums\GatewayType;
use App\Models\Clinic;
use App\Models\GatewayConfiguration;
use Carbon\Carbon;
use Stripe\BillingPortal\Session as StripeBillingPortalSession;
use Stripe\Checkout\Session as StripeCheckoutSession;
use Stripe\Customer as StripeCustomer;
use Stripe\Stripe;
use Stripe\Subscription as StripeSubscription;
use Stripe\Webhook as StripeWebhook;

class StripeGateway implements PaymentGatewayContract
{
    private string $webhookSecret;

    public function __construct()
    {
        $secretKey = $this->resolveCredential('secret_key', 'services.stripe.secret');
        $this->webhookSecret = $this->resolveCredential('webhook_secret', 'services.stripe.webhook_secret');

        Stripe::setApiKey($secretKey);
    }

    public function createCustomer(Clinic $clinic): string
    {
        $customer = StripeCustomer::create([
            'name' => $clinic->name,
            'email' => $clinic->email,
            'phone' => $clinic->phone,
            'metadata' => [
                'clinic_id' => $clinic->id,
            ],
        ]);

        return $customer->id;
    }

    public function createSubscription(string $gatewayCustomerId, string $priceId, ?int $trialDays = null): array
    {
        $params = [
            'customer' => $gatewayCustomerId,
            'items' => [['price' => $priceId]],
            'payment_behavior' => 'default_incomplete',
            'expand' => ['latest_invoice.payment_intent'],
        ];

        if ($trialDays && $trialDays > 0) {
            $params['trial_period_days'] = $trialDays;
        }

        $subscription = StripeSubscription::create($params);

        return $this->normalizeSubscription($subscription);
    }

    public function cancelSubscription(string $gatewaySubscriptionId, bool $immediately = false): void
    {
        if ($immediately) {
            StripeSubscription::retrieve($gatewaySubscriptionId)->cancel();
        } else {
            StripeSubscription::update($gatewaySubscriptionId, [
                'cancel_at_period_end' => true,
            ]);
        }
    }

    public function resumeSubscription(string $gatewaySubscriptionId): void
    {
        StripeSubscription::update($gatewaySubscriptionId, [
            'cancel_at_period_end' => false,
        ]);
    }

    public function swapSubscription(string $gatewaySubscriptionId, string $newPriceId): array
    {
        $subscription = StripeSubscription::retrieve($gatewaySubscriptionId);

        $updated = StripeSubscription::update($gatewaySubscriptionId, [
            'items' => [
                [
                    'id' => $subscription->items->data[0]->id,
                    'price' => $newPriceId,
                ],
            ],
            'proration_behavior' => 'create_prorations',
        ]);

        return $this->normalizeSubscription($updated);
    }

    public function createCheckoutSession(
        string $gatewayCustomerId,
        string $priceId,
        string $successUrl,
        string $cancelUrl,
        ?int $trialDays = null,
    ): string {
        $params = [
            'customer' => $gatewayCustomerId,
            'mode' => 'subscription',
            'line_items' => [
                [
                    'price' => $priceId,
                    'quantity' => 1,
                ],
            ],
            'success_url' => $successUrl.'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $cancelUrl,
            'allow_promotion_codes' => true,
        ];

        if ($trialDays && $trialDays > 0) {
            $params['subscription_data'] = [
                'trial_period_days' => $trialDays,
            ];
        }

        $session = StripeCheckoutSession::create($params);

        return $session->url;
    }

    public function createBillingPortalSession(string $gatewayCustomerId, string $returnUrl): string
    {
        $session = StripeBillingPortalSession::create([
            'customer' => $gatewayCustomerId,
            'return_url' => $returnUrl,
        ]);

        return $session->url;
    }

    public function parseWebhookPayload(string $payload, string $signature): array
    {
        $event = StripeWebhook::constructEvent(
            $payload,
            $signature,
            $this->webhookSecret,
        );

        return [
            'id' => $event->id,
            'type' => $event->type,
            'data' => $event->data->object->toArray(),
        ];
    }

    private function resolveCredential(string $credentialKey, string $configKey): string
    {
        $dbConfig = GatewayConfiguration::query()
            ->where('gateway', GatewayType::Stripe)
            ->where('is_active', true)
            ->whereNull('clinic_id')
            ->first();

        if ($dbConfig && $dbConfig->getCredential($credentialKey)) {
            return $dbConfig->getCredential($credentialKey);
        }

        return config($configKey) ?? '';
    }

    /**
     * @return array{id: string, status: string, current_period_start: Carbon, current_period_end: Carbon}
     */
    private function normalizeSubscription(StripeSubscription $subscription): array
    {
        $start = $this->periodTimestamp($subscription, 'current_period_start');
        $end = $this->periodTimestamp($subscription, 'current_period_end');

        return [
            'id' => $subscription->id,
            'status' => $subscription->status,
            'current_period_start' => $start ? Carbon::createFromTimestamp($start) : Carbon::now(),
            'current_period_end' => $end ? Carbon::createFromTimestamp($end) : Carbon::now()->addMonth(),
        ];
    }

    /**
     * Resolve a billing-period timestamp. Stripe API version 2025-03-31+ moved
     * current_period_start/end off the subscription object onto each subscription
     * item; older versions keep them at the top level. Read the item first, then
     * fall back to the legacy top-level field.
     */
    private function periodTimestamp(StripeSubscription $subscription, string $key): ?int
    {
        $item = $subscription->items->data[0] ?? null;

        if ($item && isset($item->{$key}) && $item->{$key}) {
            return (int) $item->{$key};
        }

        if (isset($subscription->{$key}) && $subscription->{$key}) {
            return (int) $subscription->{$key};
        }

        return null;
    }
}
