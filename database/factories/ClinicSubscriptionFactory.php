<?php

namespace Database\Factories;

use App\Enums\BillingCycle;
use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ClinicSubscription>
 */
class ClinicSubscriptionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'plan' => SubscriptionPlan::Professional,
            'billing_cycle' => BillingCycle::Monthly,
            'status' => SubscriptionStatus::Active,
            'price_monthly' => 349.00,
            'call_limit' => 5000,
            'minutes_limit' => 5000,
            'concurrent_limit' => 10,
            'team_member_limit' => 25,
            'current_period_start' => now()->startOfMonth(),
            'current_period_end' => now()->endOfMonth(),
        ];
    }

    public function starter(): static
    {
        return $this->state([
            'plan' => SubscriptionPlan::Starter,
            'price_monthly' => 49.00,
            'call_limit' => 500,
            'minutes_limit' => 500,
            'concurrent_limit' => 2,
            'team_member_limit' => 3,
        ]);
    }

    public function growth(): static
    {
        return $this->state([
            'plan' => SubscriptionPlan::Growth,
            'price_monthly' => 149.00,
            'call_limit' => 2000,
            'minutes_limit' => 2000,
            'concurrent_limit' => 5,
            'team_member_limit' => 10,
        ]);
    }

    public function professional(): static
    {
        return $this->state([
            'plan' => SubscriptionPlan::Professional,
            'price_monthly' => 349.00,
            'call_limit' => 5000,
            'minutes_limit' => 5000,
            'concurrent_limit' => 10,
            'team_member_limit' => 25,
        ]);
    }

    public function enterprise(): static
    {
        return $this->state([
            'plan' => SubscriptionPlan::Enterprise,
            'price_monthly' => 799.00,
            'call_limit' => -1,
            'minutes_limit' => -1,
            'concurrent_limit' => -1,
            'team_member_limit' => -1,
        ]);
    }

    public function trialing(): static
    {
        return $this->state([
            'status' => SubscriptionStatus::Trialing,
            'trial_ends_at' => now()->addDays(7),
        ]);
    }

    public function pastDue(): static
    {
        return $this->state([
            'status' => SubscriptionStatus::PastDue,
        ]);
    }

    public function cancelled(): static
    {
        return $this->state([
            'status' => SubscriptionStatus::Cancelled,
            'cancelled_at' => now(),
        ]);
    }
}
