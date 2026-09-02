<?php

namespace App\Models;

use App\Enums\ClaimStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InsuranceClaim extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'patient_id', 'appointment_id', 'insurance_provider_id',
        'claim_number', 'amount', 'approved_amount', 'status',
        'submitted_at', 'resolved_at', 'denial_reason', 'notes',
        'claim_md_id', 'payer_claim_id', 'claim_md_status', 'paid_amount',
        'claim_md_response', 'submitted_to_payer_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'approved_amount' => 'decimal:2',
            'status' => ClaimStatus::class,
            'paid_amount' => 'decimal:2',
            'claim_md_response' => 'array',
            'submitted_at' => 'datetime',
            'resolved_at' => 'datetime',
            'submitted_to_payer_at' => 'datetime',
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

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function insuranceProvider(): BelongsTo
    {
        return $this->belongsTo(InsuranceProvider::class);
    }
}
