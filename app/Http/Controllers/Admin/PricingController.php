<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GatewayType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePlanRequest;
use App\Http\Requests\Admin\UpdatePlanRequest;
use App\Models\ClinicSubscription;
use App\Models\GatewayConfiguration;
use App\Models\PlanConfiguration;
use App\Services\StripeSyncService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PricingController extends Controller
{
    public function index(): Response
    {
        $plans = PlanConfiguration::query()
            ->ordered()
            ->get()
            ->map(function (PlanConfiguration $plan) {
                $plan->subscriber_count = ClinicSubscription::where('plan', $plan->slug)->count();

                return $plan;
            });

        return Inertia::render('Platform/Pricing', [
            'plans' => $plans,
        ]);
    }

    public function store(StorePlanRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['sort_order'] = PlanConfiguration::max('sort_order') + 1;

        PlanConfiguration::create($data);

        return back()->with('success', 'Plan created successfully.');
    }

    public function update(UpdatePlanRequest $request, PlanConfiguration $plan): RedirectResponse
    {
        $plan->update($request->validated());

        return back()->with('success', 'Plan updated successfully.');
    }

    public function destroy(PlanConfiguration $plan): RedirectResponse
    {
        $activeSubscribers = ClinicSubscription::where('plan', $plan->slug)->count();

        if ($activeSubscribers > 0) {
            return back()->with('error', "Cannot delete plan with {$activeSubscribers} active subscriber(s).");
        }

        $plan->delete();

        return back()->with('success', 'Plan deleted successfully.');
    }

    public function syncToStripe(PlanConfiguration $plan, StripeSyncService $stripe): RedirectResponse
    {
        $secretKey = $this->resolveStripeSecretKey();

        if (! $secretKey) {
            return back()->with('error', 'Stripe secret key is not configured. Please set up your payment gateway first.');
        }

        $stripe->setApiKey($secretKey);

        try {
            if ($plan->stripe_product_id) {
                $stripe->updateProduct($plan->stripe_product_id, [
                    'name' => $plan->name,
                    'description' => $plan->description ?? "MedDesk AI {$plan->name} plan",
                    'metadata' => [
                        'plan_slug' => $plan->slug,
                        'plan_id' => $plan->id,
                        'minutes_limit' => $plan->minutes_limit,
                        'concurrent_limit' => $plan->concurrent_limit,
                        'team_member_limit' => $plan->team_member_limit,
                    ],
                ]);
            } else {
                $product = $stripe->createProduct([
                    'name' => $plan->name,
                    'description' => $plan->description ?? "MedDesk AI {$plan->name} plan",
                    'metadata' => [
                        'plan_slug' => $plan->slug,
                        'plan_id' => $plan->id,
                        'minutes_limit' => $plan->minutes_limit,
                        'concurrent_limit' => $plan->concurrent_limit,
                        'team_member_limit' => $plan->team_member_limit,
                    ],
                ]);

                $plan->stripe_product_id = $product->id;
            }

            $monthlyPriceId = $this->syncPrice(
                $stripe,
                $plan->stripe_product_id,
                $plan->stripe_price_monthly,
                (int) round($plan->price_monthly * 100),
                'month',
                "{$plan->name} — Monthly",
            );

            $yearlyPriceId = $this->syncPrice(
                $stripe,
                $plan->stripe_product_id,
                $plan->stripe_price_yearly,
                (int) round($plan->price_yearly * 100),
                'year',
                "{$plan->name} — Yearly",
            );

            $plan->update([
                'stripe_product_id' => $plan->stripe_product_id,
                'stripe_price_monthly' => $monthlyPriceId,
                'stripe_price_yearly' => $yearlyPriceId,
            ]);

            return back()->with('success', "Stripe product and prices synced for {$plan->name}.");
        } catch (\Exception $e) {
            return back()->with('error', 'Stripe sync failed: '.$e->getMessage());
        }
    }

    /**
     * Sync a single price — create new if none exists or amount changed, otherwise keep existing.
     */
    private function syncPrice(StripeSyncService $stripe, string $productId, ?string $existingPriceId, int $unitAmount, string $interval, string $nickname): string
    {
        if ($existingPriceId) {
            try {
                $existing = $stripe->retrievePrice($existingPriceId);

                if ((int) $existing->unit_amount === $unitAmount && $existing->recurring?->interval === $interval) {
                    return $existingPriceId;
                }

                $stripe->deactivatePrice($existingPriceId);
            } catch (\Exception) {
                // Price doesn't exist in Stripe, create a new one
            }
        }

        $price = $stripe->createPrice([
            'product' => $productId,
            'unit_amount' => $unitAmount,
            'currency' => 'usd',
            'recurring' => ['interval' => $interval],
            'nickname' => $nickname,
            'metadata' => [
                'product_id' => $productId,
                'interval' => $interval,
            ],
        ]);

        return $price->id;
    }

    private function resolveStripeSecretKey(): ?string
    {
        $dbConfig = GatewayConfiguration::query()
            ->where('gateway', GatewayType::Stripe)
            ->whereNull('clinic_id')
            ->where('is_active', true)
            ->first();

        if ($dbConfig && $dbConfig->getCredential('secret_key')) {
            return $dbConfig->getCredential('secret_key');
        }

        return config('services.stripe.secret');
    }
}
