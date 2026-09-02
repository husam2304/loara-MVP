<?php

namespace Database\Seeders;

use App\Models\PlanConfiguration;
use Illuminate\Database\Seeder;

class PlanConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'slug' => 'starter',
                'name' => 'Starter',
                'description' => 'Perfect for small clinics getting started with AI-powered communication.',
                'price_monthly' => 49.00,
                'price_yearly' => 470.00,
                'minutes_limit' => 500,
                'concurrent_limit' => 2,
                'team_member_limit' => 3,
                'features' => ['ai_calls', 'appointment_booking', 'basic_analytics'],
                'stripe_price_monthly' => config('subscriptions.plans.starter.stripe_price_monthly'),
                'stripe_price_yearly' => config('subscriptions.plans.starter.stripe_price_yearly'),
                'sort_order' => 0,
            ],
            [
                'slug' => 'growth',
                'name' => 'Growth',
                'description' => 'For growing practices with higher call volume and team needs.',
                'price_monthly' => 149.00,
                'price_yearly' => 1430.00,
                'minutes_limit' => 2000,
                'concurrent_limit' => 5,
                'team_member_limit' => 10,
                'features' => ['ai_calls', 'appointment_booking', 'advanced_analytics', 'sms', 'integrations'],
                'stripe_price_monthly' => config('subscriptions.plans.growth.stripe_price_monthly'),
                'stripe_price_yearly' => config('subscriptions.plans.growth.stripe_price_yearly'),
                'sort_order' => 1,
            ],
            [
                'slug' => 'professional',
                'name' => 'Professional',
                'description' => 'For established clinics needing advanced features and higher limits.',
                'price_monthly' => 349.00,
                'price_yearly' => 3350.00,
                'minutes_limit' => 5000,
                'concurrent_limit' => 10,
                'team_member_limit' => 25,
                'features' => ['ai_calls', 'appointment_booking', 'advanced_analytics', 'sms', 'integrations', 'triage', 'campaigns'],
                'stripe_price_monthly' => config('subscriptions.plans.professional.stripe_price_monthly'),
                'stripe_price_yearly' => config('subscriptions.plans.professional.stripe_price_yearly'),
                'sort_order' => 2,
            ],
            [
                'slug' => 'enterprise',
                'name' => 'Enterprise',
                'description' => 'Unlimited everything for large healthcare organizations.',
                'price_monthly' => 799.00,
                'price_yearly' => 7670.00,
                'minutes_limit' => -1,
                'concurrent_limit' => -1,
                'team_member_limit' => -1,
                'features' => ['ai_calls', 'appointment_booking', 'advanced_analytics', 'sms', 'integrations', 'triage', 'campaigns', 'custom_workflows', 'priority_support'],
                'stripe_price_monthly' => config('subscriptions.plans.enterprise.stripe_price_monthly'),
                'stripe_price_yearly' => config('subscriptions.plans.enterprise.stripe_price_yearly'),
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            PlanConfiguration::updateOrCreate(
                ['slug' => $plan['slug']],
                $plan,
            );
        }
    }
}
