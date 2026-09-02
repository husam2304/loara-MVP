<?php

namespace Database\Factories;

use App\Enums\TriageAction;
use App\Enums\TriagePriority;
use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TriageRule>
 */
class TriageRuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'name' => fake()->sentence(3),
            'description' => fake()->sentence(8),
            'priority' => fake()->randomElement(TriagePriority::cases()),
            'conditions' => ['keywords' => [fake()->word(), fake()->word()]],
            'action' => fake()->randomElement(TriageAction::cases()),
            'target_role' => fake()->randomElement(['provider', 'nurse', 'admin']),
            'is_active' => true,
        ];
    }
}
