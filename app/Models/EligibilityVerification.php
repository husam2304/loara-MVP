<?php

namespace App\Models;

use App\Enums\EligibilityVerificationStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EligibilityVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'patient_insurance_id',
        'insurance_provider_id',
        'provider_id',
        'status',
        'payer_id',
        'member_id',
        'service_date',
        'service_type_codes',
        'plan_details',
        'coverages',
        'raw_response',
        'error_message',
        'verified_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => EligibilityVerificationStatus::class,
            'service_date' => 'date',
            'service_type_codes' => 'array',
            'plan_details' => 'array',
            'coverages' => 'array',
            'raw_response' => 'array',
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

    public function patientInsurance(): BelongsTo
    {
        return $this->belongsTo(PatientInsurance::class);
    }

    public function insuranceProvider(): BelongsTo
    {
        return $this->belongsTo(InsuranceProvider::class);
    }

    public function renderingProvider(): BelongsTo
    {
        return $this->belongsTo(Provider::class, 'provider_id');
    }

    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
