<?php

namespace App\Models;

use App\Enums\CallSpeaker;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallTranscript extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'call_id', 'speaker', 'content', 'timestamp_ms', 'confidence', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'speaker' => CallSpeaker::class,
            'timestamp_ms' => 'integer',
            'confidence' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    public function call(): BelongsTo
    {
        return $this->belongsTo(Call::class);
    }
}
