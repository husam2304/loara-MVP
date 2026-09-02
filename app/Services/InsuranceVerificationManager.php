<?php

namespace App\Services;

use App\Contracts\InsuranceVerificationContract;
use App\Services\Gateways\ClaimMdGateway;
use App\Services\Gateways\StediGateway;
use InvalidArgumentException;

class InsuranceVerificationManager
{
    public function gateway(?string $name = null): InsuranceVerificationContract
    {
        $name ??= config('services.claim_md.api_key') ? 'claim_md' : 'stedi';

        return match ($name) {
            'stedi' => app(StediGateway::class),
            'claim_md' => app(ClaimMdGateway::class),
            default => throw new InvalidArgumentException("Unsupported insurance verification gateway: {$name}"),
        };
    }
}
