<?php

namespace App\Services;

use App\Models\WorkflowNode;
use App\Services\Voice\VoiceConfigurationResolver;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class VapiService
{
    protected PendingRequest $client;

    public function __construct()
    {
        $apiKey = config('vapi.private_key');

        if (empty($apiKey)) {
            throw new RuntimeException('API key is not configured. Set VAPI_PRIVATE_KEY in your .env file.');
        }

        $this->client = Http::baseUrl(config('vapi.base_url', 'https://api.vapi.ai'))
            ->withToken($apiKey)
            ->acceptJson()
            ->asJson()
            ->timeout(30)
            ->retry(3, fn (int $attempt) => $attempt * 1000, function (Throwable $e) {
                // Retry on connection failures, server errors (5xx), and rate limits (429)
                return $e instanceof ConnectionException
                    || ($e instanceof RequestException && ($e->response?->status() >= 500 || $e->response?->status() === 429));
            });
    }

    /**
     * Create a Vapi assistant with the given configuration.
     *
     * @return array{id: string, name: string}
     *
     * @throws RequestException
     */
    public function createAssistant(array $config): array
    {
        $response = $this->client->post('/assistant', $this->buildAssistantPayload($config))->throw();

        return $response->json();
    }

    /**
     * Update an existing Vapi assistant.
     *
     * @throws RequestException
     */
    public function updateAssistant(string $assistantId, array $config): array
    {
        $response = $this->client->patch("/assistant/{$assistantId}", $this->buildAssistantPayload($config))->throw();

        return $response->json();
    }

    /**
     * Delete a Vapi assistant.
     *
     * @throws RequestException
     */
    public function deleteAssistant(string $assistantId): void
    {
        $this->client->delete("/assistant/{$assistantId}")->throw();
    }

    /**
     * Create a phone number on VAPI for any supported provider.
     *
     * Accepts the raw payload matching the VAPI POST /phone-number API.
     * The `provider` field in the payload discriminates the type:
     * 'vapi', 'twilio', 'vonage', 'telnyx', or 'byo-phone-number'.
     *
     * @return array{id: string, number: ?string, provider: string, status: string, sipUri: ?string}
     *
     * @throws RequestException
     */
    public function createPhoneNumber(array $payload): array
    {
        $response = $this->client->post('/phone-number', $payload)->throw();

        return $response->json();
    }

    /**
     * Create a free Vapi phone number linked to an assistant.
     *
     * @return array{id: string, number: ?string, provider: string, status: string, sipUri: ?string}
     *
     * @throws RequestException
     */
    public function createFreePhoneNumber(string $assistantId, string $name, ?string $areaCode = null): array
    {
        $payload = [
            'provider' => 'vapi',
            'name' => mb_substr($name, 0, 40),
            'assistantId' => $assistantId,
        ];

        if ($areaCode) {
            $payload['numberDesiredAreaCode'] = $areaCode;
        }

        $response = $this->client->post('/phone-number', $payload)->throw();

        return $response->json();
    }

    /**
     * Get a specific phone number by ID.
     *
     * @return array{id: string, number: ?string, status: string, name: ?string, sipUri: ?string}
     *
     * @throws RequestException
     */
    public function getPhoneNumber(string $phoneNumberId): array
    {
        $response = $this->client->get("/phone-number/{$phoneNumberId}")->throw();

        return $response->json();
    }

    /**
     * Update a phone number's configuration.
     *
     * @throws RequestException
     */
    public function updatePhoneNumber(string $phoneNumberId, array $data): array
    {
        $response = $this->client->patch("/phone-number/{$phoneNumberId}", $data)->throw();

        return $response->json();
    }

    /**
     * Delete (release) a phone number.
     *
     * @throws RequestException
     */
    public function deletePhoneNumber(string $phoneNumberId): void
    {
        $this->client->delete("/phone-number/{$phoneNumberId}")->throw();
    }

    /**
     * Get a specific assistant by ID.
     *
     * @throws RequestException
     */
    public function getAssistant(string $assistantId): array
    {
        $response = $this->client->get("/assistant/{$assistantId}")->throw();

        return $response->json();
    }

    /**
     * Upload a file to Vapi for knowledge base use.
     *
     * Uses PHP's native curl with CURLFile to produce the exact multipart
     * request format Vapi documents, avoiding Cloudflare WAF blocks that
     * occur with Guzzle's multipart construction.
     *
     * @return array{id: string, name: string, bytes: int, purpose: string}
     *
     * @throws RuntimeException
     */
    public function uploadFile(string $filePath, string $fileName, string $mimeType = 'application/octet-stream'): array
    {
        $baseUrl = rtrim(config('vapi.base_url', 'https://api.vapi.ai'), '/');
        $apiKey = config('vapi.private_key');

        $ch = curl_init("{$baseUrl}/file");

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$apiKey}",
            ],
            CURLOPT_POSTFIELDS => [
                'file' => new \CURLFile($filePath, $mimeType, $fileName),
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
        ]);

        $body = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);

        curl_close($ch);

        if ($body === false || $error) {
            throw new RuntimeException("File upload failed: {$error}");
        }

        if ($httpCode >= 400) {
            $decoded = json_decode($body, true);
            $message = $decoded['message'] ?? $decoded['error'] ?? null;

            // Detect HTML responses (Cloudflare block pages, etc.)
            if (! $message && str_contains($body, '<html')) {
                throw new RuntimeException('Request blocked by security. Please try again in a moment.');
            }

            throw new RuntimeException($message ?: "API returned HTTP {$httpCode}");
        }

        return json_decode($body, true);
    }

    /**
     * Delete a file from Vapi.
     *
     * @throws RequestException
     */
    public function deleteFile(string $fileId): void
    {
        $this->client->delete("/file/{$fileId}")->throw();
    }

    /**
     * Send a text message to a Vapi assistant via the Chat API.
     *
     * @return array{id: string, output: array}
     *
     * @throws RequestException
     */
    public function chat(string $assistantId, string $input, ?string $previousChatId = null): array
    {
        $payload = [
            'assistantId' => $assistantId,
            'input' => $input,
        ];

        if ($previousChatId) {
            $payload['previousChatId'] = $previousChatId;
        }

        $response = $this->client->post('/chat', $payload)->throw();

        return $response->json();
    }

    /**
     * Create a Vapi Squad.
     *
     * @return array{id: string}
     *
     * @throws RequestException
     */
    public function createSquad(array $squadConfig): array
    {
        $response = $this->client->post('/squad', $squadConfig)->throw();

        return $response->json();
    }

    /**
     * Update an existing Vapi Squad.
     *
     * @throws RequestException
     */
    public function updateSquad(string $squadId, array $squadConfig): array
    {
        $response = $this->client->patch("/squad/{$squadId}", $squadConfig)->throw();

        return $response->json();
    }

    /**
     * Delete a Vapi Squad.
     *
     * @throws RequestException
     */
    public function deleteSquad(string $squadId): void
    {
        $this->client->delete("/squad/{$squadId}")->throw();
    }

    /**
     * Get a Vapi Squad by ID.
     *
     * @throws RequestException
     */
    public function getSquad(string $squadId): array
    {
        $response = $this->client->get("/squad/{$squadId}")->throw();

        return $response->json();
    }

    /**
     * Build the assistant payload for a single squad member node.
     *
     * @param  string[]  $allFunctionToolIds
     * @param  array<string, string>  $toolNameToIdMap
     */
    public function buildSquadMemberPayload(WorkflowNode $node, array $allFunctionToolIds, array $toolNameToIdMap, string $clinicName): array
    {
        $filteredToolIds = [];
        foreach ($node->tool_names ?? [] as $toolName) {
            if (isset($toolNameToIdMap[$toolName])) {
                $filteredToolIds[] = $toolNameToIdMap[$toolName];
            }
        }

        $config = [
            'name' => $node->name,
            'clinic_name' => $clinicName,
            'model' => $node->model,
            'temperature' => $node->temperature,
            'voice_provider' => $node->voice_provider,
            'voice_name' => $node->voice_name,
            'system_prompt' => $node->system_prompt,
            'greeting_message' => $node->greeting_message,
            'function_tool_ids' => $filteredToolIds,
        ];

        return $this->buildAssistantPayload($config);
    }

    /**
     * Extract assistant IDs from a squad response and return a mapping of assistant names to IDs.
     *
     * When Vapi creates or updates a squad, the response includes member assistants with their IDs.
     * This method extracts that mapping so the app can store vapi_assistant_id on each WorkflowNode.
     *
     * @param  array  $squad  The squad response from Vapi containing members array
     * @return array<string, string> Mapping of assistant name => vapi assistant ID
     */
    public function extractSquadAssistantIds(array $squad): array
    {
        $mapping = [];

        foreach ($squad['members'] ?? [] as $member) {
            $assistant = $member['assistant'] ?? null;

            if (is_array($assistant)) {
                $assistantId = $assistant['id'] ?? null;
                $assistantName = $assistant['name'] ?? null;

                if ($assistantId && $assistantName) {
                    $mapping[$assistantName] = $assistantId;
                }
            }
        }

        return $mapping;
    }

    /**
     * Create a query tool with a knowledge base referencing the given file IDs.
     *
     * @param  string[]  $fileIds
     * @return array{id: string}
     *
     * @throws RequestException
     */
    public function createQueryTool(array $fileIds, string $clinicName): array
    {
        $response = $this->client->post('/tool', [
            'type' => 'query',
            'function' => [
                'name' => 'knowledge_base_lookup',
                'description' => "Search the {$clinicName} knowledge base for information about the clinic's services, policies, providers, insurance, procedures, and FAQs. Use this whenever a caller asks a question that might be answered by the clinic's documentation.",
            ],
            'knowledgeBases' => [
                [
                    'provider' => 'google',
                    'name' => "{$clinicName} Knowledge Base",
                    'description' => "Contains clinic documentation, policies, provider information, services, insurance details, and frequently asked questions for {$clinicName}.",
                    'fileIds' => $fileIds,
                ],
            ],
        ])->throw();

        return $response->json();
    }

    /**
     * Delete a tool from Vapi.
     *
     * @throws RequestException
     */
    public function deleteTool(string $toolId): void
    {
        $this->client->delete("/tool/{$toolId}")->throw();
    }

    /**
     * Get a specific call by ID from VAPI.
     *
     * @return array{id: string, status: string, type: string, endedReason?: string, startedAt?: string, endedAt?: string, transcript?: string, monitor?: array}
     *
     * @throws RequestException
     */
    public function getCall(string $callId): array
    {
        $response = $this->client->get("/call/{$callId}")->throw();

        return $response->json();
    }

    /**
     * Initiate a single outbound phone call via VAPI.
     *
     * @param  array{number: string, name?: string}  $customer
     * @return array{id: string, status: string, type: string}
     *
     * @throws RequestException
     */
    public function createOutboundCall(string $assistantId, string $phoneNumberId, array $customer): array
    {
        $response = $this->client->post('/call', [
            'assistantId' => $assistantId,
            'phoneNumberId' => $phoneNumberId,
            'customer' => $customer,
        ])->throw();

        return $response->json();
    }

    /**
     * Initiate batch outbound phone calls via VAPI.
     *
     * @param  array<int, array{number: string, name?: string}>  $customers
     *
     * @throws RequestException
     */
    public function createBatchOutboundCalls(string $assistantId, string $phoneNumberId, array $customers): array
    {
        $response = $this->client->post('/call', [
            'assistantId' => $assistantId,
            'phoneNumberId' => $phoneNumberId,
            'customers' => $customers,
        ])->throw();

        return $response->json();
    }

    /**
     * Verify an assistant is properly configured with tools after create/update.
     *
     * Fetches the assistant from Vapi and checks that tool IDs and server URL are set.
     * Returns the assistant data if valid, throws if misconfigured.
     *
     * @return array{id: string, model: array, server?: array}
     *
     * @throws RuntimeException
     */
    public function verifyAssistant(string $assistantId, int $expectedToolCount = 0): array
    {
        $assistant = $this->getAssistant($assistantId);

        $toolIds = $assistant['model']['toolIds'] ?? [];
        $inlineTools = $assistant['model']['tools'] ?? [];
        $hasServer = ! empty($assistant['server']['url']);

        $totalTools = count($toolIds) + count($inlineTools);

        if ($expectedToolCount > 0 && $totalTools === 0) {
            throw new RuntimeException(
                'AI Assistant was saved but has no tools configured. '
                .'Please check your webhook URL and try saving again.'
            );
        }

        if (! $hasServer && $expectedToolCount > 0) {
            throw new RuntimeException(
                'AI Assistant was saved but the webhook URL is missing. '
                .'Tools will not function without a webhook. Please set APP_URL or VAPI_WEBHOOK_URL in your .env file.'
            );
        }

        return $assistant;
    }

    /**
     * Build the full system prompt by combining the fixed base prompt with the user's custom prompt.
     *
     * The base prompt (resources/prompts/agent-base.md) contains mandatory behavioral rules
     * for tool usage, verification flow, triage protocol, and HIPAA compliance. The user's
     * custom prompt is appended as clinic-specific customizations.
     */
    protected function buildSystemPrompt(?string $customPrompt, string $clinicName, string $language): string
    {
        $promptFile = $language === 'ar' ? 'agent-base-ar.md' : 'agent-base.md';
        $basePath = resource_path('prompts/'.$promptFile);

        $basePrompt = File::exists($basePath)
            ? File::get($basePath)
            : 'You are a professional medical clinic receptionist AI assistant for {{clinic_name}}.';

        $appName = config('app.name', 'AI Assistant');
        $now = now();
        $replacements = [
            '{{clinic_name}}' => $clinicName,
            '{{app_name}}' => $appName,
            '{{today_date}}' => $now->format('l, F j, Y'),
            '{{today_iso}}' => $now->toDateString(),
        ];

        $basePrompt = str_replace(array_keys($replacements), array_values($replacements), $basePrompt);

        if (empty($customPrompt)) {
            return $basePrompt;
        }

        $customPrompt = str_replace(array_keys($replacements), array_values($replacements), $customPrompt);

        return $basePrompt."\n\n## Clinic-Specific Instructions\n\n".$customPrompt;
    }

    /**
     * Build the assistant payload for Vapi create/update operations.
     *
     * @see https://docs.vapi.ai/api-reference/assistants/create
     */
    protected function buildAssistantPayload(array $rawConfig): array
    {
        $resolver = app(VoiceConfigurationResolver::class);
        $resolved = $resolver->resolve($rawConfig);
        $config = $resolved->toArray();

        $appName = config('app.name', 'AI Assistant');
        $name = $config['name'] ?? $appName.' AI Assistant';

        // Replace {{clinic_name}} and {{app_name}} placeholders in all prompt fields
        $clinicName = $config['clinic_name'] ?? 'our clinic';
        $replacements = ['{{clinic_name}}' => $clinicName, '{{app_name}}' => $appName];
        $resolve = fn (?string $text): ?string => $text ? str_replace(array_keys($replacements), array_values($replacements), $text) : $text;

        $language = $config['language'] ?? 'en';
        $isAr = $language === 'ar';

        $greeting = $isAr && ! empty($config['greeting_message_ar']) ? $config['greeting_message_ar'] : ($config['greeting_message'] ?? null);
        $systemPrompt = $isAr && ! empty($config['system_prompt_ar']) ? $config['system_prompt_ar'] : ($config['system_prompt'] ?? null);
        $endCall = $isAr && ! empty($config['end_call_message_ar']) ? $config['end_call_message_ar'] : ($config['end_call_message'] ?? null);
        $afterHours = $isAr && ! empty($config['after_hours_message_ar']) ? $config['after_hours_message_ar'] : ($config['after_hours_message'] ?? null);

        $payload = [
            'name' => mb_substr($name, 0, 40),
            'firstMessage' => $greeting ? $resolve($greeting) : ($isAr ? 'شكراً لاتصالكم. كيف يمكنني مساعدتكم اليوم؟' : 'Thank you for calling. How can I help you today?'),
            'firstMessageMode' => $config['first_message_mode'] ?? 'assistant-speaks-first',
            'hipaaEnabled' => (bool) ($config['hipaa_enabled'] ?? false),
            'silenceTimeoutSeconds' => (int) ($config['silence_timeout_seconds'] ?? 30),
            'maxDurationSeconds' => (int) ($config['max_call_duration_seconds'] ?? 1800),
            'backgroundSound' => $config['background_sound'] ?? 'office',
            'backchannelingEnabled' => (bool) ($config['backchanneling_enabled'] ?? false),
            'backgroundDenoisingEnabled' => true,
            'serverMessages' => [
                'status-update',
                'end-of-call-report',
                'tool-calls',
                'assistant.started',
            ],
            'model' => [
                'provider' => ' "openai', // $config['model_provider'] ?? 'openai',
                'model' => 'gpt-4.1-mini', // $config['model'] ?? 'gpt-4o',
                'temperature' => 0.7, // (float)  ($config['temperature'] ?? 0.7),
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $this->buildSystemPrompt($systemPrompt, $clinicName, $language),
                    ],
                ],
            ],
            'voice' => array_filter([
                'provider' => 'vapi',
                'version' => '1',
                'speed'=> '1.1',

                // match(strtolower($config['voice_provider'] ?? 'vapi')) {
                //     'elevenlabs', 'eleven_labs', '11labs' => '11labs',
                //     default => strtolower($config['voice_provider'] ?? 'vapi')
                // },
                'voiceId' => 'Elliot', // $config['voice_id'] ?: ($config['voice_name'] ?? 'Elliot'),
                // 'model' => ''//strtolower($config['voice_provider'] ?? '') === 'elevenlabs' || strtolower($config['voice_provider'] ?? '') === '11labs' ? 'eleven_turbo_v2_5' : null,
            ]),
            'transcriber' => $this->buildTranscriberConfig($config),
            'artifactPlan' => [
                'recordingEnabled' => (bool) ($config['enable_recording'] ?? true),
                'videoRecordingEnabled' => false,
            ],
        ];

        $payload['endCallMessage'] = ! empty($endCall)
            ? $resolve($endCall)
            : ($isAr ? 'شكراً لاتصالكم، مع السلامة.' : 'Thank you for calling. Goodbye.');

        $payload['voicemailMessage'] = ! empty($afterHours)
            ? $resolve($afterHours)
            : ($isAr ? 'عذراً، نحن خارج أوقات العمل حالياً. يرجى ترك رسالتك بعد الصافرة.' : 'We are currently closed. Please leave a message.');

        $payload['endCallPhrases'] = $isAr
            ? ['مع السلامة', 'باي', 'اغلق الخط', 'وداعا', 'إلى اللقاء']
            : ['goodbye', 'bye', 'hang up', 'thanks', 'thank you'];

        // Collect standalone tool IDs (function tools + knowledge base)
        $toolIds = array_merge(
            $config['function_tool_ids'] ?? [],
            $config['tool_ids'] ?? [],
        );

        if (! empty($toolIds)) {
            $payload['model']['toolIds'] = $toolIds;
        }

        $webhookUrl = config('vapi.webhook_url');
        $serverSecret = config('vapi.server_secret');
        if ($webhookUrl) {
            $payload['server'] = array_filter([
                'url' => $webhookUrl,
                'secret' => $serverSecret,
                'timeoutSeconds' => 20,
                'headers' => [
                    'ngrok-skip-browser-warning' => 'true',
                    'Bypass-Tunnel-Reminder' => 'true',
                ],
            ]);

            // Native tools remain inline (endCall, voicemail, transferCall)
            $nativeTools = $this->buildNativeTools($config);
            if (! empty($nativeTools)) {
                $payload['model']['tools'] = $nativeTools;
            }

            // If no standalone function tools are synced yet, include inline as fallback
            if (empty($config['function_tool_ids'])) {
                $payload['model']['tools'] = array_merge(
                    $payload['model']['tools'] ?? [],
                    $this->buildFunctionToolDefinitions($webhookUrl),
                );
            }
        }

        return $payload;
    }

    /**
     * Build fallback voice configurations for reliability.
     *
     * Uses two Vapi voices different from the primary to ensure calls
     * continue working if the primary voice is unavailable.
     *
     * @return array<int, array{provider: string, voiceId: string}>
     */
    protected function buildVoiceFallbacks(string $primaryVoiceId): array
    {
        $fallbackPool = ['Elliot', 'Savannah', 'Emma', 'Rohan'];

        $fallbacks = array_values(array_filter(
            $fallbackPool,
            fn (string $voice) => $voice !== $primaryVoiceId,
        ));

        return array_map(
            fn (string $voiceId) => ['provider' => 'vapi', 'voiceId' => $voiceId],
            array_slice($fallbacks, 0, 2),
        );
    }

    /**
     * Build the full transcriber configuration including fallback plan.
     *
     * @return array{provider: string, language: string, model?: string, fallbackPlan: array{transcribers: array}}
     */
    protected function buildTranscriberConfig(array $config): array
    {
        $provider = $this->mapTranscriberProvider($config['transcriber_provider'] ?? 'deepgram');
        $language = $config['transcriber_language'] ?? $config['language'] ?? 'en';

        $transcriber = [
            'provider' => 'soniox', // $provider,
            'language' => 'ar', // $language,
            'model' => 'stt-rt-v5', // delete
        ];

        // if (! empty($config['transcriber_model'])) {
        //     $transcriber['model'] = $config['transcriber_model'];
        // } elseif ($provider === 'openai') {
        //     $transcriber['model'] = 'gpt-4o-transcribe';
        // } elseif ($provider === 'deepgram') {
        //     $transcriber['model'] = 'nova-3';
        // } elseif ($provider === 'soniox') {
        //     $transcriber['model'] = 'stt-rt-v5';
        // }

        return $transcriber;
    }

    /**
     * Build fallback transcriber configurations for reliability.
     *
     * Uses a different provider from the primary to ensure transcription
     * continues if the primary STT provider is unavailable.
     *
     * @return array<int, array{provider: string, language: string, model?: string}>
     */
    protected function buildTranscriberFallbacks(string $primaryProvider, string $language): array
    {
        $fallbacks = [];

        // Normalize language for Deepgram and OpenAI (they expect 'ar', not 'ar-JO')
        $fallbackLang = str_starts_with($language, 'ar-') ? 'ar' : $language;

        if ($primaryProvider !== 'deepgram') {
            $fallbacks[] = ['provider' => 'deepgram', 'language' => $fallbackLang, 'model' => 'nova-3'];
        }

        if ($primaryProvider !== 'openai') {
            $fallbacks[] = ['provider' => 'openai', 'language' => $fallbackLang, 'model' => 'gpt-4o-transcribe'];
        }

        return array_slice($fallbacks, 0, 2);
    }

    /**
     * Map internal transcriber provider to Vapi transcriber provider identifier.
     */
    protected function mapTranscriberProvider(string $provider): string
    {
        return match ($provider) {
            'openai-whisper' => 'openai',
            default => $provider,
        };
    }

    /**
     * Create a standalone tool on Vapi.
     *
     * @return array{id: string, type: string}
     *
     * @throws RequestException
     */
    public function createTool(array $payload): array
    {
        $response = $this->client->post('/tool', $payload)->throw();

        return $response->json();
    }

    /**
     * Update a standalone tool on Vapi.
     *
     * @throws RequestException
     */
    public function updateTool(string $toolId, array $payload): array
    {
        $response = $this->client->patch("/tool/{$toolId}", $payload)->throw();

        return $response->json();
    }

    /**
     * Retrieve a tool definition from Vapi.
     *
     * @return array{id: string, type: string, function?: array, knowledgeBases?: array}
     *
     * @throws RequestException
     */
    public function getTool(string $toolId): array
    {
        $response = $this->client->get("/tool/{$toolId}")->throw();

        return $response->json();
    }

    /**
     * Retrieve a file from Vapi.
     *
     * @return array{id: string, name: string, size?: int}
     *
     * @throws RequestException
     */
    public function getFile(string $fileId): array
    {
        $response = $this->client->get("/file/{$fileId}")->throw();

        return $response->json();
    }

    /**
     * Sync all function tools as standalone tools on Vapi.
     *
     * Creates or updates each function tool via POST/PATCH /tool so they appear
     * in the Vapi dashboard and can be referenced by toolIds in the assistant.
     *
     * @param  string[]|null  $existingToolIds  Previously stored tool IDs to update in place.
     * @return string[] Array of Vapi tool IDs.
     *
     * @throws RequestException
     */
    public function syncFunctionTools(string $webhookUrl, ?array $existingToolIds = null): array
    {
        $definitions = $this->buildFunctionToolDefinitions($webhookUrl);
        $toolIds = [];

        foreach ($definitions as $i => $definition) {
            $existingId = $existingToolIds[$i] ?? null;

            if ($existingId) {
                try {
                    // PATCH /tool/{id} does NOT accept 'type' — only updatable fields:
                    // function, server, messages, rejectionPlan, variableExtractionPlan
                    $updatePayload = $definition;
                    unset($updatePayload['type']);

                    $tool = $this->updateTool($existingId, $updatePayload);
                    $toolIds[] = $tool['id'];

                    continue;
                } catch (RequestException $e) {
                    // Tool may have been deleted on Vapi side — recreate
                    if ($e->response?->status() !== 404) {
                        throw $e;
                    }
                }
            }

            // POST /tool requires full definition: type, function, server
            $tool = $this->createTool($definition);
            $toolIds[] = $tool['id'];
        }

        return $toolIds;
    }

    /**
     * Build native tool definitions (endCall, voicemail, transferCall).
     *
     * These remain inline in the assistant payload as they are not function tools.
     *
     * @return array<int, array{type: string, messages?: array, destinations?: array}>
     */
    protected function buildNativeTools(array $config = []): array
    {
        return [
            [
                'type' => 'endCall',
                'messages' => [
                    [
                        'type' => 'request-start',
                        'content' => 'Thank you for calling. Have a great day!',
                    ],
                ],
            ],
            [
                'type' => 'voicemail',
                'messages' => [
                    [
                        'type' => 'request-start',
                        'content' => 'Hello, this is a call from the clinic regarding your appointment. Please call us back at your earliest convenience. Thank you.',
                    ],
                ],
            ],
            ...$this->buildTransferCallTool($config),
        ];
    }

    /**
     * Build function tool definitions for standalone tool creation.
     *
     * Each definition matches the Vapi POST /tool schema:
     * { type: "function", function: {...}, server: {url: ...} }
     *
     * @return array<int, array{type: string, function: array, server: array}>
     */
    public function buildFunctionToolDefinitions(string $webhookUrl): array
    {
        $server = array_filter([
            'url' => $webhookUrl,
            'secret' => config('vapi.server_secret'),
            'timeoutSeconds' => 20,
            'headers' => [
                'ngrok-skip-browser-warning' => 'true',
                'Bypass-Tunnel-Reminder' => 'true',
            ],
        ]);

        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'lookup_patient',
                    'description' => 'Look up a patient record by phone number, name, or date of birth. Call this as early as possible — the caller phone number is captured automatically from caller ID even if you do not pass it, so you do not need to ask the caller for their number. Pass any additional identifiers the caller has provided (name, DOB). If the caller provided their DOB during lookup and a unique patient is found, they are automatically verified.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'phone' => ['type' => 'string', 'description' => 'Patient phone number — optional, caller ID is used automatically if omitted'],
                            'first_name' => ['type' => 'string', 'description' => 'Patient first name'],
                            'last_name' => ['type' => 'string', 'description' => 'Patient last name'],
                            'date_of_birth' => ['type' => 'string', 'description' => 'Patient date of birth in any recognisable format, e.g. "March 15 1980", "03/15/1980", "1980-03-15"'],
                        ],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'create_patient_lead',
                    'description' => 'Create a new patient lead when a caller wants to book an appointment or leave a message. Collect the caller\'s basic information, including first name, last name, and phone number. DOB and gender are optional but helpful for verification purposes.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'first_name' => ['type' => 'string', 'description' => 'Caller first name'],
                            'last_name' => ['type' => 'string', 'description' => 'Caller last name'],
                            'phone' => ['type' => 'string', 'description' => 'Caller phone number — optional, caller ID is used automatically if omitted'],
                            'date_of_birth' => ['type' => 'string', 'description' => 'Caller date of birth in any recognisable format, e.g. "March 15 1980", "03/15/1980", "1980-03-15" (optional)'],
                            'gender' => ['type' => 'string', 'description' => 'Caller gender, confirmed verbally by the caller (optional).', 'enum' => ['male', 'female', 'prefer_not_to_say']],
                            'reason' => ['type' => 'string', 'description' => 'Reason for calling or visit'],
                        ],
                        'required' => ['first_name', 'last_name'],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'verify_identity',
                    'description' => 'Verify a patient identity by confirming their date of birth. Call this after lookup_patient returns a patient_id. Use the DOB the caller has ALREADY provided — do not ask for it again. Always pass patient_id from the lookup result.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'patient_id' => ['type' => 'integer', 'description' => 'Patient ID from a previous lookup_patient call'],
                            'date_of_birth' => ['type' => 'string', 'description' => 'The date of birth the caller provided in any recognisable format, e.g. "March 15 1980", "03/15/1980", "1980-03-15"'],
                        ],
                        'required' => ['patient_id', 'date_of_birth'],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'check_schedule',
                    'description' => 'Check provider availability for a given date and appointment type. Returns available time slots with slot_id references. Use slot_id when booking or rescheduling appointments.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'date' => ['type' => 'string', 'description' => 'The date to check in YYYY-MM-DD format'],
                            'provider_name' => ['type' => 'string', 'description' => 'Optional provider name to check specific provider availability'],
                            'appointment_type' => ['type' => 'string', 'description' => 'Type of appointment such as Follow-Up, New Patient, Consultation'],
                        ],
                        'required' => ['date'],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'check_appointment_types',
                    'description' => 'Get available appointment types before booking. Use this to present the caller with appointment type options so they can choose the right one.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => new \stdClass,
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'assess_urgency',
                    'description' => 'Only call this when a caller describes genuinely urgent or potentially life-threatening symptoms — chest pain, difficulty breathing, severe bleeding, stroke signs, suicidal thoughts, severe allergic reaction, or anything critical. Do NOT call this for everyday visit reasons like a cold, cough, checkup, follow-up, back pain, or general illness. For routine symptoms proceed directly to booking.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'symptoms' => ['type' => 'string', 'description' => 'Description of the symptoms or medical concern the caller described'],
                        ],
                        'required' => ['symptoms'],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'list_upcoming_appointments',
                    'description' => "List a patient's upcoming appointments. Use this BEFORE reschedule or cancel to let the caller identify which appointment they want to change. Requires identity verification.",
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'patient_id' => ['type' => 'integer', 'description' => 'Patient ID from a previous lookup_patient call'],
                        ],
                        'required' => ['patient_id'],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'book_appointment',
                    'description' => 'Book a new appointment for a patient. Requires patient_id from a previous lookup_patient or create_patient_lead call. For patients from create_patient_lead, identity is already confirmed — do NOT call verify_identity before booking. Always confirm all details with the caller before booking.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'patient_id' => ['type' => 'integer', 'description' => 'Patient ID from a previous lookup_patient call'],
                            'slot_id' => ['type' => 'string', 'description' => 'Slot ID from check_schedule (preferred — includes provider, date, and time)'],
                            'provider_name' => ['type' => 'string', 'description' => 'Name of the provider (fallback if no slot_id)'],
                            'date' => ['type' => 'string', 'description' => 'Appointment date in YYYY-MM-DD format (fallback if no slot_id)'],
                            'time' => ['type' => 'string', 'description' => 'Appointment time in HH:MM 24-hour format (fallback if no slot_id)'],
                            'appointment_type' => ['type' => 'string', 'description' => 'Type of appointment'],
                            'reason' => ['type' => 'string', 'description' => 'Reason for the visit'],
                        ],
                        'required' => ['patient_id'],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'reschedule_appointment',
                    'description' => 'Reschedule an existing appointment to a new date and time. Use appointment_id from list_upcoming_appointments and new_slot_id from check_schedule when available. Confirm the new date and time with the caller before rescheduling.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'appointment_id' => ['type' => 'integer', 'description' => 'Appointment ID from list_upcoming_appointments (preferred)'],
                            'patient_id' => ['type' => 'integer', 'description' => 'Patient ID (fallback if appointment_id not available)'],
                            'new_slot_id' => ['type' => 'string', 'description' => 'Slot ID from check_schedule for the new time (preferred — includes provider, date, and time)'],
                            'new_date' => ['type' => 'string', 'description' => 'New appointment date in YYYY-MM-DD format (fallback if no new_slot_id)'],
                            'new_time' => ['type' => 'string', 'description' => 'New appointment time in HH:MM 24-hour format (fallback if no new_slot_id)'],
                            'provider_name' => ['type' => 'string', 'description' => 'Optional new provider name if changing provider (fallback if no new_slot_id)'],
                        ],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'cancel_appointment',
                    'description' => 'Cancel an existing upcoming appointment. Use appointment_id from list_upcoming_appointments when available. Confirm the cancellation with the caller before proceeding.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'appointment_id' => ['type' => 'integer', 'description' => 'Appointment ID from list_upcoming_appointments (preferred)'],
                            'patient_id' => ['type' => 'integer', 'description' => 'Patient ID (fallback if appointment_id not available)'],
                            'reason' => ['type' => 'string', 'description' => 'Reason for cancellation'],
                        ],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'verify_insurance',
                    'description' => 'Verify a patient insurance eligibility and coverage details.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'patient_id' => ['type' => 'integer', 'description' => 'Patient ID from a previous lookup_patient call'],
                            'provider_name' => ['type' => 'string', 'description' => 'Optional insurance provider name to check specific plan'],
                        ],
                        'required' => ['patient_id'],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'create_callback_task',
                    'description' => 'Create a callback task for requests the AI cannot handle directly. Use for prescription refill requests, billing questions, medical records requests, lab result inquiries, messages for the doctor, or any request that needs staff follow-up. Always confirm the reason with the caller before creating.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'reason' => ['type' => 'string', 'description' => 'Detailed description of what the caller needs'],
                            'category' => ['type' => 'string', 'description' => 'Category: prescription, billing, records, lab_results, insurance, callback, or general'],
                            'urgent' => ['type' => 'boolean', 'description' => 'Whether this request is urgent'],
                        ],
                        'required' => ['reason'],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'transfer_call',
                    'description' => 'Request a call transfer to a specific department. This logs the transfer request and notifies staff. Always tell the caller who you are transferring them to before using this.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'department' => ['type' => 'string', 'description' => 'Target department: nurse, provider, billing, manager, or front desk'],
                            'reason' => ['type' => 'string', 'description' => 'Reason for the transfer'],
                        ],
                    ],
                ],
                'server' => $server,
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'send_sms',
                    'description' => 'Send a text message to the caller phone number. Always ask permission before sending.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'phone' => ['type' => 'string', 'description' => 'Phone number to send the text to'],
                            'message' => ['type' => 'string', 'description' => 'The text message content'],
                        ],
                        'required' => ['phone', 'message'],
                    ],
                ],
                'server' => $server,
            ],
        ];
    }

    /**
     * Build the native transferCall tool if a clinic phone is configured.
     *
     * @return array<int, array{type: string, destinations: array, messages: array}>
     */
    protected function buildTransferCallTool(array $config): array
    {
        $clinicPhone = $config['clinic_phone'] ?? null;

        if (! $clinicPhone) {
            return [];
        }

        return [
            [
                'type' => 'transferCall',
                'destinations' => [
                    [
                        'type' => 'number',
                        'number' => $clinicPhone,
                        'message' => 'I am transferring your call to the clinic now. Please hold.',
                    ],
                ],
                'messages' => [
                    [
                        'type' => 'request-start',
                        'content' => 'Let me transfer you to the clinic. One moment please.',
                    ],
                ],
            ],
        ];
    }
}
