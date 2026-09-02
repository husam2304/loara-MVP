<?php

namespace App\Models;

use App\Enums\AppointmentSource;
use App\Enums\AppointmentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'patient_id', 'provider_id', 'appointment_type_id',
        'scheduled_at', 'ends_at', 'status', 'room', 'reason', 'notes',
        'booked_by', 'call_id', 'source', 'confirmation_sent_at', 'reminder_sent_at',
        'cancelled_at', 'cancellation_reason',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'ends_at' => 'datetime',
            'status' => AppointmentStatus::class,
            'source' => AppointmentSource::class,
            'confirmation_sent_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    /**
     * Determine whether a provider already has an active appointment overlapping
     * the given window. Cancelled and no-show appointments free up the slot.
     */
    public static function hasConflict(int $clinicId, int $providerId, \DateTimeInterface $start, \DateTimeInterface $end, ?int $ignoreId = null): bool
    {
        return static::query()
            ->where('clinic_id', $clinicId)
            ->where('provider_id', $providerId)
            ->whereNotIn('status', [AppointmentStatus::Cancelled, AppointmentStatus::NoShow])
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->where('scheduled_at', '<', $end)
            ->where('ends_at', '>', $start)
            ->exists();
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }

    public function appointmentType(): BelongsTo
    {
        return $this->belongsTo(AppointmentType::class);
    }

    public function call(): BelongsTo
    {
        return $this->belongsTo(Call::class);
    }

    public function bookedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'booked_by');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function claims(): HasMany
    {
        return $this->hasMany(InsuranceClaim::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(AppointmentReminder::class);
    }
}
