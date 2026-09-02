<?php

namespace App\Models;

use App\Enums\IntakeFormChannel;
use App\Enums\IntakeFormStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntakeForm extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'patient_id', 'status', 'form_data',
        'sent_via', 'sent_at', 'completed_at', 'expires_at', 'token',
    ];

    protected function casts(): array
    {
        return [
            'status' => IntakeFormStatus::class,
            'form_data' => 'array',
            'sent_via' => IntakeFormChannel::class,
            'sent_at' => 'datetime',
            'completed_at' => 'datetime',
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
}
