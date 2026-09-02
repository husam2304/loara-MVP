<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InsuranceProvider extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'clinic_id', 'name', 'payer_id', 'phone', 'email', 'website',
        'is_accepted', 'plan_types', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_accepted' => 'boolean',
            'plan_types' => 'array',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function patientInsurance(): HasMany
    {
        return $this->hasMany(PatientInsurance::class);
    }

    public function claims(): HasMany
    {
        return $this->hasMany(InsuranceClaim::class);
    }

    public function priorAuthorizations(): HasMany
    {
        return $this->hasMany(PriorAuthorization::class);
    }

    public function eligibilityVerifications(): HasMany
    {
        return $this->hasMany(EligibilityVerification::class);
    }
}
