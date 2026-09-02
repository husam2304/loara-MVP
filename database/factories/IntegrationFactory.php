<?php

namespace Database\Factories;

use App\Enums\IntegrationProvider;
use App\Enums\IntegrationStatus;
use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Integration>
 */
class IntegrationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'provider' => fake()->randomElement(IntegrationProvider::cases()),
            'name' => fake()->company() . ' Integration',
            'status' => fake()->randomElement(IntegrationStatus::cases()),
        ];
    }
}
