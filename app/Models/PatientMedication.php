<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientMedication extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id', 'medication_name', 'dosage', 'frequency',
        'prescribing_provider_id', 'start_date', 'end_date', 'refill_date', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'refill_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function prescribingProvider(): BelongsTo
    {
        return $this->belongsTo(Provider::class, 'prescribing_provider_id');
    }
}
