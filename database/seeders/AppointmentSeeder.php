<?php

namespace Database\Seeders;

use App\Enums\AppointmentSource;
use App\Enums\AppointmentStatus;
use App\Enums\WaitlistPriority;
use App\Enums\WaitlistStatus;
use App\Models\Appointment;
use App\Models\AppointmentType;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Provider;
use App\Models\User;
use App\Models\WaitlistEntry;
use Illuminate\Database\Seeder;

class AppointmentSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Clinic::all() as $clinic) {
            $this->seedClinicAppointments($clinic);
        }
    }

    private function seedClinicAppointments(Clinic $clinic): void
    {
        $providers = Provider::where('clinic_id', $clinic->id)->get();
        $patients = Patient::where('clinic_id', $clinic->id)->get();
        $booker = User::where('clinic_id', $clinic->id)->first();

        $types = [
            ['name' => 'مريض جديد', 'duration_minutes' => 60, 'color' => '#22D3EE'],
            ['name' => 'مراجعة', 'duration_minutes' => 30, 'color' => '#A78BFA'],
            ['name' => 'استشارة', 'duration_minutes' => 45, 'color' => '#F472B6'],
            ['name' => 'فحص دوري شامل', 'duration_minutes' => 60, 'color' => '#34D399'],
            ['name' => 'زيارة طارئة', 'duration_minutes' => 20, 'color' => '#EF4444'],
        ];

        $appointmentTypes = collect();
        foreach ($types as $i => $type) {
            $appointmentTypes->push(AppointmentType::create(array_merge($type, [
                'clinic_id' => $clinic->id,
                'sort_order' => $i,
            ])));
        }

        $rooms = ['غرفة أ', 'غرفة ب', 'غرفة ج', 'غرفة فحص 1', 'غرفة فحص 2'];
        $reasons = [
            'ألم في المعدة', 'متابعة ضغط الدم', 'صداع مستمر', 'فحص دوري',
            'ألم في الظهر', 'حساسية جلدية', 'متابعة السكري', 'كحة وبرد',
            'ألم في الأسنان', 'فحص ما قبل السفر',
        ];
        $statuses = [
            AppointmentStatus::Completed,
            AppointmentStatus::Completed,
            AppointmentStatus::Completed,
            AppointmentStatus::Scheduled,
            AppointmentStatus::Confirmed,
            AppointmentStatus::NoShow,
        ];

        for ($i = 0; $i < 15; $i++) {
            $type = $appointmentTypes->random();
            $scheduledAt = fake()->dateTimeBetween('-14 days', '+14 days');
            $hour = fake()->numberBetween(9, 16);
            $minute = fake()->randomElement([0, 15, 30, 45]);
            $scheduledAt->setTime($hour, $minute);

            Appointment::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patients->random()->id,
                'provider_id' => $providers->random()->id,
                'appointment_type_id' => $type->id,
                'scheduled_at' => $scheduledAt,
                'ends_at' => (clone $scheduledAt)->modify("+{$type->duration_minutes} minutes"),
                'status' => fake()->randomElement($statuses),
                'room' => fake()->randomElement($rooms),
                'reason' => fake()->optional()->randomElement($reasons),
                'booked_by' => $booker->id,
                'source' => fake()->randomElement(AppointmentSource::cases()),
                'confirmation_sent_at' => fake()->optional(0.7)->dateTimeBetween('-14 days'),
                'reminder_sent_at' => fake()->optional(0.5)->dateTimeBetween('-3 days'),
            ]);
        }

        $priorities = [WaitlistPriority::High, WaitlistPriority::Normal, WaitlistPriority::Low, WaitlistPriority::Urgent];
        for ($i = 0; $i < 4; $i++) {
            WaitlistEntry::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patients->random()->id,
                'appointment_type_id' => $appointmentTypes->random()->id,
                'preferred_provider_id' => $providers->random()->id,
                'preferred_date_start' => now()->addDays(1),
                'preferred_date_end' => now()->addDays(7),
                'priority' => $priorities[$i],
                'status' => WaitlistStatus::Waiting,
            ]);
        }
    }
}
