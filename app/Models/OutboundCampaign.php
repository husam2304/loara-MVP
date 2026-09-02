<?php

namespace App\Models;

use App\Enums\CampaignStatus;
use App\Enums\CampaignType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OutboundCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'name', 'type', 'status', 'message_template',
        'target_criteria', 'scheduled_at', 'started_at', 'completed_at',
        'total_targets', 'calls_made', 'calls_answered', 'calls_failed',
    ];

    protected function casts(): array
    {
        return [
            'type' => CampaignType::class,
            'status' => CampaignStatus::class,
            'target_criteria' => 'array',
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'total_targets' => 'integer',
            'calls_made' => 'integer',
            'calls_answered' => 'integer',
            'calls_failed' => 'integer',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(OutboundCampaignEntry::class, 'campaign_id');
    }
}
