<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowNode extends Model
{
    /** @use HasFactory<\Database\Factories\WorkflowNodeFactory> */
    use HasFactory;

    protected $fillable = [
        'squad_workflow_id',
        'name',
        'role',
        'system_prompt',
        'greeting_message',
        'model',
        'temperature',
        'voice_provider',
        'voice_name',
        'tool_names',
        'is_entry_point',
        'sort_order',
        'vapi_assistant_id',
    ];

    protected function casts(): array
    {
        return [
            'tool_names' => 'array',
            'temperature' => 'decimal:1',
            'is_entry_point' => 'boolean',
        ];
    }

    public function squadWorkflow(): BelongsTo
    {
        return $this->belongsTo(SquadWorkflow::class);
    }

    public function outgoingEdges(): HasMany
    {
        return $this->hasMany(WorkflowEdge::class, 'source_node_id');
    }

    public function incomingEdges(): HasMany
    {
        return $this->hasMany(WorkflowEdge::class, 'target_node_id');
    }
}
