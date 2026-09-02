<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SquadWorkflow extends Model
{
    /** @use HasFactory<\Database\Factories\SquadWorkflowFactory> */
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'name',
        'description',
        'is_active',
        'vapi_squad_id',
        'deployed_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'deployed_at' => 'datetime',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function nodes(): HasMany
    {
        return $this->hasMany(WorkflowNode::class)->orderBy('sort_order');
    }

    public function edges(): HasMany
    {
        return $this->hasMany(WorkflowEdge::class)->orderBy('sort_order');
    }

    public function entryNode(): HasOne
    {
        return $this->hasOne(WorkflowNode::class)->where('is_entry_point', true);
    }
}
