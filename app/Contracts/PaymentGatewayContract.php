<?php

namespace App\Contracts;

use App\Models\Clinic;

interface PaymentGatewayContract
{
    /**
     * Create a customer record in the payment gateway.
     *
     * @return string Gateway customer ID
     */
    public function createCustomer(Clinic $clinic): string;

    /**
     * Create a subscription for the customer.
     *
     * @return array{id: string, status: string, current_period_start: \Carbon\Carbon, current_period_end: \Carbon\Carbon}
     */
    public function createSubscription(string $gatewayCustomerId, string $priceId, ?int $trialDays = null): array;

    /**
     * Cancel a subscription (at period end by default).
     */
    public function cancelSubscription(string $gatewaySubscriptionId, bool $immediately = false): void;

    /**
     * Resume a cancelled subscription before period end.
     */
    public function resumeSubscription(string $gatewaySubscriptionId): void;

    /**
     * Swap to a different plan/price.
     *
     * @return array{id: string, status: string, current_period_start: \Carbon\Carbon, current_period_end: \Carbon\Carbon}
     */
    public function swapSubscription(string $gatewaySubscriptionId, string $newPriceId): array;

    /**
     * Generate a checkout session URL for initial subscription.
     *
     * @return string Checkout URL
     */
    public function createCheckoutSession(
        string $gatewayCustomerId,
        string $priceId,
        string $successUrl,
        string $cancelUrl,
        ?int $trialDays = null,
    ): string;

    /**
     * Generate a billing portal session URL for customer self-service.
     *
     * @return string Portal URL
     */
    public function createBillingPortalSession(string $gatewayCustomerId, string $returnUrl): string;

    /**
     * Verify and parse a webhook payload.
     *
     * @return array{type: string, data: array<string, mixed>}
     */
    public function parseWebhookPayload(string $payload, string $signature): array;
}
