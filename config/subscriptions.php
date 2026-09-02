<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Payment Gateway
    |--------------------------------------------------------------------------
    |
    | The default payment gateway to use for subscription billing.
    | Supported: "stripe" (more can be added by implementing PaymentGatewayContract)
    |
    */

    'default_gateway' => env('PAYMENT_GATEWAY', 'stripe'),

    /*
    |--------------------------------------------------------------------------
    | Trial & Grace Period
    |--------------------------------------------------------------------------
    */

    'trial_days' => (int) env('SUBSCRIPTION_TRIAL_DAYS', 7),

    'grace_period_days' => 7,

    /*
    |--------------------------------------------------------------------------
    | Subscription Plans
    |--------------------------------------------------------------------------
    |
    | Each plan defines pricing, limits, and features. Stripe price IDs come
    | from environment variables so they differ per environment (test/live).
    | A minutes_limit of -1 means unlimited.
    |
    */

    'plans' => [
        'starter' => [
            'name' => 'Starter',
            'stripe_price_monthly' => env('STRIPE_PRICE_STARTER_MONTHLY'),
            'stripe_price_yearly' => env('STRIPE_PRICE_STARTER_YEARLY'),
            'price_monthly' => 49,
            'price_yearly' => 470,
            'minutes_limit' => 500,
            'concurrent_limit' => 2,
            'team_member_limit' => 3,
            'features' => [
                'ai_calls',
                'appointment_booking',
                'basic_analytics',
            ],
        ],

        'growth' => [
            'name' => 'Growth',
            'stripe_price_monthly' => env('STRIPE_PRICE_GROWTH_MONTHLY'),
            'stripe_price_yearly' => env('STRIPE_PRICE_GROWTH_YEARLY'),
            'price_monthly' => 149,
            'price_yearly' => 1430,
            'minutes_limit' => 2000,
            'concurrent_limit' => 5,
            'team_member_limit' => 10,
            'features' => [
                'ai_calls',
                'appointment_booking',
                'advanced_analytics',
                'sms',
                'integrations',
            ],
        ],

        'professional' => [
            'name' => 'Professional',
            'stripe_price_monthly' => env('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
            'stripe_price_yearly' => env('STRIPE_PRICE_PROFESSIONAL_YEARLY'),
            'price_monthly' => 349,
            'price_yearly' => 3350,
            'minutes_limit' => 5000,
            'concurrent_limit' => 10,
            'team_member_limit' => 25,
            'features' => [
                'ai_calls',
                'appointment_booking',
                'advanced_analytics',
                'sms',
                'integrations',
                'triage',
                'campaigns',
            ],
        ],

        'enterprise' => [
            'name' => 'Enterprise',
            'stripe_price_monthly' => env('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
            'stripe_price_yearly' => env('STRIPE_PRICE_ENTERPRISE_YEARLY'),
            'price_monthly' => 799,
            'price_yearly' => 7670,
            'minutes_limit' => -1,
            'concurrent_limit' => -1,
            'team_member_limit' => -1,
            'features' => [
                'ai_calls',
                'appointment_booking',
                'advanced_analytics',
                'sms',
                'integrations',
                'triage',
                'campaigns',
                'custom_workflows',
                'priority_support',
            ],
        ],
    ],

];
