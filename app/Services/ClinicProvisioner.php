<?php

namespace App\Services;

use App\Models\AiConfiguration;
use App\Models\Clinic;
use App\Models\ClinicOperatingHour;
use App\Models\ClinicReminderSetting;
use App\Models\NotificationSetting;
use App\Models\User;

class ClinicProvisioner
{
    /**
     * Create the baseline records a brand-new clinic needs to be operational:
     * an AI assistant configuration, a full week of operating hours, and reminder
     * settings. Without these a freshly registered tenant has an unconfigured voice
     * agent and no schedule for the AI to reason about. Safe to call more than once.
     */
    public function provisionDefaults(Clinic $clinic): void
    {
        $this->provisionAiConfiguration($clinic);
        $this->provisionOperatingHours($clinic);
        $this->provisionReminderSetting($clinic);
    }

    private function provisionAiConfiguration(Clinic $clinic): void
    {
        if ($clinic->aiConfiguration()->exists()) {
            return;
        }

        AiConfiguration::create([
            'clinic_id' => $clinic->id,
            'greeting_message' => "Thank you for calling {$clinic->name}. This is the virtual front desk. How can I help you today?",
            'after_hours_message' => "Thank you for calling {$clinic->name}. We are currently closed. Please leave a message and we'll get back to you.",
            'language' => 'en',
        ]);
    }

    private function provisionOperatingHours(Clinic $clinic): void
    {
        if ($clinic->operatingHours()->exists()) {
            return;
        }

        // 0 = Sunday … 6 = Saturday (Carbon::dayOfWeek convention). Weekdays 9–5,
        // weekend closed — a sensible starting point the owner can edit in Settings.
        foreach (range(0, 6) as $day) {
            $isWeekend = in_array($day, [0, 6], true);

            ClinicOperatingHour::create([
                'clinic_id' => $clinic->id,
                'day_of_week' => $day,
                'open_time' => '09:00',
                'close_time' => '17:00',
                'is_closed' => $isWeekend,
            ]);
        }
    }

    private function provisionReminderSetting(Clinic $clinic): void
    {
        if ($clinic->reminderSetting()->exists()) {
            return;
        }

        ClinicReminderSetting::create([
            'clinic_id' => $clinic->id,
            'reminders_enabled' => true,
        ]);
    }

    /**
     * Create per-user notification preferences for a clinic user (e.g. the owner
     * created during registration).
     */
    public function provisionUserNotificationSettings(User $user): void
    {
        if (NotificationSetting::where('user_id', $user->id)->exists()) {
            return;
        }

        NotificationSetting::create([
            'user_id' => $user->id,
            'email_enabled' => true,
            'missed_call_alerts' => true,
            'escalation_alerts' => true,
            'appointment_change_alerts' => true,
            'system_alerts' => true,
        ]);
    }
}
