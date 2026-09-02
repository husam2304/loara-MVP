<?php

namespace Database\Factories;

use App\Enums\AppointmentSource;
use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\AppointmentType;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Provider;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Appointment>
 */
class AppointmentFactory extends Factory
{
    public function definition(): array
    {
        $scheduledAt = fake()->dateTimeBetween('-30 days', '+30 days');
        $durationMinutes = fake()->randomElement([20, 30, 45, 60]);

        return [
            'clinic_id' => Clinic::factory(),
            'patient_id' => Patient::factory(),
            'provider_id' => Provider::factory(),
            'appointment_type_id' => AppointmentType::factory(),
            'scheduled_at' => $scheduledAt,
            'ends_at' => (clone $scheduledAt)->modify("+{$durationMinutes} minutes"),
            'status' => fake()->randomElement(AppointmentStatus::cases()),
            'room' => fake()->randomElement(['غرفة أ', 'غرفة ب', 'غرفة ج', 'غرفة د', 'غرفة فحص 1', 'غرفة فحص 2']),
            'reason' => fake()->optional()->randomElement([
                'ألم في المعدة', 'متابعة ضغط الدم', 'صداع مستمر', 'فحص دوري',
                'ألم في الظهر', 'حساسية جلدية', 'متابعة السكري', 'كحة وبرد',
            ]),
            'source' => fake()->randomElement(AppointmentSource::cases()),
        ];
    }

    public function upcoming(): static
    {
        return $this->state(function (array $attributes) {
            $scheduledAt = fake()->dateTimeBetween('+1 day', '+14 days');

            return [
                'scheduled_at' => $scheduledAt,
                'ends_at' => (clone $scheduledAt)->modify('+30 minutes'),
                'status' => AppointmentStatus::Scheduled,
            ];
        });
    }

    public function completed(): static
    {
        return $this->state(function (array $attributes) {
            $scheduledAt = fake()->dateTimeBetween('-30 days', '-1 day');

            return [
                'scheduled_at' => $scheduledAt,
                'ends_at' => (clone $scheduledAt)->modify('+30 minutes'),
                'status' => AppointmentStatus::Completed,
            ];
        });
    }

    public function scheduledInHours(int $hours): static
    {
        return $this->state(function () use ($hours) {
            $scheduledAt = now()->addHours($hours);

            return [
                'scheduled_at' => $scheduledAt,
                'ends_at' => $scheduledAt->copy()->addMinutes(30),
                'status' => AppointmentStatus::Scheduled,
            ];
        });
    }
}
