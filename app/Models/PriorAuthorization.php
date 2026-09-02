<?php

namespace App\Models;

use App\Enums\AuthorizationStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PriorAuthorization extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'patient_id', 'insurance_provider_id',
        'authorization_number', 'procedure_name', 'procedure_code',
        'status', 'requested_at', 'decided_at', 'expires_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => AuthorizationStatus::class,
            'requested_at' => 'datetime',
            'decided_at' => 'datetime',
            'expires_at' => 'datetime',
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

    public function insuranceProvider(): BelongsTo
    {
        return $this->belongsTo(InsuranceProvider::class);
    }
}
