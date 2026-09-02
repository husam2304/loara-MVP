<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientVital extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id', 'recorded_by', 'heart_rate', 'blood_pressure_systolic',
        'blood_pressure_diastolic', 'temperature', 'weight', 'height',
        'oxygen_saturation', 'respiratory_rate', 'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'heart_rate' => 'integer',
            'blood_pressure_systolic' => 'integer',
            'blood_pressure_diastolic' => 'integer',
            'temperature' => 'decimal:1',
            'weight' => 'decimal:1',
            'height' => 'decimal:1',
            'oxygen_saturation' => 'integer',
            'respiratory_rate' => 'integer',
            'recorded_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
