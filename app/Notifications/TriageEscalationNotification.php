<?php

namespace App\Notifications;

use App\Models\Call;
use App\Models\TriageRule;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TriageEscalationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<int, string>  $matchedKeywords
     */
    public function __construct(
        public TriageRule $rule,
        public Call $call,
        public string $symptoms,
        public array $matchedKeywords,
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
        $clinic = $this->rule->clinic;
        $clinicName = $clinic?->name ?? config('app.name');
        $priorityLabel = ucfirst($this->rule->priority->value);
        $callerName = $this->call->caller_name ?: 'Unknown caller';

        $mail = (new MailMessage)
            ->subject("{$priorityLabel} triage alert — {$this->rule->name}")
            ->greeting("Hello {$notifiable->name},")
            ->line("A caller at {$clinicName} was flagged by the \"{$this->rule->name}\" triage rule ({$priorityLabel} priority).")
            ->line("Caller: {$callerName} ({$this->call->caller_phone})")
            ->line("Reported symptoms: {$this->symptoms}");

        if (! empty($this->matchedKeywords)) {
            $mail->line('Matched keywords: '.implode(', ', $this->matchedKeywords));
        }

        return $mail
            ->action('View Call', route('call-center.call-detail', $this->call->id))
            ->line('Please follow up as soon as possible.');
    }
}
