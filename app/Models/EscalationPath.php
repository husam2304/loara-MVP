<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EscalationPath extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'level', 'name', 'description',
        'target_role', 'timeout_seconds', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'timeout_seconds' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
