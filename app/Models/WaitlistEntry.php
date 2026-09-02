<?php

namespace App\Models;

use App\Enums\WaitlistPriority;
use App\Enums\WaitlistStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WaitlistEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'patient_id', 'appointment_type_id', 'preferred_provider_id',
        'preferred_date_start', 'preferred_date_end',
        'preferred_time_start', 'preferred_time_end',
        'priority', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'preferred_date_start' => 'date',
            'preferred_date_end' => 'date',
            'priority' => WaitlistPriority::class,
            'status' => WaitlistStatus::class,
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function appointmentType(): BelongsTo
    {
        return $this->belongsTo(AppointmentType::class);
    }

    public function preferredProvider(): BelongsTo
    {
        return $this->belongsTo(Provider::class, 'preferred_provider_id');
    }
}
