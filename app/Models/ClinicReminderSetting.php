<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicReminderSetting extends Model
{
    /** @use HasFactory<\Database\Factories\ClinicReminderSettingFactory> */
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'reminders_enabled',
        'reminder_hours',
    ];

    protected $attributes = [
        'reminder_hours' => '[24, 1]',
    ];

    protected function casts(): array
    {
        return [
            'reminders_enabled' => 'boolean',
            'reminder_hours' => 'array',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
