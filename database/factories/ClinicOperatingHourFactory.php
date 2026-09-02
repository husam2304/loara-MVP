<?php

namespace Database\Factories;

use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ClinicOperatingHour>
 */
class ClinicOperatingHourFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'day_of_week' => fake()->numberBetween(0, 6),
            'open_time' => '08:00',
            'close_time' => '17:00',
            'is_closed' => false,
        ];
    }

    public function closed(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_closed' => true,
            'open_time' => null,
            'close_time' => null,
        ]);
    }
}
