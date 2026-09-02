<?php

namespace App\Enums;

enum GatewayType: string
{
    case Stripe = 'stripe';
    case Stedi = 'stedi';
    case ClaimMd = 'claim_md';

    public function isPaymentGateway(): bool
    {
        return match ($this) {
            self::Stripe => true,
            default => false,
        };
    }

    /** @return self[] */
    public static function paymentGateways(): array
    {
        return array_filter(self::cases(), fn (self $g) => $g->isPaymentGateway());
    }
}
