<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GatewayConfigurationStatus;
use App\Enums\GatewayType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateGatewayConfigurationRequest;
use App\Models\GatewayConfiguration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentGatewayController extends Controller
{
    public function index(): Response
    {
        $gatewayConfigs = GatewayConfiguration::query()
            ->whereNull('clinic_id')
            ->get()
            ->map(fn (GatewayConfiguration $config) => [
                'id' => $config->id,
                'gateway' => $config->gateway->value,
                'is_active' => $config->is_active,
                'status' => $config->status->value,
                'error_message' => $config->error_message,
                'last_tested_at' => $config->last_tested_at?->toISOString(),
                'has_credentials' => $config->hasRequiredCredentials(),
                'publishable_key_last4' => $this->maskKey($config->getCredential('publishable_key')),
                'secret_key_last4' => $this->maskKey($config->getCredential('secret_key')),
                'webhook_secret_last4' => $this->maskKey($config->getCredential('webhook_secret')),
            ]);

        return Inertia::render('Platform/PaymentGateways', [
            'gatewayConfigs' => $gatewayConfigs,
            'webhookUrl' => url('/api/webhooks/stripe'),
            'availableGateways' => array_values(array_map(
                fn (GatewayType $g) => ['value' => $g->value, 'label' => ucfirst($g->value)],
                GatewayType::paymentGateways(),
            )),
        ]);
    }

    public function update(UpdateGatewayConfigurationRequest $request): RedirectResponse
    {
        $data = $request->validated();

        GatewayConfiguration::updateOrCreate(
            [
                'clinic_id' => null,
                'gateway' => $data['gateway'],
            ],
            [
                'credentials' => [
                    'publishable_key' => $data['publishable_key'],
                    'secret_key' => $data['secret_key'],
                    'webhook_secret' => $data['webhook_secret'],
                ],
                'is_active' => $data['is_active'] ?? false,
                'status' => GatewayConfigurationStatus::NotConfigured,
            ],
        );

        return back()->with('success', 'Payment gateway configuration saved successfully.');
    }

    public function testConnection(Request $request): RedirectResponse
    {
        $gateway = $request->validate(['gateway' => ['required', 'string']])['gateway'];

        $config = GatewayConfiguration::whereNull('clinic_id')
            ->where('gateway', $gateway)
            ->first();

        if (! $config || ! $config->hasRequiredCredentials()) {
            return back()->with('error', 'Please configure gateway credentials first.');
        }

        try {
            $stripe = new \Stripe\StripeClient($config->getCredential('secret_key'));
            $stripe->balance->retrieve();

            $config->update([
                'status' => GatewayConfigurationStatus::Connected,
                'error_message' => null,
                'last_tested_at' => now(),
            ]);

            return back()->with('success', 'Connection successful! Gateway is active.');
        } catch (\Exception $e) {
            $config->update([
                'status' => GatewayConfigurationStatus::Error,
                'error_message' => $e->getMessage(),
                'last_tested_at' => now(),
            ]);

            return back()->with('error', 'Connection failed: '.$e->getMessage());
        }
    }

    public function destroy(GatewayConfiguration $gatewayConfiguration): RedirectResponse
    {
        $gatewayConfiguration->update([
            'credentials' => null,
            'status' => GatewayConfigurationStatus::NotConfigured,
            'is_active' => false,
            'error_message' => null,
            'last_tested_at' => null,
        ]);

        return back()->with('success', 'Gateway credentials removed.');
    }

    private function maskKey(?string $key): ?string
    {
        if (! $key || strlen($key) < 8) {
            return null;
        }

        return substr($key, 0, 7).'...'.substr($key, -4);
    }
}
