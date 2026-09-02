<?php

namespace App\Models;

use App\Enums\CallToolName;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallToolInvocation extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'call_id', 'tool_name', 'input_payload', 'output_payload',
        'duration_ms', 'success', 'error_message', 'invoked_at', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'tool_name' => CallToolName::class,
            'input_payload' => 'array',
            'output_payload' => 'array',
            'duration_ms' => 'integer',
            'success' => 'boolean',
            'invoked_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function call(): BelongsTo
    {
        return $this->belongsTo(Call::class);
    }
}
