<?php

namespace App\Console\Commands;

use App\Models\AiConfiguration;
use App\Models\Clinic;
use App\Models\User;
use App\Services\ClinicProvisioner;
use App\Services\VapiService;
use Illuminate\Console\Command;
use Illuminate\Http\Client\RequestException;

class SetupDemo extends Command
{
    protected $signature = 'loara:demo-setup
        {--fresh : Wipe and reseed the database first (migrate:fresh --seed)}
        {--phone : Provision a free Vapi phone number linked to the demo assistant}
        {--area-code= : Desired US area code for the free phone number (e.g. 415)}';

    protected $description = 'Provision the demo clinic as a live, reviewer-ready Vapi demo (assistant + tools, optional phone number).';

    public function handle(ClinicProvisioner $provisioner): int
    {
        $this->components->info('Loara — demo setup');

        if ($this->option('fresh')) {
            $this->components->task('Reseeding database', fn () => $this->callSilent('migrate:fresh', ['--seed' => true, '--force' => true]) === 0);
        }

        if (empty(config('vapi.private_key'))) {
            $this->newLine();
            $this->components->error('VAPI_PRIVATE_KEY is not set. Add your Vapi keys to .env first:');
            $this->line('  VAPI_PRIVATE_KEY=...   VAPI_PUBLIC_KEY=...   VAPI_SERVER_SECRET=...');
            $this->line('  VAPI_WEBHOOK_URL='.$this->appUrl().'/api/webhooks/vapi');
            $this->line('Then run: php artisan config:clear && php artisan loara:demo-setup');

            return self::FAILURE;
        }

        $webhookUrl = config('vapi.webhook_url');
        if (empty($webhookUrl)) {
            $this->components->warn('VAPI_WEBHOOK_URL is empty — the AI will answer but its tools cannot reach your server. Set it to '.$this->appUrl().'/api/webhooks/vapi');
        }
        if (empty(config('vapi.server_secret'))) {
            $this->components->warn('VAPI_SERVER_SECRET is empty — webhook requests cannot be verified. Set it and use the same value in Vapi.');
        }

        $clinic = optional(User::where('email', 'clinic@mail.com')->first())->clinic
            ?? Clinic::orderBy('id')->first();

        if (! $clinic) {
            $this->components->error('No clinic found. Seed demo data first: php artisan migrate:fresh --seed (or pass --fresh).');

            return self::FAILURE;
        }
        $this->components->twoColumnDetail('Demo clinic', $clinic->name.' (#'.$clinic->id.')');

        if (! $clinic->aiConfiguration) {
            $provisioner->provisionDefaults($clinic);
            $clinic->refresh();
        }
        $config = $clinic->aiConfiguration;

        // Resolve lazily — the VapiService constructor requires the private key,
        // which we've already verified is present above.
        $vapi = app(VapiService::class);

        try {
            $functionToolIds = $config->vapi_function_tool_ids;
            if ($webhookUrl) {
                $this->components->task('Syncing function tools to Vapi', function () use (&$functionToolIds, $vapi, $webhookUrl) {
                    $functionToolIds = $vapi->syncFunctionTools($webhookUrl, $functionToolIds);

                    return true;
                });
            }

            $clinicPhone = $clinic->phone && preg_match('/^\+[1-9]\d{1,14}$/', $clinic->phone) ? $clinic->phone : null;

            $assistantData = array_merge($config->toArray(), [
                'name' => $clinic->name.' AI Assistant',
                'clinic_name' => $clinic->name,
                'clinic_phone' => $clinicPhone,
                'function_tool_ids' => $functionToolIds ?? [],
                'tool_ids' => array_values(array_filter([$config->vapi_knowledge_base_tool_id])),
            ]);

            if ($config->vapi_assistant_id) {
                $this->components->task('Updating Vapi assistant', function () use ($vapi, $config, $assistantData) {
                    $vapi->updateAssistant($config->vapi_assistant_id, $assistantData);

                    return true;
                });
            } else {
                $this->components->task('Creating Vapi assistant', function () use ($config, $vapi, $assistantData) {
                    $assistant = $vapi->createAssistant($assistantData);
                    $config->update(['vapi_assistant_id' => $assistant['id']]);

                    return true;
                });
            }

            $config->update(['vapi_function_tool_ids' => $functionToolIds]);
            $config->refresh();
            $this->components->twoColumnDetail('Assistant ID', $config->vapi_assistant_id ?? '—');

            if ($this->option('phone')) {
                if ($config->vapi_phone_number_id) {
                    $this->components->twoColumnDetail('Phone number', ($config->vapi_phone_number ?: $config->vapi_phone_number_id).' (already provisioned)');
                } else {
                    $this->components->task('Provisioning free Vapi phone number', function () use ($vapi, $config, $clinic) {
                        $phone = $vapi->createFreePhoneNumber($config->vapi_assistant_id, $clinic->name.' Demo', $this->option('area-code') ?: null);
                        $config->update([
                            'vapi_phone_number_id' => $phone['id'],
                            'vapi_phone_number' => $phone['number'] ?? null,
                            'vapi_phone_number_status' => $phone['status'] ?? 'activating',
                            'vapi_phone_number_sip_uri' => $phone['sipUri'] ?? null,
                            'vapi_phone_number_provider' => $phone['provider'] ?? 'vapi',
                        ]);

                        return true;
                    });
                    $config->refresh();
                    $this->components->twoColumnDetail('Phone number', $config->vapi_phone_number ?: '(activating — check Settings → AI Assistant)');
                }
            }
        } catch (RequestException $e) {
            $body = $e->response?->json() ?? [];
            $msg = $body['message'] ?? $body['error']['message'] ?? $body['error'] ?? 'Vapi API error (HTTP '.$e->response?->status().')';
            $this->components->error('Vapi provisioning failed: '.(is_string($msg) ? $msg : json_encode($msg)));

            return self::FAILURE;
        }

        $this->printSummary($clinic, $config->fresh());

        return self::SUCCESS;
    }

    private function appUrl(): string
    {
        return rtrim((string) config('app.url'), '/');
    }

    private function printSummary(Clinic $clinic, AiConfiguration $config): void
    {
        $this->newLine();
        $this->components->info('Demo is reviewer-ready.');

        $this->line('  <fg=gray>Demo logins (password: password)</>');
        $this->components->twoColumnDetail('SuperAdmin (platform)', 'loara@mail.com');
        $this->components->twoColumnDetail('Clinic owner (all features)', 'clinic@mail.com');

        $this->newLine();
        $this->line('  <fg=gray>How the reviewer experiences the AI</>');
        $this->components->bulletList([
            'In-browser call: log in as clinic@mail.com -> Settings -> AI Assistant -> test-call widget (needs VAPI_PUBLIC_KEY).',
            $config->vapi_phone_number
                ? 'Phone: call '.$config->vapi_phone_number.' to reach the live assistant.'
                : 'Phone (optional): re-run with --phone to provision a free callable number.',
            'Watch the call, transcript and tool calls appear under Call Center.',
        ]);

        $this->newLine();
        $this->line('  <fg=gray>Confirm these for a clean public demo</>');
        $this->components->bulletList([
            'APP_DEBUG=false, APP_ENV=production, APP_NAME set to your brand',
            'Vapi webhook -> '.$this->appUrl().'/api/webhooks/vapi (VAPI_SERVER_SECRET matches)',
            'Stripe test-mode keys + webhook -> '.$this->appUrl().'/api/webhooks/stripe',
            'Queue worker running + scheduler cron (php artisan schedule:run)',
        ]);
    }
}
