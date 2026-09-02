<?php

namespace App\Models;

use App\Enums\KeywordCategory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TriageKeyword extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'triage_rule_id', 'keyword', 'category', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'category' => KeywordCategory::class,
            'created_at' => 'datetime',
        ];
    }

    public function triageRule(): BelongsTo
    {
        return $this->belongsTo(TriageRule::class);
    }
}
