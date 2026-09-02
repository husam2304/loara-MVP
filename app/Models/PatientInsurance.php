<?php

namespace App\Models;

use App\Enums\InsurancePlanType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientInsurance extends Model
{
    use HasFactory;

    protected $table = 'patient_insurance';

    protected $fillable = [
        'patient_id', 'insurance_provider_id', 'member_id', 'group_number',
        'plan_type', 'copay_amount', 'is_primary', 'effective_date', 'expiration_date',
    ];

    protected function casts(): array
    {
        return [
            'plan_type' => InsurancePlanType::class,
            'copay_amount' => 'decimal:2',
            'is_primary' => 'boolean',
            'effective_date' => 'date',
            'expiration_date' => 'date',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function insuranceProvider(): BelongsTo
    {
        return $this->belongsTo(InsuranceProvider::class);
    }
}
