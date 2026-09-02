<?php

namespace App\Models;

use App\Enums\TriageAction;
use App\Enums\TriagePriority;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TriageRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'name', 'description', 'priority', 'conditions',
        'action', 'target_role', 'target_user_id', 'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'priority' => TriagePriority::class,
            'conditions' => 'array',
            'action' => TriageAction::class,
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    public function keywords(): HasMany
    {
        return $this->hasMany(TriageKeyword::class);
    }
}
