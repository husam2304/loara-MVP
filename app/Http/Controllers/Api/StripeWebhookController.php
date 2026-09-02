<?php

namespace App\Http\Controllers\Api;

use App\Contracts\PaymentGatewayContract;
use App\Http\Controllers\Controller;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class StripeWebhookController extends Controller
{
    public function __construct(
        private PaymentGatewayContract $gateway,
        private SubscriptionService $subscriptionService,
    ) {}

    public function handleWebhook(Request $request): JsonResponse
    {
        $signature = $request->header('Stripe-Signature');

        if (! $signature) {
            return response()->json(['error' => 'Missing signature'], 400);
        }

        try {
            $event = $this->gateway->parseWebhookPayload(
                $request->getContent(),
                $signature,
            );
        } catch (\Exception $e) {
            Log::warning('Stripe webhook signature verification failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'Invalid signature'], 400);
        }

        $eventType = $event['type'] ?? null;
        $data = $event['data'] ?? [];
        $eventId = $event['id'] ?? null;

        // Idempotency: Stripe delivers events at-least-once. Skip an event we've
        // already processed so redeliveries can't double-create invoices etc.
        if ($eventId && ! Cache::add('stripe_webhook:'.$eventId, true, now()->addDay())) {
            Log::info('Stripe webhook duplicate ignored', ['id' => $eventId, 'type' => $eventType]);

            return response()->json(['status' => 'ok', 'duplicate' => true]);
        }

        Log::info('Stripe webhook received', ['type' => $eventType]);

        try {
            match ($eventType) {
                'customer.subscription.created' => $this->subscriptionService->handleSubscriptionCreated($data),
                'customer.subscription.updated',
                'customer.subscription.deleted' => $this->subscriptionService->handleSubscriptionUpdated($data),
                'invoice.paid' => $this->subscriptionService->handleInvoicePaid($data),
                'invoice.payment_failed' => $this->subscriptionService->handleInvoicePaymentFailed($data),
                default => Log::info('Stripe webhook ignored', ['type' => $eventType]),
            };
        } catch (\Exception $e) {
            Log::error('Stripe webhook handler failed', [
                'type' => $eventType,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Webhook handler failed'], 500);
        }

        return response()->json(['status' => 'ok']);
    }
}
