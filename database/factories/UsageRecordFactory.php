<?php

namespace Database\Factories;

use App\Enums\UsageType;
use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UsageRecord>
 */
class UsageRecordFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'type' => UsageType::AiCallMinutes,
            'quantity' => fake()->randomFloat(2, 1, 100),
            'recorded_date' => now()->toDateString(),
            'created_at' => now(),
        ];
    }
}
