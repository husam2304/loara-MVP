<?php

namespace App\Models;

use App\Enums\BillingCycle;
use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClinicSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'plan', 'billing_cycle', 'status', 'price_monthly',
        'call_limit', 'minutes_limit', 'concurrent_limit', 'team_member_limit',
        'stripe_subscription_id', 'stripe_customer_id',
        'gateway', 'gateway_subscription_id', 'gateway_customer_id',
        'trial_ends_at', 'current_period_start', 'current_period_end', 'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'plan' => SubscriptionPlan::class,
            'billing_cycle' => BillingCycle::class,
            'status' => SubscriptionStatus::class,
            'price_monthly' => 'decimal:2',
            'call_limit' => 'integer',
            'minutes_limit' => 'integer',
            'concurrent_limit' => 'integer',
            'team_member_limit' => 'integer',
            'trial_ends_at' => 'datetime',
            'current_period_start' => 'date',
            'current_period_end' => 'date',
            'cancelled_at' => 'datetime',
        ];
    }

    public function isActive(): bool
    {
        if ($this->status === SubscriptionStatus::Active) {
            return true;
        }

        if ($this->status === SubscriptionStatus::Trialing) {
            return ! $this->trial_ends_at || $this->trial_ends_at->isFuture();
        }

        return false;
    }

    public function isPastDue(): bool
    {
        return $this->status === SubscriptionStatus::PastDue;
    }

    public function isCancelled(): bool
    {
        return $this->status === SubscriptionStatus::Cancelled;
    }

    /**
     * Get plan configuration — reads from DB PlanConfiguration first, falls back to config file.
     *
     * @return array<string, mixed>
     */
    public function planConfig(): array
    {
        if (! $this->plan) {
            return [];
        }

        $dbPlan = PlanConfiguration::where('slug', $this->plan->value)->first();

        if ($dbPlan) {
            return $dbPlan->toArray();
        }

        return config("subscriptions.plans.{$this->plan->value}", []);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'subscription_id');
    }
}
