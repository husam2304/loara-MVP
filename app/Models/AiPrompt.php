<?php

namespace App\Models;

use App\Enums\AiPromptType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiPrompt extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'name', 'type', 'content', 'is_active', 'version',
    ];

    protected function casts(): array
    {
        return [
            'type' => AiPromptType::class,
            'is_active' => 'boolean',
            'version' => 'integer',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
