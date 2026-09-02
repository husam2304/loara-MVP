<?php

namespace Database\Factories;

use App\Enums\WaitlistPriority;
use App\Enums\WaitlistStatus;
use App\Models\AppointmentType;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Provider;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WaitlistEntry>
 */
class WaitlistEntryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'patient_id' => Patient::factory(),
            'appointment_type_id' => AppointmentType::factory(),
            'preferred_provider_id' => Provider::factory(),
            'preferred_date_start' => fake()->dateTimeBetween('+1 day', '+7 days'),
            'preferred_date_end' => fake()->dateTimeBetween('+8 days', '+14 days'),
            'priority' => fake()->randomElement(WaitlistPriority::cases()),
            'status' => WaitlistStatus::Waiting,
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function waiting(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WaitlistStatus::Waiting,
        ]);
    }

    public function highPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => WaitlistPriority::High,
        ]);
    }
}
