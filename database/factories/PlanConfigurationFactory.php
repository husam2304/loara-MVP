<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PlanConfiguration>
 */
class PlanConfigurationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => 'starter',
            'name' => 'Starter',
            'description' => 'Perfect for small clinics getting started.',
            'price_monthly' => 49.00,
            'price_yearly' => 470.00,
            'minutes_limit' => 500,
            'concurrent_limit' => 2,
            'team_member_limit' => 3,
            'features' => ['ai_calls', 'appointment_booking', 'basic_analytics'],
            'stripe_price_monthly' => null,
            'stripe_price_yearly' => null,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    public function growth(): static
    {
        return $this->state(fn () => [
            'slug' => 'growth',
            'name' => 'Growth',
            'description' => 'For growing practices with higher volume.',
            'price_monthly' => 149.00,
            'price_yearly' => 1430.00,
            'minutes_limit' => 2000,
            'concurrent_limit' => 5,
            'team_member_limit' => 10,
            'features' => ['ai_calls', 'appointment_booking', 'advanced_analytics', 'sms', 'integrations'],
            'sort_order' => 1,
        ]);
    }

    public function professional(): static
    {
        return $this->state(fn () => [
            'slug' => 'professional',
            'name' => 'Professional',
            'description' => 'For established clinics needing advanced features.',
            'price_monthly' => 349.00,
            'price_yearly' => 3350.00,
            'minutes_limit' => 5000,
            'concurrent_limit' => 10,
            'team_member_limit' => 25,
            'features' => ['ai_calls', 'appointment_booking', 'advanced_analytics', 'sms', 'integrations', 'triage', 'campaigns'],
            'sort_order' => 2,
        ]);
    }

    public function enterprise(): static
    {
        return $this->state(fn () => [
            'slug' => 'enterprise',
            'name' => 'Enterprise',
            'description' => 'Unlimited everything for large organizations.',
            'price_monthly' => 799.00,
            'price_yearly' => 7670.00,
            'minutes_limit' => -1,
            'concurrent_limit' => -1,
            'team_member_limit' => -1,
            'features' => ['ai_calls', 'appointment_booking', 'advanced_analytics', 'sms', 'integrations', 'triage', 'campaigns', 'custom_workflows', 'priority_support'],
            'sort_order' => 3,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => [
            'is_active' => false,
        ]);
    }
}
