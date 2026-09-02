<?php

namespace App\Models;

use App\Enums\SyncDirection;
use App\Enums\SyncStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationSyncLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'integration_id', 'direction', 'entity_type', 'entity_id',
        'status', 'records_processed', 'records_failed',
        'error_details', 'started_at', 'completed_at', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'direction' => SyncDirection::class,
            'status' => SyncStatus::class,
            'records_processed' => 'integer',
            'records_failed' => 'integer',
            'error_details' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function integration(): BelongsTo
    {
        return $this->belongsTo(Integration::class);
    }
}
