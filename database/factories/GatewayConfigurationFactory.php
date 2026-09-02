<?php

namespace Database\Factories;

use App\Enums\GatewayConfigurationStatus;
use App\Enums\GatewayType;
use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\GatewayConfiguration>
 */
class GatewayConfigurationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'gateway' => GatewayType::Stripe,
            'is_active' => false,
            'credentials' => [
                'publishable_key' => 'pk_test_'.fake()->sha1(),
                'secret_key' => 'sk_test_'.fake()->sha1(),
                'webhook_secret' => 'whsec_'.fake()->sha1(),
            ],
            'status' => GatewayConfigurationStatus::NotConfigured,
        ];
    }

    public function connected(): static
    {
        return $this->state([
            'is_active' => true,
            'status' => GatewayConfigurationStatus::Connected,
            'last_tested_at' => now(),
        ]);
    }
}
