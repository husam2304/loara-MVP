<?php

namespace App\Console\Commands;

use App\Models\AiConfiguration;
use App\Services\VapiService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SyncVapiTunnel extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vapi:sync-tunnel
                            {--tunnel= : Webhook base URL to use (auto-detected from Expose if omitted)}
                            {--dashboard=4041 : Expose dashboard port}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Auto-detect the current Expose tunnel URL and push updated tools/prompt to all Vapi assistants';

    public function handle(VapiService $vapiService): int
    {
        $webhookUrl = $this->option('tunnel');

        if (! $webhookUrl) {
            $webhookUrl = $this->detectTunnelUrl();
        }

        if (! $webhookUrl) {
            $this->error('Could not detect Expose tunnel URL. Run: herd share clinic-ai-vapi');
            $this->line('Then re-run: php artisan vapi:sync-tunnel');

            return self::FAILURE;
        }

        $webhookUrl = rtrim($webhookUrl, '/').'/api/webhooks/vapi';
        $this->info("Webhook URL: {$webhookUrl}");

        // Verify reachable
        try {
            $ping = Http::timeout(5)->post($webhookUrl, ['message' => ['type' => 'ping']]);
            if ($ping->status() !== 200) {
                $this->warn("Webhook returned HTTP {$ping->status()} — tunnel may not be routing yet.");
            }
        } catch (\Throwable $e) {
            $this->warn('Webhook ping failed — tunnel may not be routing yet.');
        }

        $configs = AiConfiguration::whereNotNull('vapi_assistant_id')->get();

        if ($configs->isEmpty()) {
            $this->warn('No AI configurations with Vapi assistants found.');

            return self::SUCCESS;
        }

        $apiKey = config('vapi.private_key');
        $reflection = new \ReflectionClass($vapiService);
        $buildSystemPrompt = tap($reflection->getMethod('buildSystemPrompt'), fn ($m) => $m->setAccessible(true));
        $buildFunctionTools = tap($reflection->getMethod('buildFunctionToolDefinitions'), fn ($m) => $m->setAccessible(true));
        $buildNativeTools = tap($reflection->getMethod('buildNativeTools'), fn ($m) => $m->setAccessible(true));

        foreach ($configs as $config) {
            $this->line("Syncing assistant {$config->vapi_assistant_id}...");

            $systemPrompt = $buildSystemPrompt->invoke($vapiService, $config->system_prompt, $config->clinic->name,"ar");
            $allTools = array_merge(
                $buildNativeTools->invoke($vapiService, $config->toArray()),
                $buildFunctionTools->invoke($vapiService, $webhookUrl),
            );

            $response = Http::withToken($apiKey)->get("https://api.vapi.ai/assistant/{$config->vapi_assistant_id}");

            if ($response->failed() || ! is_array($response->json('model'))) {
                $this->warn("  ✗ Could not fetch assistant {$config->vapi_assistant_id}; skipping.");

                continue;
            }

            $model = $response->json('model');
            $model['messages'] = [['role' => 'system', 'content' => $systemPrompt]];
            $model['tools'] = $allTools;

            Http::withToken($apiKey)
                ->patch("https://api.vapi.ai/assistant/{$config->vapi_assistant_id}", ['model' => $model])
                ->throw();

            $this->info('  ✓ Tools: '.count($allTools).', Prompt: '.strlen($systemPrompt).' chars');
        }

        $this->info('Done.');

        return self::SUCCESS;
    }

    private function detectTunnelUrl(): ?string
    {
        foreach ([4040, 4041, 4042, 4043] as $port) {
            try {
                $response = Http::timeout(2)->get("http://127.0.0.1:{$port}/api/tunnels");
                $data = $response->json();
                $tunnels = $data['tunnels'] ?? [];
                if (! empty($tunnels)) {
                    return is_string($tunnels[0]) ? $tunnels[0] : ($tunnels[0]['public_url'] ?? null);
                }
            } catch (\Throwable) {
                // try next port
            }
        }

        return null;
    }
}
