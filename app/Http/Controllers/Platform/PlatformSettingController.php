<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\GatewayConfiguration;
use App\Models\PlatformSetting;
use App\Services\Gateways\ClaimMdGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class PlatformSettingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Platform/Settings', [
            'smtpConfig' => $this->getSmtpConfig(),
            'claimMdConfig' => $this->getClaimMdConfig(),
            'vapiConfig' => $this->getVapiConfig(),
            'gatewayConfigs' => $this->getGatewayConfigs(),
            'stripeWebhookUrl' => url('/api/webhooks/stripe'),
            'vapiWebhookUrl' => config('vapi.webhook_url') ?? url('/api/webhooks/vapi'),
            'appName' => PlatformSetting::where('group', 'branding')->where('key', 'app_name')->value('value') ?? config('app.name', 'Loara'),
        ]);
    }

    public function updateAppName(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'app_name' => ['required', 'string', 'max:50'],
        ]);

        PlatformSetting::setGroup('branding', ['app_name' => $validated['app_name']]);

        return back()->with('success', 'Application name updated.');
    }

    public function updateSmtp(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'mailer' => ['required', 'string', 'in:smtp,ses,postmark,resend,sendmail,log'],
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'string', 'max:10'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'encryption' => ['nullable', 'string', 'in:tls,ssl,null'],
            'from_address' => ['required', 'email', 'max:255'],
            'from_name' => ['required', 'string', 'max:255'],
        ]);

        $values = collect($validated)->filter(function ($value, $key) {
            return $key !== 'password' || ($value && $value !== '••••••••');
        })->toArray();

        PlatformSetting::setGroup('smtp', $values, ['password']);

        return back()->with('success', 'SMTP configuration updated successfully.');
    }

    public function testSmtp(Request $request): JsonResponse
    {
        $smtpSettings = PlatformSetting::getGroup('smtp');

        try {
            config([
                'mail.default' => $smtpSettings['mailer'] ?? 'smtp',
                'mail.mailers.smtp.host' => $smtpSettings['host'] ?? '',
                'mail.mailers.smtp.port' => (int) ($smtpSettings['port'] ?? 587),
                'mail.mailers.smtp.username' => $smtpSettings['username'] ?? '',
                'mail.mailers.smtp.password' => $smtpSettings['password'] ?? '',
                'mail.mailers.smtp.scheme' => $smtpSettings['encryption'] ?? 'tls',
                'mail.from.address' => $smtpSettings['from_address'] ?? 'test@example.com',
                'mail.from.name' => $smtpSettings['from_name'] ?? 'Test',
            ]);

            $appName = PlatformSetting::where('group', 'branding')->where('key', 'app_name')->value('value')
                ?? config('app.name', 'Loara');

            Mail::raw(
                "This is a test email from {$appName} to verify your SMTP configuration is working correctly.",
                function ($message) use ($request, $appName) {
                    $message->to($request->user()->email)
                        ->subject("{$appName} — SMTP Test");
                }
            );

            return response()->json(['success' => true, 'message' => 'Test email sent to '.$request->user()->email]);
        } catch (\Throwable $e) {
            Log::error('SMTP test failed', ['error' => $e->getMessage()]);

            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function updateClaimMd(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'api_key' => ['required', 'string', 'max:255'],
        ]);

        if ($validated['api_key'] !== '••••••••') {
            PlatformSetting::setGroup('claim_md', ['api_key' => $validated['api_key']], ['api_key']);
        }

        return back()->with('success', 'Claim.MD configuration updated.');
    }

    public function testClaimMd(): JsonResponse
    {
        try {
            $gateway = app(ClaimMdGateway::class);
            $connected = $gateway->testConnection();

            if ($connected) {
                return response()->json(['success' => true, 'message' => 'Connected to Claim.MD successfully.']);
            }

            return response()->json(['success' => false, 'message' => 'Could not connect to Claim.MD. Check your API key.'], 422);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function updateVapi(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'private_key' => ['nullable', 'string', 'max:255'],
            'public_key' => ['nullable', 'string', 'max:255'],
            'server_secret' => ['nullable', 'string', 'max:255'],
            'base_url' => ['nullable', 'url', 'max:255'],
        ]);

        // Masked placeholders mean "keep the existing stored value" — don't overwrite with dots.
        $values = collect($validated)->filter(function ($value, $key) {
            if (! in_array($key, ['private_key', 'server_secret'], true)) {
                return $value !== null;
            }

            return $value !== null && $value !== '••••••••';
        })->toArray();

        if (empty($values)) {
            return back()->with('error', 'No changes to save.');
        }

        PlatformSetting::setGroup('vapi', $values, ['private_key', 'server_secret']);

        return back()->with('success', 'Vapi configuration updated. Changes apply immediately, no restart needed.');
    }

    public function testVapi(): JsonResponse
    {
        $stored = PlatformSetting::getGroup('vapi');
        $privateKey = $stored['private_key'] ?? config('vapi.private_key');
        $baseUrl = rtrim($stored['base_url'] ?? config('vapi.base_url', 'https://api.vapi.ai'), '/');

        if (empty($privateKey)) {
            return response()->json(['success' => false, 'message' => 'Please save a Private Key first.'], 422);
        }

        try {
            $response = \Illuminate\Support\Facades\Http::withToken($privateKey)
                ->acceptJson()
                ->timeout(15)
                ->get("{$baseUrl}/assistant", ['limit' => 1]);

            if ($response->successful()) {
                return response()->json(['success' => true, 'message' => 'Connected to Vapi successfully.']);
            }

            if ($response->status() === 401) {
                return response()->json(['success' => false, 'message' => 'Vapi rejected the Private Key (unauthorized).'], 422);
            }

            return response()->json(['success' => false, 'message' => 'Vapi responded with status '.$response->status().'.'], 422);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * @return array<string, string|bool|null>
     */
    private function getVapiConfig(): array
    {
        $stored = PlatformSetting::getGroup('vapi');

        return [
            'private_key' => ! empty($stored['private_key']) ? '••••••••' : '',
            'public_key' => $stored['public_key'] ?? config('vapi.public_key', ''),
            'server_secret' => ! empty($stored['server_secret']) ? '••••••••' : '',
            'base_url' => $stored['base_url'] ?? config('vapi.base_url', 'https://api.vapi.ai'),
            'is_configured' => ! empty($stored['private_key']) || ! empty(config('vapi.private_key')),
            'source' => ! empty($stored['private_key']) ? 'database' : (! empty(config('vapi.private_key')) ? 'env' : 'none'),
        ];
    }

    /**
     * @return array<string, string|null>
     */
    private function getSmtpConfig(): array
    {
        $stored = PlatformSetting::getGroup('smtp');

        return [
            'mailer' => $stored['mailer'] ?? config('mail.default', 'smtp'),
            'host' => $stored['host'] ?? config('mail.mailers.smtp.host', ''),
            'port' => $stored['port'] ?? (string) config('mail.mailers.smtp.port', '587'),
            'username' => $stored['username'] ?? config('mail.mailers.smtp.username', ''),
            'password' => ! empty($stored['password']) ? '••••••••' : '',
            'encryption' => $stored['encryption'] ?? config('mail.mailers.smtp.scheme', 'tls'),
            'from_address' => $stored['from_address'] ?? config('mail.from.address', ''),
            'from_name' => $stored['from_name'] ?? config('mail.from.name', ''),
        ];
    }

    /**
     * @return array<string, string|null>
     */
    private function getClaimMdConfig(): array
    {
        $stored = PlatformSetting::getGroup('claim_md');

        return [
            'api_key' => ! empty($stored['api_key']) ? '••••••••' : (! empty(config('services.claim_md.api_key')) ? '••••••••' : ''),
            'is_configured' => ! empty($stored['api_key']) || ! empty(config('services.claim_md.api_key')),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getGatewayConfigs(): array
    {
        return GatewayConfiguration::query()
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
            ])
            ->toArray();
    }

    private function maskKey(?string $key): ?string
    {
        if (! $key || strlen($key) < 8) {
            return null;
        }

        return substr($key, 0, 7).'...'.substr($key, -4);
    }

    public function updateLocale(Request $request): RedirectResponse
    {
        $locale = $request->validate([
            'locale' => ['required', 'in:en,ar'],
        ])['locale'];

        session(['locale' => $locale]);

        App::setLocale($locale);

        return back();
    }
}
