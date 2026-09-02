<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlanConfiguration extends Model
{
    /** @use HasFactory<\Database\Factories\PlanConfigurationFactory> */
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'description',
        'price_monthly',
        'price_yearly',
        'minutes_limit',
        'concurrent_limit',
        'team_member_limit',
        'features',
        'stripe_product_id',
        'stripe_price_monthly',
        'stripe_price_yearly',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price_monthly' => 'decimal:2',
            'price_yearly' => 'decimal:2',
            'minutes_limit' => 'integer',
            'concurrent_limit' => 'integer',
            'team_member_limit' => 'integer',
            'features' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order');
    }
}
