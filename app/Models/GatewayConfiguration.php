<?php

namespace App\Models;

use App\Enums\GatewayConfigurationStatus;
use App\Enums\GatewayType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GatewayConfiguration extends Model
{
    /** @use HasFactory<\Database\Factories\GatewayConfigurationFactory> */
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'gateway',
        'is_active',
        'credentials',
        'status',
        'error_message',
        'last_tested_at',
    ];

    protected function casts(): array
    {
        return [
            'gateway' => GatewayType::class,
            'status' => GatewayConfigurationStatus::class,
            'is_active' => 'boolean',
            'credentials' => 'encrypted:array',
            'last_tested_at' => 'datetime',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function getCredential(string $key): ?string
    {
        return $this->credentials[$key] ?? null;
    }

    public function hasRequiredCredentials(): bool
    {
        return match ($this->gateway) {
            GatewayType::Stripe => ! empty($this->getCredential('publishable_key'))
                && ! empty($this->getCredential('secret_key')),
            GatewayType::Stedi => ! empty($this->getCredential('api_key')),
            default => false,
        };
    }
}
