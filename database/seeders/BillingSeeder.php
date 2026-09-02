<?php

namespace Database\Seeders;

use App\Enums\InvoiceStatus;
use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
use App\Enums\UsageType;
use App\Models\Clinic;
use App\Models\ClinicSubscription;
use App\Models\Invoice;
use App\Models\PlanConfiguration;
use App\Models\UsageRecord;
use Illuminate\Database\Seeder;

class BillingSeeder extends Seeder
{
    public function run(): void
    {
        // Lead demo clinic is on Enterprise so every feature (incl. the workflow
        // builder, triage, integrations, advanced analytics) is reachable in the
        // demo; the second clinic shows a mid-tier plan. Limits are pulled from
        // the seeded PlanConfiguration so the subscription matches the plan.
        $planOrder = [SubscriptionPlan::Enterprise, SubscriptionPlan::Professional];

        foreach (Clinic::all() as $i => $clinic) {
            $plan = $planOrder[$i % count($planOrder)];
            $config = PlanConfiguration::where('slug', $plan->value)->first();

            $price = (float) ($config?->price_monthly ?? 0);
            $minutesLimit = $config?->minutes_limit ?? 5000;
            $concurrentLimit = $config?->concurrent_limit ?? 5;
            $teamLimit = $config?->team_member_limit ?? 10;

            // -1 means "unlimited" (Enterprise). The limit columns are signed so
            // the sentinel is stored as-is; UsageService/FeatureGateService treat
            // -1 as unlimited.
            $subscription = ClinicSubscription::create([
                'clinic_id' => $clinic->id,
                'plan' => $plan,
                'status' => SubscriptionStatus::Active,
                'price_monthly' => $price,
                'call_limit' => $minutesLimit,
                'minutes_limit' => $minutesLimit,
                'concurrent_limit' => $concurrentLimit,
                'team_member_limit' => $teamLimit,
                'current_period_start' => now()->startOfMonth(),
                'current_period_end' => now()->endOfMonth(),
            ]);

            for ($j = 4; $j >= 0; $j--) {
                $periodStart = now()->subMonths($j + 1)->startOfMonth();
                $periodEnd = now()->subMonths($j + 1)->endOfMonth();

                Invoice::create([
                    'clinic_id' => $clinic->id,
                    'subscription_id' => $subscription->id,
                    'number' => 'INV-'.$clinic->id.'-'.$periodStart->format('Y').'-'.str_pad(12 - $j, 3, '0', STR_PAD_LEFT),
                    'amount' => $price,
                    'tax' => 0,
                    'total' => $price,
                    'status' => $j === 0 ? InvoiceStatus::Pending : InvoiceStatus::Paid,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'paid_at' => $j === 0 ? null : $periodEnd->copy()->addDays(3),
                    'due_at' => $periodEnd->copy()->addDays(15),
                ]);
            }

            $today = now();
            for ($d = 13; $d >= 0; $d--) {
                $date = $today->copy()->subDays($d);

                UsageRecord::create([
                    'clinic_id' => $clinic->id,
                    'type' => UsageType::AiCallMinutes,
                    'quantity' => fake()->numberBetween(120, 380),
                    'recorded_date' => $date,
                    'created_at' => $date,
                ]);

                UsageRecord::create([
                    'clinic_id' => $clinic->id,
                    'type' => UsageType::SmsSent,
                    'quantity' => fake()->numberBetween(15, 60),
                    'recorded_date' => $date,
                    'created_at' => $date,
                ]);
            }
        }
    }
}
