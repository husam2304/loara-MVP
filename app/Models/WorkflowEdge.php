<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkflowEdge extends Model
{
    /** @use HasFactory<\Database\Factories\WorkflowEdgeFactory> */
    use HasFactory;

    protected $fillable = [
        'squad_workflow_id',
        'source_node_id',
        'target_node_id',
        'condition',
        'description',
        'context_plan',
        'sort_order',
    ];

    public function squadWorkflow(): BelongsTo
    {
        return $this->belongsTo(SquadWorkflow::class);
    }

    public function sourceNode(): BelongsTo
    {
        return $this->belongsTo(WorkflowNode::class, 'source_node_id');
    }

    public function targetNode(): BelongsTo
    {
        return $this->belongsTo(WorkflowNode::class, 'target_node_id');
    }
}
