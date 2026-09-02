<?php

namespace Database\Factories;

use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AppointmentType>
 */
class AppointmentTypeFactory extends Factory
{
    public function definition(): array
    {
        $types = [
            ['name' => 'New Patient', 'duration' => 60, 'color' => '#22D3EE'],
            ['name' => 'Follow-Up', 'duration' => 30, 'color' => '#A78BFA'],
            ['name' => 'Consultation', 'duration' => 45, 'color' => '#F472B6'],
            ['name' => 'Annual Physical', 'duration' => 60, 'color' => '#34D399'],
            ['name' => 'Urgent Visit', 'duration' => 20, 'color' => '#EF4444'],
        ];
        $type = fake()->randomElement($types);

        return [
            'clinic_id' => Clinic::factory(),
            'name' => $type['name'],
            'duration_minutes' => $type['duration'],
            'color' => $type['color'],
            'is_active' => true,
        ];
    }
}
