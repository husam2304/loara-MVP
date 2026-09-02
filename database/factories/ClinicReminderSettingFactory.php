<?php

namespace Database\Factories;

use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ClinicReminderSetting>
 */
class ClinicReminderSettingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'reminders_enabled' => true,
            'reminder_hours' => [24, 1],
        ];
    }

    public function disabled(): static
    {
        return $this->state(['reminders_enabled' => false]);
    }
}
