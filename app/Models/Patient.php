<?php

namespace App\Models;

use App\Enums\Gender;
use App\Enums\PatientSource;
use App\Enums\PatientStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'clinic_id', 'first_name', 'last_name', 'date_of_birth', 'gender',
        'phone', 'email', 'address', 'city', 'state', 'zip_code',
        'emergency_contact_name', 'emergency_contact_phone',
        'preferred_language', 'preferred_provider_id', 'status', 'source',
        'avatar_color', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'gender' => Gender::class,
            'status' => PatientStatus::class,
            'source' => PatientSource::class,
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function preferredProvider(): BelongsTo
    {
        return $this->belongsTo(Provider::class, 'preferred_provider_id');
    }

    public function allergies(): HasMany
    {
        return $this->hasMany(PatientAllergy::class);
    }

    public function medications(): HasMany
    {
        return $this->hasMany(PatientMedication::class);
    }

    public function vitals(): HasMany
    {
        return $this->hasMany(PatientVital::class);
    }

    public function insurancePolicies(): HasMany
    {
        return $this->hasMany(PatientInsurance::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function calls(): HasMany
    {
        return $this->hasMany(Call::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
