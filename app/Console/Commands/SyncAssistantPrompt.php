<?php

namespace App\Console\Commands;

use App\Models\AiConfiguration;
use App\Services\VapiService;
use Illuminate\Console\Command;

class SyncAssistantPrompt extends Command
{
    protected $signature = 'vapi:sync-prompt {--clinic-id=}';

    protected $description = 'Sync the latest system prompt to a Vapi assistant';

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

        $this->info("Syncing prompt to assistant {$config->vapi_assistant_id}...\n");

        try {
            $vapi = app(VapiService::class);

            // Get clinic phone in E.164 format
            $clinic = $config->clinic;
            $clinicPhone = $clinic->phone && preg_match('/^\+[1-9]\d{1,14}$/', $clinic->phone) 
                ? $clinic->phone 
                : null;

            $assistantData = array_merge($config->only([
                'model_provider', 'model', 'temperature', 'voice_provider',
                'voice_name', 'voice_id', 'transcriber_provider', 'language',
                'greeting_message', 'greeting_message_ar', 'after_hours_message',
                'after_hours_message_ar', 'system_prompt', 'system_prompt_ar',
                'first_message_mode', 'max_call_duration_seconds',
                'silence_timeout_seconds', 'hipaa_enabled', 'backchanneling_enabled',
                'background_sound', 'enable_recording', 'end_call_message',
                'end_call_message_ar',
            ]), array_filter([
                'name' => $clinic->name.' AI Assistant',
                'clinic_name' => $clinic->name,
                'clinic_phone' => $clinicPhone,
                'function_tool_ids' => $config->vapi_function_tool_ids ?? [],
                'tool_ids' => $config->vapi_knowledge_base_tool_id ? [$config->vapi_knowledge_base_tool_id] : [],
            ]));

            $vapi->updateAssistant($config->vapi_assistant_id, $assistantData);

            $this->info('✓ Assistant prompt synced successfully');
            $this->info("  Assistant ID: {$config->vapi_assistant_id}");
            $this->info("  Clinic: {$config->clinic->name}");

        } catch (\Throwable $e) {
            $this->error('Error syncing prompt: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
        }
    }
}
