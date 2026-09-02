<?php

namespace Database\Factories;

use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EscalationPath>
 */
class EscalationPathFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'level' => fake()->unique()->numberBetween(1, 100),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(6),
            'target_role' => fake()->randomElement(['provider', 'nurse', 'staff', 'billing']),
            'timeout_seconds' => fake()->numberBetween(30, 180),
            'is_active' => true,
        ];
    }
}
