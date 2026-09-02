<?php

namespace App\Models;

use App\Enums\UsageType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UsageRecord extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'clinic_id', 'type', 'quantity', 'recorded_date', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => UsageType::class,
            'quantity' => 'decimal:2',
            'recorded_date' => 'date',
            'created_at' => 'datetime',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
