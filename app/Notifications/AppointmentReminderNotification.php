<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AppointmentReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Appointment $appointment,
        public string $reminderType,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $patient = $this->appointment->patient;
        $provider = $this->appointment->provider;
        $clinic = $this->appointment->clinic;

        // Render times in the clinic's local timezone, not the app's UTC default,
        // otherwise every reminder shows the wrong time for non-UTC clinics.
        $timezone = $clinic?->timezone ?: config('app.timezone');
        $scheduledAt = $this->appointment->scheduled_at->copy()->setTimezone($timezone);

        $clinicName = $clinic?->name ?? config('app.name');
        $patientName = $patient?->first_name ?? 'there';
        $providerName = trim("{$provider?->title} {$provider?->first_name} {$provider?->last_name}") ?: 'your provider';
        $location = $clinic ? trim("{$clinic->name}, {$clinic->address}", ', ') : $clinicName;

        return (new MailMessage)
            ->subject("Appointment Reminder — {$clinicName}")
            ->greeting("Hello {$patientName},")
            ->line('This is a reminder about your upcoming appointment:')
            ->line("**Date:** {$scheduledAt->format('l, F j, Y')}")
            ->line("**Time:** {$scheduledAt->format('g:i A')}")
            ->line("**Provider:** {$providerName}")
            ->line("**Location:** {$location}")
            ->action('View Appointments', url('/appointments'))
            ->line('If you need to reschedule or cancel, please contact us.')
            ->salutation("Thank you,\n{$clinicName}");
    }
}
