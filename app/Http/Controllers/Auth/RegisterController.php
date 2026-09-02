<?php

namespace App\Http\Controllers\Auth;

use App\Enums\BillingCycle;
use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterStep1Request;
use App\Http\Requests\RegisterStep2Request;
use App\Http\Requests\RegisterStep3Request;
use App\Models\Clinic;
use App\Models\ClinicSubscription;
use App\Models\PlanConfiguration;
use App\Models\User;
use App\Services\ClinicProvisioner;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class RegisterController extends Controller
{
    public function showStep(Request $request, int $step = 1): Response|RedirectResponse
    {
        $step = max(1, min(4, $step));

        $completedSteps = $request->session()->get('register.completed_steps', 0);

        if ($step > $completedSteps + 1) {
            return redirect()->route('register.step', ['step' => $completedSteps + 1]);
        }

        $formData = $request->session()->get('register', []);

        $plans = $step >= 3
            ? PlanConfiguration::query()
                ->active()
                ->ordered()
                ->get()
                ->map(fn (PlanConfiguration $plan) => [
                    'slug' => $plan->slug,
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'price_monthly' => (float) $plan->price_monthly,
                    'price_yearly' => (float) $plan->price_yearly,
                    'minutes_limit' => $plan->minutes_limit,
                    'concurrent_limit' => $plan->concurrent_limit,
                    'team_member_limit' => $plan->team_member_limit,
                    'features' => $plan->features,
                ])
            : [];

        return Inertia::render('Auth/Register', [
            'step' => $step,
            'formData' => [
                'name' => $formData['name'] ?? '',
                'email' => $formData['email'] ?? '',
                'clinic_name' => $formData['clinic_name'] ?? '',
                'phone' => $formData['phone'] ?? '',
                'address' => $formData['address'] ?? '',
                'timezone' => $formData['timezone'] ?? 'America/New_York',
                'plan' => $formData['plan'] ?? '',
                'billing_cycle' => $formData['billing_cycle'] ?? 'monthly',
            ],
            'plans' => $plans,
            'trialDays' => config('subscriptions.trial_days'),
        ]);
    }

    public function processStep1(RegisterStep1Request $request): RedirectResponse
    {
        $request->session()->put('register.name', $request->validated('name'));
        $request->session()->put('register.email', $request->validated('email'));
        $request->session()->put('register.password', $request->validated('password'));
        $request->session()->put('register.completed_steps', max(
            $request->session()->get('register.completed_steps', 0),
            1
        ));

        return redirect()->route('register.step', ['step' => 2]);
    }

    public function processStep2(RegisterStep2Request $request): RedirectResponse
    {
        $request->session()->put('register.clinic_name', $request->validated('clinic_name'));
        $request->session()->put('register.phone', $request->validated('phone'));
        $request->session()->put('register.address', $request->validated('address'));
        $request->session()->put('register.timezone', $request->validated('timezone'));
        $request->session()->put('register.completed_steps', max(
            $request->session()->get('register.completed_steps', 0),
            2
        ));

        return ok()->json(['message' => 'Step 2 completed successfully.']);

        return redirect()->route('register.step', ['step' => 3]);
    }

    public function processStep3(RegisterStep3Request $request): RedirectResponse
    {
        $request->session()->put('register.plan', $request->validated('plan'));
        $request->session()->put('register.billing_cycle', $request->validated('billing_cycle'));
        $request->session()->put('register.completed_steps', max(
            $request->session()->get('register.completed_steps', 0),
            3
        ));

        return redirect()->route('register.step', ['step' => 4]);
    }

    public function complete(Request $request, ClinicProvisioner $provisioner): RedirectResponse
    {
        $data = $request->session()->get('register', []);

        if (empty($data['name']) || empty($data['email']) || empty($data['password'])
            || empty($data['clinic_name']) || empty($data['timezone']) || empty($data['plan'])) {
            return redirect()->route('register.step', ['step' => 1])
                ->with('error', 'Please complete all registration steps.');
        }

        $clinic = Clinic::create([
            'name' => $data['clinic_name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? '',
            'address' => $data['address'] ?? null,
            'timezone' => $data['timezone'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'clinic_id' => $clinic->id,
            'role' => UserRole::ClinicOwner,
            'is_active' => true,
        ]);

        $planConfig = PlanConfiguration::where('slug', $data['plan'])->first();
        $planEnum = SubscriptionPlan::from($data['plan']);
        $cycle = BillingCycle::from($data['billing_cycle'] ?? 'monthly');
        $trialDays = config('subscriptions.trial_days', 7);

        $minutesLimit = $planConfig?->minutes_limit ?? config("subscriptions.plans.{$data['plan']}.minutes_limit", 0);

        ClinicSubscription::create([
            'clinic_id' => $clinic->id,
            'plan' => $planEnum,
            'billing_cycle' => $cycle,
            'status' => SubscriptionStatus::Trialing,
            'price_monthly' => $planConfig?->price_monthly ?? config("subscriptions.plans.{$data['plan']}.price_monthly", 0),
            'call_limit' => $minutesLimit,
            'minutes_limit' => $minutesLimit,
            'concurrent_limit' => $planConfig?->concurrent_limit ?? config("subscriptions.plans.{$data['plan']}.concurrent_limit", 0),
            'team_member_limit' => $planConfig?->team_member_limit ?? config("subscriptions.plans.{$data['plan']}.team_member_limit", 0),
            'trial_ends_at' => now()->addDays($trialDays),
            'current_period_start' => now()->toDateString(),
            'current_period_end' => now()->addDays($trialDays)->toDateString(),
        ]);

        $provisioner->provisionDefaults($clinic);
        $provisioner->provisionUserNotificationSettings($user);

        event(new Registered($user));

        Auth::login($user);

        $request->session()->forget('register');

        return redirect()->route('verification.notice');
    }

    public function back(int $step): RedirectResponse
    {
        $step = max(1, min(4, $step));

        return redirect()->route('register.step', ['step' => $step]);
    }
}
