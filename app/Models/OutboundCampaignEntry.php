<?php

namespace App\Models;

use App\Enums\CampaignEntryStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutboundCampaignEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id', 'patient_id', 'call_id', 'status',
        'attempts', 'last_attempted_at', 'result',
    ];

    protected function casts(): array
    {
        return [
            'status' => CampaignEntryStatus::class,
            'attempts' => 'integer',
            'last_attempted_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(OutboundCampaign::class, 'campaign_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function call(): BelongsTo
    {
        return $this->belongsTo(Call::class);
    }
}
