<?php

namespace App\Services;

use App\Contracts\PaymentGatewayContract;
use App\Services\Gateways\StripeGateway;
use InvalidArgumentException;

class PaymentGatewayManager
{
    public function gateway(?string $name = null): PaymentGatewayContract
    {
        $name ??= config('subscriptions.default_gateway', 'stripe');

        return match ($name) {
            'stripe' => app(StripeGateway::class),
            default => throw new InvalidArgumentException("Unsupported payment gateway: {$name}"),
        };
    }
}
