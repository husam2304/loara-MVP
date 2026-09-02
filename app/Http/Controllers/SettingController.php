<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\UpdateClinicRequest;
use App\Http\Requests\UpdateNotificationSettingsRequest;
use App\Http\Requests\UpdateOperatingHoursRequest;
use App\Http\Requests\UpdateReminderSettingsRequest;
use App\Http\Requests\UpdateVapiConfigurationRequest;
use App\Models\AiConfiguration;
use App\Models\Clinic;
use App\Models\ClinicOperatingHour;
use App\Models\ClinicReminderSetting;
use App\Models\KnowledgeBaseFile;
use App\Models\NotificationSetting;
use App\Models\User;
use App\Services\VapiService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SettingController extends Controller
{
    /**
     * Resolve the active clinic for the current request.
     */
    private function resolveClinic(): ?Clinic
    {
        return auth()->user()->clinic;
    }

    /**
     * Store the super admin's selected clinic in session.
     */
    public function index(): Response
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return redirect()->route('dashboard')->with('error', 'No clinic associated with your account.');
        }

        $clinic->load('operatingHours');

        $aiConfiguration = $clinic->aiConfiguration;

        $knowledgeBaseFiles = KnowledgeBaseFile::query()
            ->where('clinic_id', $clinic->id)
            ->latest()
            ->get();

        $teamMembers = $clinic->users()->get();

        $notificationSetting = NotificationSetting::query()
            ->where('user_id', auth()->id())
            ->first();

        $auditLogs = $clinic->auditLogs()
            ->with('user')
            ->latest('created_at')
            ->limit(10)
            ->get();

        $reminderSetting = ClinicReminderSetting::where('clinic_id', $clinic->id)->first();

        return Inertia::render('Settings', [
            'clinic' => $clinic,
            'vapiConfiguration' => $aiConfiguration,
            'vapiKeyConfigured' => ! empty(config('vapi.private_key')),
            'vapiPublicKey' => config('vapi.public_key', ''),
            'knowledgeBaseFiles' => $knowledgeBaseFiles,
            'teamMembers' => $teamMembers,
            'notificationSetting' => $notificationSetting,
            'reminderSetting' => $reminderSetting,
            'auditLogs' => $auditLogs,
        ]);
    }

    public function updateClinic(UpdateClinicRequest $request): RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        $clinic->update($request->validated());

        return back()->with('success', 'Clinic information updated.');
    }

    public function uploadLogo(Request $request): RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        $request->validate([
            'logo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        if ($clinic->logo_url) {
            Storage::disk('public')->delete($clinic->logo_url);
        }

        $path = $request->file('logo')->store('clinic-logos', 'public');
        $clinic->update(['logo_url' => $path]);

        return back()->with('success', 'Logo uploaded successfully.');
    }

    public function removeLogo(): RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        if ($clinic->logo_url) {
            Storage::disk('public')->delete($clinic->logo_url);
            $clinic->update(['logo_url' => null]);
        }

        return back()->with('success', 'Logo removed.');
    }

    public function uploadFavicon(Request $request): RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        $request->validate([
            'favicon' => ['required', 'file', 'mimes:ico,png', 'max:512'],
        ]);

        if ($clinic->favicon_url) {
            Storage::disk('public')->delete($clinic->favicon_url);
        }

        $path = $request->file('favicon')->store('clinic-favicons', 'public');
        $clinic->update(['favicon_url' => $path]);

        return back()->with('success', 'Favicon uploaded successfully.');
    }

    public function removeFavicon(): RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        if ($clinic->favicon_url) {
            Storage::disk('public')->delete($clinic->favicon_url);
            $clinic->update(['favicon_url' => null]);
        }

        return back()->with('success', 'Favicon removed.');
    }

    public function updateOperatingHours(UpdateOperatingHoursRequest $request): RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        ClinicOperatingHour::upsert(
            collect($request->validated('hours'))->map(fn (array $hour) => [
                'clinic_id' => $clinic->id,
                'day_of_week' => $hour['day_of_week'],
                'open_time' => $hour['is_closed'] ? null : $hour['open_time'],
                'close_time' => $hour['is_closed'] ? null : $hour['close_time'],
                'is_closed' => $hour['is_closed'],
                'updated_at' => now(),
            ])->toArray(),
            uniqueBy: ['clinic_id', 'day_of_week'],
            update: ['open_time', 'close_time', 'is_closed', 'updated_at'],
        );

        return back()->with('success', 'Operating hours updated.');
    }

    public function updateVapiConfiguration(UpdateVapiConfigurationRequest $request): RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        if (empty(config('vapi.private_key'))) {
            return back()->withErrors(['vapi' => 'API key is not configured. Add VAPI_PRIVATE_KEY to your .env file.']);
        }

        $existingConfig = $clinic->aiConfiguration;
        $validated = $request->validated();

        // Include knowledge base tool ID if configured
        $knowledgeBaseToolIds = [];
        if ($existingConfig?->vapi_knowledge_base_tool_id) {
            $knowledgeBaseToolIds[] = $existingConfig->vapi_knowledge_base_tool_id;
        }

        // Only include clinic_phone if it's a valid E.164 number (e.g. +15551234567)
        $clinicPhone = $clinic->phone && preg_match('/^\+[1-9]\d{1,14}$/', $clinic->phone) ? $clinic->phone : null;

        // Vapi API calls can take longer than the default 30s max execution time
        set_time_limit(120);

        try {
            $vapi = app(VapiService::class);

            // Sync function tools as standalone tools in Vapi (creates/updates them)
            $webhookUrl = config('vapi.webhook_url');
            $functionToolIds = $existingConfig?->vapi_function_tool_ids;

            if ($webhookUrl) {
                $functionToolIds = $vapi->syncFunctionTools($webhookUrl, $functionToolIds);
            }

            $assistantData = array_merge($validated, [
                'name' => $clinic->name.' AI Assistant',
                'clinic_name' => $clinic->name,
                'clinic_phone' => $clinicPhone,
                'function_tool_ids' => $functionToolIds ?? [],
                'tool_ids' => $knowledgeBaseToolIds,
            ]);

            // Count expected tools: function tools + knowledge base + native tools
            $expectedToolCount = count($functionToolIds ?? []) + count($knowledgeBaseToolIds);

            if ($existingConfig?->vapi_assistant_id) {
                $vapi->updateAssistant($existingConfig->vapi_assistant_id, $assistantData);
                $vapi->verifyAssistant($existingConfig->vapi_assistant_id, $expectedToolCount);

                $existingConfig->update(array_merge($validated, [
                    'vapi_function_tool_ids' => $functionToolIds,
                ]));

                return back()->with('success', 'AI Assistant updated successfully.');
            }

            $assistant = $vapi->createAssistant($assistantData);
            $vapi->verifyAssistant($assistant['id'], $expectedToolCount);

            AiConfiguration::updateOrCreate(
                ['clinic_id' => $clinic->id],
                array_merge($validated, [
                    'vapi_assistant_id' => $assistant['id'],
                    'vapi_function_tool_ids' => $functionToolIds,
                ]),
            );

            return back()->with('success', 'AI Assistant created successfully.');
        } catch (RequestException $e) {
            $body = $e->response?->json() ?? [];
            $status = $e->response?->status();
            $errorMsg = $body['message']
                ?? $body['error']['message']
                ?? $body['error']
                ?? $body['detail']
                ?? null;

            if (! $errorMsg) {
                $errorMsg = $status
                    ? "Vapi API returned HTTP {$status}. Please try again."
                    : 'Failed to sync AI Assistant. Please check your API key and try again.';
            }

            Log::error('Vapi sync failed', ['status' => $status, 'body' => $body]);

            return back()->withErrors(['vapi' => $errorMsg]);
        } catch (RuntimeException $e) {
            Log::error('Vapi verification failed', ['error' => $e->getMessage()]);

            return back()->withErrors(['vapi' => $e->getMessage()]);
        }
    }

    /**
     * Proxy a text chat message to the Vapi Chat API.
     */
    public function chatWithAssistant(Request $request): JsonResponse
    {
        $request->validate([
            'input' => ['required', 'string', 'max:2000'],
            'previous_chat_id' => ['nullable', 'string'],
        ]);

        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return response()->json(['error' => 'No clinic associated with your account.'], 422);
        }

        $config = $clinic->aiConfiguration;

        if (! $config?->vapi_assistant_id) {
            return response()->json(['error' => 'No AI Assistant configured. Save your agent first.'], 422);
        }

        if (empty(config('vapi.private_key'))) {
            return response()->json(['error' => 'API key is not configured.'], 422);
        }

        try {
            $vapi = app(VapiService::class);

            $result = $vapi->chat(
                $config->vapi_assistant_id,
                $request->input('input'),
                $request->input('previous_chat_id'),
            );

            $output = $result['output'][0]['content'] ?? $result['output'] ?? 'No response from assistant.';

            return response()->json([
                'chat_id' => $result['id'] ?? null,
                'output' => is_string($output) ? $output : 'No response from assistant.',
            ]);
        } catch (RequestException $e) {
            $body = $e->response?->json() ?? [];

            return response()->json([
                'error' => $body['message'] ?? 'Failed to get response from assistant.',
            ], $e->response?->status() ?? 500);
        }
    }

    public function updateNotifications(UpdateNotificationSettingsRequest $request): RedirectResponse
    {
        NotificationSetting::updateOrCreate(
            ['user_id' => $request->user()->id],
            $request->validated(),
        );

        return back()->with('success', 'Notification preferences updated.');
    }

    public function updateReminderSettings(UpdateReminderSettingsRequest $request): RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        ClinicReminderSetting::updateOrCreate(
            ['clinic_id' => $clinic->id],
            $request->validated(),
        );

        return back()->with('success', 'Reminder settings updated.');
    }

    public function provisionPhoneNumber(Request $request): JsonResponse
    {
        $rules = [
            'provider_type' => ['required', 'string', 'in:vapi_number,vapi_sip,twilio,vonage,telnyx,byo_sip_trunk'],
        ];

        $providerType = $request->input('provider_type');

        $rules = match ($providerType) {
            'vapi_number' => [
                ...$rules,
                'area_code' => ['nullable', 'string', 'size:3', 'regex:/^\d{3}$/'],
            ],
            'vapi_sip' => [
                ...$rules,
                'sip_username' => ['required', 'string', 'max:100'],
                'sip_password' => ['required', 'string', 'max:100'],
            ],
            'twilio' => [
                ...$rules,
                'phone_number' => ['required', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
                'twilio_account_sid' => ['required', 'string', 'max:100'],
                'twilio_auth_token' => ['required_without:twilio_api_key', 'nullable', 'string', 'max:100'],
                'twilio_api_key' => ['required_without:twilio_auth_token', 'nullable', 'string', 'max:100'],
                'twilio_api_secret' => ['required_with:twilio_api_key', 'nullable', 'string', 'max:100'],
            ],
            'vonage' => [
                ...$rules,
                'phone_number' => ['required', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
                'credential_id' => ['required', 'string', 'max:100'],
            ],
            'telnyx' => [
                ...$rules,
                'phone_number' => ['required', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
                'credential_id' => ['required', 'string', 'max:100'],
            ],
            'byo_sip_trunk' => [
                ...$rules,
                'credential_id' => ['required', 'string', 'max:100'],
                'phone_number' => ['required', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
                'number_e164_check_enabled' => ['nullable', 'boolean'],
            ],
            default => $rules,
        };

        $request->validate($rules);

        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return response()->json(['error' => 'No clinic associated with your account.'], 422);
        }

        $config = $clinic->aiConfiguration;

        if (! $config || ! $config->vapi_assistant_id) {
            return response()->json([
                'error' => 'Please save your AI Assistant configuration first.',
            ], 422);
        }

        if (empty(config('vapi.private_key'))) {
            return response()->json([
                'error' => 'API key is not configured. Add VAPI_PRIVATE_KEY to your .env file.',
            ], 422);
        }

        try {
            $vapi = app(VapiService::class);

            $phoneName = mb_substr($clinic->name.' - AI Line', 0, 40);
            $payload = $this->buildPhoneNumberPayload($providerType, $request, $config->vapi_assistant_id, $phoneName);

            $created = $vapi->createPhoneNumber($payload);

            // Cross-check — read back from Vapi to get the verified state
            $verified = $vapi->getPhoneNumber($created['id']);

            $config->update([
                'vapi_phone_number_id' => $verified['id'],
                'vapi_phone_number' => $verified['number'] ?? null,
                'vapi_phone_number_status' => $verified['status'] ?? 'activating',
                'vapi_phone_number_sip_uri' => $verified['sipUri'] ?? null,
                'vapi_phone_number_provider' => $verified['provider'] ?? $payload['provider'],
            ]);

            return response()->json([
                'message' => 'Phone number provisioned successfully.',
                'phone' => [
                    'id' => $verified['id'],
                    'number' => $verified['number'] ?? null,
                    'status' => $verified['status'] ?? 'activating',
                    'sipUri' => $verified['sipUri'] ?? null,
                    'name' => $verified['name'] ?? $phoneName,
                    'provider' => $verified['provider'] ?? $payload['provider'],
                    'assistantId' => $verified['assistantId'] ?? null,
                ],
            ]);
        } catch (RequestException $e) {
            $body = $e->response?->json() ?? [];

            return response()->json([
                'error' => $body['message'] ?? 'Failed to provision phone number. Please check your credentials and try again.',
            ], $e->response?->status() ?? 500);
        }
    }

    /**
     * Build the VAPI API payload for phone number creation based on provider type.
     */
    private function buildPhoneNumberPayload(string $providerType, Request $request, string $assistantId, string $name): array
    {
        $base = ['name' => $name, 'assistantId' => $assistantId];

        return match ($providerType) {
            'vapi_number' => [
                ...$base,
                'provider' => 'vapi',
                ...($request->filled('area_code') ? ['numberDesiredAreaCode' => $request->input('area_code')] : []),
            ],
            'vapi_sip' => [
                ...$base,
                'provider' => 'vapi',
                'sipUri' => 'sip:' . \Illuminate\Support\Str::slug($request->input('sip_username')) . '@sip.vapi.ai',
            ],
            'twilio' => [
                ...$base,
                'provider' => 'twilio',
                'number' => $request->input('phone_number'),
                'twilioAccountSid' => $request->input('twilio_account_sid'),
                ...($request->filled('twilio_auth_token') ? ['twilioAuthToken' => $request->input('twilio_auth_token')] : []),
                ...($request->filled('twilio_api_key') ? ['twilioApiKey' => $request->input('twilio_api_key')] : []),
                ...($request->filled('twilio_api_secret') ? ['twilioApiSecret' => $request->input('twilio_api_secret')] : []),
            ],
            'vonage' => [
                ...$base,
                'provider' => 'vonage',
                'number' => $request->input('phone_number'),
                'credentialId' => $request->input('credential_id'),
            ],
            'telnyx' => [
                ...$base,
                'provider' => 'telnyx',
                'number' => $request->input('phone_number'),
                'credentialId' => $request->input('credential_id'),
            ],
            'byo_sip_trunk' => [
                ...$base,
                'provider' => 'byo-phone-number',
                'credentialId' => $request->input('credential_id'),
                'number' => $request->input('phone_number'),
                ...($request->has('number_e164_check_enabled') ? ['numberE164CheckEnabled' => (bool) $request->input('number_e164_check_enabled')] : []),
            ],
        };
    }

    /**
     * Poll Vapi for the current phone number status and update local DB.
     */
    public function checkPhoneNumberStatus(): JsonResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return response()->json(['error' => 'No clinic associated with your account.'], 422);
        }

        $config = $clinic->aiConfiguration;

        if (! $config || ! $config->vapi_phone_number_id) {
            return response()->json(['error' => 'No phone number to check.'], 422);
        }

        try {
            $vapi = app(VapiService::class);
            $phone = $vapi->getPhoneNumber($config->vapi_phone_number_id);

            $config->update([
                'vapi_phone_number' => $phone['number'] ?? $config->vapi_phone_number,
                'vapi_phone_number_status' => $phone['status'] ?? $config->vapi_phone_number_status,
                'vapi_phone_number_sip_uri' => $phone['sipUri'] ?? $config->vapi_phone_number_sip_uri,
            ]);

            return response()->json([
                'phone' => [
                    'id' => $phone['id'],
                    'number' => $phone['number'] ?? null,
                    'status' => $phone['status'] ?? 'activating',
                    'sipUri' => $phone['sipUri'] ?? null,
                    'name' => $phone['name'] ?? null,
                    'provider' => $phone['provider'] ?? 'vapi',
                    'assistantId' => $phone['assistantId'] ?? null,
                ],
            ]);
        } catch (RequestException $e) {
            $body = $e->response?->json() ?? [];

            return response()->json([
                'error' => $body['message'] ?? 'Failed to check phone number status.',
            ], $e->response?->status() ?? 500);
        }
    }

    public function releaseVapiPhoneNumber(): JsonResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return response()->json(['error' => 'No clinic associated with your account.'], 422);
        }

        $config = $clinic->aiConfiguration;

        if (! $config || ! $config->vapi_phone_number_id) {
            return response()->json(['error' => 'No phone number to release.'], 422);
        }

        try {
            $vapi = app(VapiService::class);
            $vapi->deletePhoneNumber($config->vapi_phone_number_id);

            $config->update([
                'vapi_phone_number_id' => null,
                'vapi_phone_number' => null,
                'vapi_phone_number_status' => null,
                'vapi_phone_number_sip_uri' => null,
                'vapi_phone_number_provider' => null,
            ]);

            return response()->json(['message' => 'Phone number released successfully.']);
        } catch (RequestException $e) {
            $body = $e->response?->json() ?? [];

            return response()->json([
                'error' => $body['message'] ?? 'Failed to release phone number.',
            ], $e->response?->status() ?? 500);
        }
    }

    public function storeUser(Request $request): RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'role' => ['required', Rule::enum(UserRole::class)->except([UserRole::SuperAdmin])],
        ]);

        User::create([
            'clinic_id' => $clinic->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'password' => Hash::make(Str::random(32)),
            'is_active' => true,
        ]);

        return back()->with('success', 'Team member invited successfully.');
    }

    public function updateUser(Request $request, User $user): RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic || $user->clinic_id !== $clinic->id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['sometimes', Rule::enum(UserRole::class)->except([UserRole::SuperAdmin])],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $user->update($validated);

        return back()->with('success', 'Team member updated successfully.');
    }

    public function destroyUser(User $user): RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic || $user->clinic_id !== $clinic->id) {
            abort(403);
        }

        $user->delete();

        return back()->with('success', 'Team member removed successfully.');
    }

    public function exportAuditLog(): StreamedResponse|RedirectResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        $logs = $clinic->auditLogs()
            ->with('user')
            ->latest('created_at')
            ->get();

        return response()->streamDownload(function () use ($logs) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Date', 'Action', 'User', 'Status', 'Description']);

            foreach ($logs as $log) {
                fputcsv($handle, [
                    $log->created_at->toDateTimeString(),
                    $log->action,
                    $log->user?->name ?? 'System',
                    $log->status->value,
                    $log->description ?? '',
                ]);
            }

            fclose($handle);
        }, 'audit-log-'.now()->format('Y-m-d').'.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Upload a file to the knowledge base.
     */
    public function uploadKnowledgeBaseFile(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:1024', 'mimes:txt,pdf,docx,doc,csv,md,json,xml'],
        ]);

        $clinic = $this->resolveClinic();

        if (! $clinic) {
            return response()->json(['error' => 'No clinic associated with your account.'], 422);
        }

        $config = $clinic->aiConfiguration;

        if (! $config || ! $config->vapi_assistant_id) {
            return response()->json([
                'error' => 'Please save your agent first before uploading knowledge base files.',
            ], 422);
        }

        if (empty(config('vapi.private_key'))) {
            return response()->json([
                'error' => 'API key is not configured.',
            ], 422);
        }

        try {
            $vapi = app(VapiService::class);
            $file = $request->file('file');

            // Step 1: Upload file to Vapi
            $vapiFile = $vapi->uploadFile(
                $file->getPathname(),
                $file->getClientOriginalName(),
                $file->getClientMimeType(),
            );

            // Step 2: Store file record locally
            $kbFile = KnowledgeBaseFile::create([
                'clinic_id' => $clinic->id,
                'original_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
                'mime_type' => $file->getClientMimeType(),
                'vapi_file_id' => $vapiFile['id'],
            ]);

            // Step 3: Rebuild the query tool with all file IDs
            $this->rebuildKnowledgeBaseTool($clinic, $config, $vapi);

            return response()->json([
                'message' => 'File uploaded and knowledge base updated.',
                'file' => $kbFile,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a file from the knowledge base.
     */
    public function deleteKnowledgeBaseFile(KnowledgeBaseFile $knowledgeBaseFile): JsonResponse
    {
        $clinic = $this->resolveClinic();

        if (! $clinic || $knowledgeBaseFile->clinic_id !== $clinic->id) {
            abort(403);
        }

        $config = $clinic->aiConfiguration;

        if (empty(config('vapi.private_key'))) {
            return response()->json(['error' => 'API key is not configured.'], 422);
        }

        try {
            $vapi = app(VapiService::class);

            // Step 1: Delete file from Vapi (ignore 404 — file may already be gone)
            try {
                $vapi->deleteFile($knowledgeBaseFile->vapi_file_id);
            } catch (RequestException $e) {
                if ($e->response?->status() !== 404) {
                    throw $e;
                }
            }

            // Step 2: Delete local record
            $knowledgeBaseFile->delete();

            // Step 3: Rebuild or remove the query tool
            $this->rebuildKnowledgeBaseTool($clinic, $config, $vapi);

            return response()->json(['message' => 'File removed from knowledge base.']);
        } catch (RequestException $e) {
            $body = $e->response?->json() ?? [];
            $errorMsg = $body['message'] ?? $body['error'] ?? null;

            if (! $errorMsg) {
                $contentType = $e->response?->header('Content-Type') ?? '';
                $errorMsg = str_contains($contentType, 'text/html')
                    ? 'Request blocked by security. Please try again in a moment.'
                    : 'Failed to delete file from knowledge base.';
            }

            return response()->json([
                'error' => is_string($errorMsg) ? $errorMsg : 'Failed to delete file.',
            ], $e->response?->status() ?? 500);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Delete failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Rebuild the Vapi query tool with current file IDs and sync to assistant.
     */
    private function rebuildKnowledgeBaseTool(Clinic $clinic, AiConfiguration $config, VapiService $vapi): void
    {
        // Delete existing tool if present
        if ($config->vapi_knowledge_base_tool_id) {
            try {
                $vapi->deleteTool($config->vapi_knowledge_base_tool_id);
            } catch (RequestException) {
                // Tool may already be deleted on Vapi side
            }
            $config->update(['vapi_knowledge_base_tool_id' => null]);
        }

        // Get all remaining file IDs
        $fileIds = KnowledgeBaseFile::query()
            ->where('clinic_id', $clinic->id)
            ->pluck('vapi_file_id')
            ->toArray();

        $toolIds = [];

        if (count($fileIds) > 0) {
            // Create new query tool
            $tool = $vapi->createQueryTool($fileIds, $clinic->name);
            $config->update(['vapi_knowledge_base_tool_id' => $tool['id']]);
            $toolIds[] = $tool['id'];
        }

        // Sync tool IDs to assistant
        if ($config->vapi_assistant_id) {
            $clinicPhone = $clinic->phone && preg_match('/^\+[1-9]\d{1,14}$/', $clinic->phone) ? $clinic->phone : null;

            $vapi->updateAssistant($config->vapi_assistant_id, array_merge(
                $config->only([
                    'model_provider', 'model', 'temperature', 'voice_provider',
                    'voice_name', 'voice_id', 'transcriber_provider', 'language',
                    'greeting_message', 'system_prompt', 'first_message_mode',
                    'max_call_duration_seconds', 'silence_timeout_seconds',
                    'hipaa_enabled', 'backchanneling_enabled', 'background_sound',
                    'enable_recording', 'end_call_message', 'after_hours_message',
                ]),
                [
                    'name' => $clinic->name.' AI Assistant',
                    'clinic_name' => $clinic->name,
                    'clinic_phone' => $clinicPhone,
                    'function_tool_ids' => $config->vapi_function_tool_ids ?? [],
                    'tool_ids' => $toolIds,
                ],
            ));
        }
    }
}
