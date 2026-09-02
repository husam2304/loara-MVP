<?php

namespace App\Providers;

use App\Contracts\InsuranceVerificationContract;
use App\Contracts\PaymentGatewayContract;
use App\Models\PlatformSetting;
use App\Services\InsuranceVerificationManager;
use App\Services\PaymentGatewayManager;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(PaymentGatewayContract::class, function ($app) {
            return $app->make(PaymentGatewayManager::class)->gateway();
        });

        $this->app->singleton(InsuranceVerificationContract::class, function ($app) {
            return $app->make(InsuranceVerificationManager::class)->gateway();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->applySmtpSettings();
        $this->applyVapiSettings();
    }

    private function applySmtpSettings(): void
    {
        try {
            if (! Schema::hasTable('platform_settings')) {
                return;
            }

            $smtp = PlatformSetting::getGroup('smtp');

            if (empty($smtp)) {
                return;
            }

            if (! empty($smtp['mailer'])) {
                config(['mail.default' => $smtp['mailer']]);
            }
            if (! empty($smtp['host'])) {
                config(['mail.mailers.smtp.host' => $smtp['host']]);
            }
            if (! empty($smtp['port'])) {
                config(['mail.mailers.smtp.port' => (int) $smtp['port']]);
            }
            if (! empty($smtp['username'])) {
                config(['mail.mailers.smtp.username' => $smtp['username']]);
            }
            if (! empty($smtp['password'])) {
                config(['mail.mailers.smtp.password' => $smtp['password']]);
            }
            if (! empty($smtp['encryption'])) {
                config(['mail.mailers.smtp.scheme' => $smtp['encryption'] === 'null' ? null : $smtp['encryption']]);
            }
            if (! empty($smtp['from_address'])) {
                config(['mail.from.address' => $smtp['from_address']]);
            }
            if (! empty($smtp['from_name'])) {
                config(['mail.from.name' => $smtp['from_name']]);
            }
        } catch (\Throwable) {
            // Silently ignore if DB is not ready (migrations pending, etc.)
        }
    }

    /**
     * Override the Vapi config with values saved by the SuperAdmin in
     * Platform Settings, falling back to .env values when nothing is
     * stored yet. This lets the private key, public key, server secret,
     * and base URL be rotated at runtime without a redeploy/restart —
     * every consumer (VapiService, the webhook controller, the public
     * clinic API used by the mobile app, etc.) reads via config('vapi.*'),
     * so overriding it here propagates everywhere automatically.
     */
    private function applyVapiSettings(): void
    {
        try {
            if (! Schema::hasTable('platform_settings')) {
                return;
            }

            $vapi = PlatformSetting::getGroup('vapi');

            if (empty($vapi)) {
                return;
            }

            if (! empty($vapi['private_key'])) {
                config(['vapi.private_key' => $vapi['private_key']]);
            }
            if (! empty($vapi['public_key'])) {
                config(['vapi.public_key' => $vapi['public_key']]);
            }
            if (! empty($vapi['server_secret'])) {
                config(['vapi.server_secret' => $vapi['server_secret']]);
            }
            if (! empty($vapi['base_url'])) {
                config(['vapi.base_url' => $vapi['base_url']]);
            }
        } catch (\Throwable) {
            // Silently ignore if DB is not ready (migrations pending, etc.)
        }
    }
}
