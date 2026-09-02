<?php

namespace App\Console\Commands;

use App\Models\AiConfiguration;
use App\Services\VapiService;
use Illuminate\Console\Command;

class VerifyAssistantTools extends Command
{
    protected $signature = 'vapi:verify-tools {--clinic-id=}';

    protected $description = 'Verify that an AI Assistant has all expected tools wired in Vapi';

    public function handle(): void
    {
        $clinicId = $this->option('clinic-id');

        if (! $clinicId) {
            $this->error('Please provide a clinic ID: --clinic-id=1');

            return;
        }

        $config = AiConfiguration::where('clinic_id', $clinicId)->first();

        if (! $config) {
            $this->error("No AI configuration found for clinic {$clinicId}");

            return;
        }

        if (! $config->vapi_assistant_id) {
            $this->error("No Vapi assistant ID configured for clinic {$clinicId}");

            return;
        }

        $this->info("Verifying assistant {$config->vapi_assistant_id} for clinic {$clinicId}...\n");

        try {
            $vapi = app(VapiService::class);
            $assistant = $vapi->getAssistant($config->vapi_assistant_id);

            $this->line('Assistant Name: '.($assistant['name'] ?? 'N/A'));
            $this->line('Assistant ID: '.($assistant['id'] ?? 'N/A'));
            $this->newLine();

            // Check standalone tool IDs
            $standaloneToolIds = $assistant['model']['toolIds'] ?? [];
            $this->info('Standalone Tool IDs (toolIds in model):');
            if (empty($standaloneToolIds)) {
                $this->warn('  ❌ NO TOOLS FOUND');
            } else {
                foreach ($standaloneToolIds as $toolId) {
                    $this->line("  ✓ {$toolId}");
                }
            }
            $this->newLine();

            // Check inline tools
            $inlineTools = $assistant['model']['tools'] ?? [];
            $this->info('Inline Tools (tools in model):');
            if (empty($inlineTools)) {
                $this->line('  (none configured)');
            } else {
                foreach ($inlineTools as $tool) {
                    $name = $tool['type'] ?? 'unknown';
                    if (isset($tool['function']['name'])) {
                        $name = $tool['function']['name'];
                    }
                    $this->line("  ✓ {$name}");
                }
            }
            $this->newLine();

            // Check knowledge-base tool
            $this->info('Knowledge-Base Tool Configuration:');
            if ($config->vapi_knowledge_base_tool_id) {
                $this->line("  Stored ID: {$config->vapi_knowledge_base_tool_id}");
                if (in_array($config->vapi_knowledge_base_tool_id, $standaloneToolIds)) {
                    $this->line('  ✓ Tool IS wired to assistant');
                } else {
                    $this->error('  ❌ Tool NOT wired to assistant!');
                }
            } else {
                $this->warn('  ❌ No knowledge-base tool ID stored in database');
            }
            $this->newLine();

            // Check function tools
            $this->info('Function Tool IDs:');
            $functionToolIds = $config->vapi_function_tool_ids ?? [];
            if (empty($functionToolIds)) {
                $this->line('  (none configured)');
            } else {
                foreach ($functionToolIds as $toolId) {
                    if (in_array($toolId, $standaloneToolIds)) {
                        $this->line("  ✓ {$toolId} (wired)");
                    } else {
                        $this->error("  ❌ {$toolId} (NOT wired!)");
                    }
                }
            }
            $this->newLine();

            // Check webhook
            $this->info('Webhook Configuration:');
            $webhookUrl = $assistant['server']['url'] ?? null;
            if ($webhookUrl) {
                $this->line('  ✓ Webhook URL: '.parse_url($webhookUrl, PHP_URL_HOST));
            } else {
                $this->error('  ❌ No webhook URL configured');
            }
            $this->newLine();

            // Summary
            $totalStandaloneTools = count($standaloneToolIds);
            $totalInlineTools = count($inlineTools);
            $hasWebhook = ! empty($webhookUrl);
            $knowledgeToolWired = $config->vapi_knowledge_base_tool_id && in_array($config->vapi_knowledge_base_tool_id, $standaloneToolIds);

            $this->info('Summary:');
            $this->line("  Standalone Tools: {$totalStandaloneTools}");
            $this->line("  Inline Tools: {$totalInlineTools}");
            $this->line('  Webhook: '.($hasWebhook ? '✓' : '❌'));
            $this->line('  Knowledge Tool Wired: '.($knowledgeToolWired ? '✓' : '❌'));

        } catch (\Throwable $e) {
            $this->error('Error verifying assistant: '.$e->getMessage());
            $this->error($e->getTraceAsString());
        }
    }
}
