<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'email_enabled', 'sms_enabled', 'push_enabled',
        'missed_call_alerts', 'escalation_alerts', 'daily_digest',
        'appointment_change_alerts', 'system_alerts',
        'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
    ];

    protected function casts(): array
    {
        return [
            'email_enabled' => 'boolean',
            'sms_enabled' => 'boolean',
            'push_enabled' => 'boolean',
            'missed_call_alerts' => 'boolean',
            'escalation_alerts' => 'boolean',
            'daily_digest' => 'boolean',
            'appointment_change_alerts' => 'boolean',
            'system_alerts' => 'boolean',
            'quiet_hours_enabled' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
