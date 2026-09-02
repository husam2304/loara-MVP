<?php

namespace App\Console\Commands;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\AppointmentReminder;
use App\Models\Clinic;
use App\Models\ClinicReminderSetting;
use App\Notifications\AppointmentReminderNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:send-reminders';

    protected $description = 'Send email reminders to patients for upcoming appointments';

    public function handle(): int
    {
        $clinics = Clinic::all();

        if ($clinics->isEmpty()) {
            $this->info('No clinics found.');

            return self::SUCCESS;
        }

        $sentCount = 0;

        foreach ($clinics as $clinic) {
            $settings = ClinicReminderSetting::where('clinic_id', $clinic->id)->first();

            if (! $settings || ! $settings->reminders_enabled) {
                continue;
            }

            foreach ($settings->reminder_hours as $hours) {
                $type = "{$hours}h";
                $windowStart = now()->addHours($hours)->subMinutes(5);
                $windowEnd = now()->addHours($hours)->addMinutes(5);

                $appointments = Appointment::query()
                    ->where('clinic_id', $clinic->id)
                    ->whereIn('status', [
                        AppointmentStatus::Scheduled,
                        AppointmentStatus::Confirmed,
                    ])
                    ->whereBetween('scheduled_at', [$windowStart, $windowEnd])
                    ->whereDoesntHave('reminders', function ($q) use ($type) {
                        $q->where('type', $type)->where('channel', 'mail');
                    })
                    ->with(['patient', 'provider', 'clinic'])
                    ->get();

                foreach ($appointments as $appointment) {
                    if (! $appointment->patient?->email) {
                        continue;
                    }

                    Notification::route('mail', [
                        $appointment->patient->email => $appointment->patient->full_name,
                    ])->notify(new AppointmentReminderNotification($appointment, $type));

                    AppointmentReminder::create([
                        'appointment_id' => $appointment->id,
                        'type' => $type,
                        'channel' => 'mail',
                        'sent_at' => now(),
                    ]);

                    if ($hours === 24) {
                        $appointment->update(['reminder_sent_at' => now()]);
                    }

                    $sentCount++;
                }
            }
        }

        $this->info("Sent {$sentCount} appointment reminder(s).");

        return self::SUCCESS;
    }
}
