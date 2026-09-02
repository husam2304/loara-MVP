<?php

namespace App\Models;

use App\Enums\CallDirection;
use App\Enums\CallResolution;
use App\Enums\CallSentiment;
use App\Enums\CallStatus;
use App\Enums\CallType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Call extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'vapi_call_id', 'direction', 'caller_phone', 'caller_name',
        'patient_id', 'patient_verified', 'type', 'status', 'end_reason', 'duration_seconds',
        'started_at', 'ended_at', 'answered_at',
        'transferred_to', 'transfer_reason',
        'ai_handled', 'ai_confidence_score', 'tool_failure_count', 'sentiment', 'language',
        'resolution', 'summary', 'cost',
    ];

    protected function casts(): array
    {
        return [
            'direction' => CallDirection::class,
            'type' => CallType::class,
            'status' => CallStatus::class,
            'sentiment' => CallSentiment::class,
            'resolution' => CallResolution::class,
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'answered_at' => 'datetime',
            'ai_handled' => 'boolean',
            'patient_verified' => 'boolean',
            'ai_confidence_score' => 'decimal:2',
            'tool_failure_count' => 'integer',
            'duration_seconds' => 'integer',
            'cost' => 'decimal:4',
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

    public function transferredToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'transferred_to');
    }

    public function transcripts(): HasMany
    {
        return $this->hasMany(CallTranscript::class);
    }

    public function recording(): HasOne
    {
        return $this->hasOne(CallRecording::class);
    }

    public function toolInvocations(): HasMany
    {
        return $this->hasMany(CallToolInvocation::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
