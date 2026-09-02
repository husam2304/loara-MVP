<?php

namespace App\Http\Controllers\Api;

use App\Enums\CallDirection;
use App\Enums\CallSentiment;
use App\Enums\CallSpeaker;
use App\Enums\CallStatus;
use App\Enums\CallToolName;
use App\Http\Controllers\Controller;
use App\Jobs\DownloadCallRecording;
use App\Models\AiConfiguration;
use App\Models\Call;
use App\Models\CallRecording;
use App\Models\CallToolInvocation;
use App\Models\CallTranscript;
use App\Models\Clinic;
use App\Services\UsageService;
use App\Services\VapiToolDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class VapiWebhookController extends Controller
{
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $messageType = $payload['message']['type'] ?? null;

        // Verify webhook secret
        $serverSecret = config('vapi.server_secret');
        if (! $serverSecret || ! hash_equals($serverSecret, (string) $request->header('x-vapi-secret'))) {
            Log::warning('Vapi webhook: invalid or missing secret', ['ip' => $request->ip()]);

            return response()->json(['status' => 'unauthorized'], 401);
        }

        // Full raw payload logging. Every message Vapi sends (any type) is
        // logged in full so we have a complete audit trail of everything
        // received, independent of whatever the specific handler below does
        // with it. Tagged with a request id so all log lines for one webhook
        // delivery can be correlated.
        $requestId = (string) Str::uuid();
        $request->attributes->set('vapi_request_id', $requestId);

        Log::channel(config('vapi.log_channel', 'stack'))->info('Vapi webhook received', [
            'request_id' => $requestId,
            'type' => $messageType,
            'call_id' => $payload['message']['call']['id'] ?? null,
            'chat_id' => $payload['message']['chat']['id'] ?? null,
            'assistant_id' => $payload['message']['assistant']['id'] ?? null,
            'payload' => $payload,
        ]);

        $response = match ($messageType) {
            'status-update' => $this->handleStatusUpdate($payload, $requestId),
            'end-of-call-report' => $this->handleEndOfCallReport($payload, $requestId),
            'transcript' => $this->handleTranscript($payload, $requestId),
            'tool-calls' => $this->handleToolCalls($payload, $requestId),
            'assistant-request' => $this->handleAssistantRequest($payload, $requestId),
            default => response()->json(['status' => 'ignored']),
        };

        // Log what we sent back, so request/response pairs can be replayed
        // from the logs alone.
        Log::channel(config('vapi.log_channel', 'stack'))->info('Vapi webhook response', [
            'request_id' => $requestId,
            'type' => $messageType,
            'status_code' => $response->getStatusCode(),
            'response' => $response->getData(true),
        ]);

        return $response;
    }

    private function handleStatusUpdate(array $payload, string $requestId): JsonResponse
    {
        $message = $payload['message'];
        $vapiCallId = $message['call']['id'] ?? null;

        Log::info('Vapi webhook status-update: params', [
            'request_id' => $requestId,
            'vapi_call_id' => $vapiCallId,
            'status' => $message['status'] ?? null,
            'ended_reason' => $message['endedReason'] ?? null,
            'call' => $message['call'] ?? null,
        ]);

        if (! $vapiCallId) {
            Log::warning('Vapi webhook status-update: missing call ID', ['request_id' => $requestId]);

            return response()->json(['status' => 'error', 'message' => 'Missing call ID'], 400);
        }

        $statusMap = [
            'queued' => CallStatus::Queued,
            'ringing' => CallStatus::Ringing,
            'in-progress' => CallStatus::InProgress,
            'forwarding' => CallStatus::Transferred,
            'ended' => CallStatus::Ended,
        ];

        $vapiStatus = $message['status'] ?? null;
        $status = $statusMap[$vapiStatus] ?? null;

        if (! $status) {
            Log::info('Vapi webhook status-update: unmapped status ignored', [
                'request_id' => $requestId,
                'vapi_status' => $vapiStatus,
            ]);

            return response()->json(['status' => 'ignored']);
        }

        $call = Call::where('vapi_call_id', $vapiCallId)->first();

        if ($call) {
            $updateData = ['status' => $status];

            if ($status === CallStatus::InProgress) {
                $updateData['answered_at'] = now();
            }

            if ($status === CallStatus::Ended) {
                $updateData['ended_at'] = now();
                $updateData['end_reason'] = $message['endedReason'] ?? null;
            }

            $call->update($updateData);

            Log::info('Vapi webhook status-update: call updated', [
                'request_id' => $requestId,
                'call_id' => $call->id,
                'vapi_call_id' => $vapiCallId,
                'update' => $updateData,
            ]);
        } else {
            $callData = $message['call'] ?? [];
            $clinic = $this->resolveClinicFromCall($callData);

            $directionMap = [
                'inboundPhoneCall' => CallDirection::Inbound,
                'outboundPhoneCall' => CallDirection::Outbound,
                'webCall' => CallDirection::Web,
            ];

            if (! $clinic) {
                // Quarantine the call instead of dropping it: keep a reviewable
                // record with no clinic, and answer 200 so Vapi does not retry a
                // request that would fail identically. An unresolved clinic always
                // means Vapi and the local DB have drifted out of sync.
                Log::error('Vapi webhook: could not resolve clinic from call data, call quarantined', [
                    'request_id' => $requestId,
                    'call' => $callData,
                ]);

                $quarantined = Call::firstOrCreate(
                    ['vapi_call_id' => $vapiCallId],
                    [
                        'clinic_id' => null,
                        'direction' => $directionMap[$callData['type'] ?? ''] ?? CallDirection::Inbound,
                        'caller_phone' => $callData['customer']['number'] ?? $callData['customer']['sipUri'] ?? 'unknown',
                        'caller_name' => $callData['customer']['name'] ?? null,
                        'status' => $status,
                        'started_at' => now(),
                        'ai_handled' => true,
                        'language' => 'en',
                    ],
                );

                Log::info('Vapi webhook status-update: call quarantined', [
                    'request_id' => $requestId,
                    'call_id' => $quarantined->id,
                    'vapi_call_id' => $vapiCallId,
                ]);

                return response()->json(['status' => 'quarantined']);
            }

            $aiConfig = $clinic->aiConfiguration;

            $created = Call::firstOrCreate(
                ['vapi_call_id' => $vapiCallId],
                [
                    'clinic_id' => $clinic->id,
                    'direction' => $directionMap[$callData['type'] ?? ''] ?? CallDirection::Inbound,
                    'caller_phone' => $callData['customer']['number'] ?? 'unknown',
                    'caller_SipUri' => $callData['customer']['sipUri'] ?? null,
                    'caller_name' => $callData['customer']['name'] ?? null,
                    'status' => $status,
                    'started_at' => now(),
                    'ai_handled' => true,
                    'language' => $aiConfig->language ?? 'en',
                ],
            );

            Log::info('Vapi webhook: new call created', [
                'request_id' => $requestId,
                'call_id' => $created->id,
                'vapi_call_id' => $vapiCallId,
                'clinic_id' => $clinic->id,
            ]);
        }

        return response()->json(['status' => 'ok']);
    }

    private function handleEndOfCallReport(array $payload, string $requestId): JsonResponse
    {
        $message = $payload['message'];
        $vapiCallId = $message['call']['id'] ?? null;

        Log::info('Vapi webhook end-of-call-report: params', [
            'request_id' => $requestId,
            'vapi_call_id' => $vapiCallId,
            'ended_reason' => $message['endedReason'] ?? null,
            'summary' => $message['summary'] ?? null,
            'analysis' => $message['analysis'] ?? null,
            'recording_url' => $message['recordingUrl'] ?? null,
            'messages_count' => isset($message['messages']) && is_array($message['messages']) ? count($message['messages']) : 0,
            'call' => $message['call'] ?? null,
        ]);

        if (! $vapiCallId) {
            Log::warning('Vapi webhook end-of-call-report: missing call ID', ['request_id' => $requestId]);

            return response()->json(['status' => 'error'], 400);
        }

        $call = Call::where('vapi_call_id', $vapiCallId)->first();

        if (! $call) {
            Log::warning('Vapi webhook end-of-call-report: call not found', [
                'request_id' => $requestId,
                'vapi_call_id' => $vapiCallId,
            ]);

            return response()->json(['status' => 'not_found'], 404);
        }

        // FIX: startedAt/endedAt/cost/durationSeconds/costBreakdown are
        // top-level fields on `message`, not nested inside `message.call`.
        // `message.call` only carries call metadata (id, transport, a stale
        // cost:0 placeholder from call creation) and never has these fields.
        // Reading them from $callData silently produced null duration / $0
        // cost on every call, which in turn meant call-minute usage was
        // never recorded (see the gate further below).
        $callData = $message['call'] ?? [];

        $duration = null;
        if (isset($message['durationSeconds'])) {
            $duration = (int) round((float) $message['durationSeconds']);
        } elseif (isset($message['durationMs'])) {
            $duration = (int) round(((float) $message['durationMs']) / 1000);
        } elseif (isset($message['startedAt'], $message['endedAt'])) {
            $duration = (int) abs(Carbon::parse($message['endedAt'])->diffInSeconds(Carbon::parse($message['startedAt'])));
        }

        // Safely cast sentiment string to enum
        $rawSentiment = $message['analysis']['sentiment'] ?? null;
        $sentiment = $rawSentiment ? CallSentiment::tryFrom(strtolower($rawSentiment)) : null;

        // Extract AI confidence score from analysis or top-level cost breakdown
        $confidenceScore = $message['analysis']['successEvaluation'] ?? $message['costBreakdown']['analysisCostBreakdown']['successRatePercentage'] ?? null;
        if ($confidenceScore !== null) {
            $confidenceScore = min(1.0, max(0.0, (float) $confidenceScore / ($confidenceScore > 1 ? 100 : 1)));
        }

        // Vapi can redeliver end-of-call-report. Record usage only the first time
        // this call is completed so redelivery doesn't double-count minutes.
        $alreadyCompleted = $call->status === CallStatus::Completed;

        $updateData = [
            'status' => CallStatus::Completed,
            'ended_at' => $message['endedAt'] ?? $callData['endedAt'] ?? now(),
            'end_reason' => $message['endedReason'] ?? $callData['endedReason'] ?? null,
            'summary' => $message['summary'] ?? null,
            'duration_seconds' => $duration,
            'cost' => $message['cost'] ?? $callData['cost'] ?? null,
            'sentiment' => $sentiment,
            'ai_confidence_score' => $confidenceScore,
        ];

        $call->update($updateData);

        Log::info('Vapi webhook end-of-call-report: call updated', [
            'request_id' => $requestId,
            'call_id' => $call->id,
            'vapi_call_id' => $vapiCallId,
            'already_completed' => $alreadyCompleted,
            'update' => $updateData,
        ]);

        // Record AI call minutes usage (once per call). Quarantined calls have
        // no clinic, so usage cannot be attributed until they are claimed.
        if (! $alreadyCompleted && $duration && $duration > 0 && $call->clinic) {
            app(UsageService::class)->recordCallMinutes($call->clinic, $duration);

            Log::info('Vapi webhook end-of-call-report: usage recorded', [
                'request_id' => $requestId,
                'call_id' => $call->id,
                'clinic_id' => $call->clinic->id,
                'duration_seconds' => $duration,
            ]);
        }

        // Store recording metadata and pull the audio into our own storage so
        // the clinic keeps a copy independent of Vapi's retention and access.
        // FIX: prefer the presigned URL when the bucket is private (e.g. the
        // hipaa-recordings bucket) — the raw recordingUrl alone likely 403s
        // when the download job tries to fetch it.
        $downloadUrl = $message['presignedStereoUrl']
            ?? $message['presignedMonoUrl']
            ?? $message['recordingUrl']
            ?? null;

        if ($downloadUrl) {
            $recording = CallRecording::firstOrNew(['call_id' => $call->id]);
            $recording->file_url = $message['recordingUrl'] ?? $downloadUrl;
            $recording->duration_seconds = $duration ?? $recording->duration_seconds ?? 0;

            if (! $recording->exists) {
                $recording->file_path = '';
                $recording->format = 'wav';
                $recording->created_at = now();
            }

            $recording->save();

            Log::info('Vapi webhook end-of-call-report: recording stored', [
                'request_id' => $requestId,
                'call_id' => $call->id,
                'recording_id' => $recording->id,
                'recording_url' => $message['recordingUrl'] ?? null,
                'used_presigned_url' => $downloadUrl !== ($message['recordingUrl'] ?? null),
            ]);

            if ($recording->file_path === '') {
                // NOTE: confirm DownloadCallRecording resolves the presigned
                // URL itself (or accepts one) rather than re-deriving a raw
                // URL from $recording->file_url, otherwise the fetch will
                // still 403 against a private bucket.
                DownloadCallRecording::dispatch($recording->id);

                Log::info('Vapi webhook end-of-call-report: recording download dispatched', [
                    'request_id' => $requestId,
                    'recording_id' => $recording->id,
                ]);
            }
        }

        // Store structured transcript from messages array (preferred over raw transcript string)
        if (isset($message['messages']) && is_array($message['messages'])) {
            // Only insert if we don't already have line-by-line transcripts from the transcript event
            $existingCount = CallTranscript::where('call_id', $call->id)->count();
            if ($existingCount === 0) {
                $storedCount = 0;
                $skippedCount = 0;

                foreach ($message['messages'] as $msg) {
                    $role = $msg['role'] ?? null;
                    $content = $msg['message'] ?? $msg['content'] ?? '';

                    // FIX: entries with role "tool_calls" / "tool_call_result"
                    // carry no message text and were previously stored as
                    // blank-content System rows, polluting the transcript.
                    // Only persist actual spoken turns.
                    if (! in_array($role, ['bot', 'user'], true) || trim((string) $content) === '') {
                        $skippedCount++;

                        continue;
                    }

                    CallTranscript::create([
                        'call_id' => $call->id,
                        'speaker' => $role === 'bot' ? CallSpeaker::Ai : CallSpeaker::Patient,
                        'content' => $content,
                        'timestamp_ms' => isset($msg['secondsFromStart']) ? (int) ($msg['secondsFromStart'] * 1000) : 0,
                    ]);

                    $storedCount++;
                }

                Log::info('Vapi webhook end-of-call-report: transcript messages stored', [
                    'request_id' => $requestId,
                    'call_id' => $call->id,
                    'stored' => $storedCount,
                    'skipped' => $skippedCount,
                ]);
            } else {
                Log::info('Vapi webhook end-of-call-report: transcript messages skipped, already present', [
                    'request_id' => $requestId,
                    'call_id' => $call->id,
                    'existing_count' => $existingCount,
                ]);
            }
        }

        Log::info('Vapi webhook: end-of-call report processed', [
            'request_id' => $requestId,
            'vapi_call_id' => $vapiCallId,
            'duration' => $duration,
        ]);

        return response()->json(['status' => 'ok']);
    }

    private function handleTranscript(array $payload, string $requestId): JsonResponse
    {
        $message = $payload['message'];
        $vapiCallId = $message['call']['id'] ?? null;

        Log::info('Vapi webhook transcript: params', [
            'request_id' => $requestId,
            'vapi_call_id' => $vapiCallId,
            'role' => $message['role'] ?? null,
            'transcript' => $message['transcript'] ?? null,
            'transcript_type' => $message['transcriptType'] ?? null,
            'timestamp' => $message['timestamp'] ?? null,
            'confidence' => $message['confidence'] ?? null,
        ]);

        if (! $vapiCallId) {
            Log::warning('Vapi webhook transcript: missing call ID', ['request_id' => $requestId]);

            return response()->json(['status' => 'error'], 400);
        }

        $call = Call::where('vapi_call_id', $vapiCallId)->first();

        if (! $call) {
            Log::warning('Vapi webhook transcript: call not found', [
                'request_id' => $requestId,
                'vapi_call_id' => $vapiCallId,
            ]);

            return response()->json(['status' => 'not_found'], 404);
        }

        $role = $message['role'] ?? 'assistant';
        $content = $message['transcript'] ?? '';
        $timestampMs = (int) (($message['timestamp'] ?? 0) * 1000);

        // Idempotency: skip duplicate transcript entries
        $exists = CallTranscript::where('call_id', $call->id)
            ->where('timestamp_ms', $timestampMs)
            ->where('content', $content)
            ->exists();

        if (! $exists) {
            $transcript = CallTranscript::create([
                'call_id' => $call->id,
                'speaker' => $role === 'assistant' ? CallSpeaker::Ai : CallSpeaker::Patient,
                'content' => $content,
                'timestamp_ms' => $timestampMs,
                'confidence' => $message['confidence'] ?? null,
            ]);

            Log::info('Vapi webhook transcript: line stored', [
                'request_id' => $requestId,
                'call_id' => $call->id,
                'transcript_id' => $transcript->id,
            ]);
        } else {
            Log::info('Vapi webhook transcript: duplicate skipped', [
                'request_id' => $requestId,
                'call_id' => $call->id,
                'timestamp_ms' => $timestampMs,
            ]);
        }

        return response()->json(['status' => 'ok']);
    }

    private function handleToolCalls(array $payload, string $requestId): JsonResponse
    {
        $message = $payload['message'];
        $vapiCallId = $message['call']['id'] ?? null;

        Log::info('Vapi webhook tool-calls: params', [
            'request_id' => $requestId,
            'vapi_call_id' => $vapiCallId,
            'chat_id' => $message['chat']['id'] ?? null,
            'assistant_id' => $message['assistant']['id'] ?? null,
            'tool_calls' => $message['toolCalls'] ?? $message['toolCallList'] ?? null,
            'call' => $message['call'] ?? null,
        ]);

        // Chat API calls have no call.id — use chat.id + assistant.id instead
        if (! $vapiCallId) {
            $chatId = $message['chat']['id'] ?? null;
            $assistantId = $message['assistant']['id'] ?? null;

            if (! $chatId || ! $assistantId) {
                Log::warning('Vapi webhook tool-calls: no call ID or chat ID', [
                    'request_id' => $requestId,
                    'keys' => array_keys($message),
                ]);

                return response()->json(['status' => 'error'], 400);
            }

            $aiConfig = AiConfiguration::where('vapi_assistant_id', $assistantId)->first();

            if (! $aiConfig) {
                Log::warning('Vapi webhook tool-calls: no AI config for assistant', [
                    'request_id' => $requestId,
                    'assistant_id' => $assistantId,
                ]);

                return response()->json(['status' => 'error', 'message' => 'Unknown assistant'], 400);
            }

            $call = Call::firstOrCreate(
                ['vapi_call_id' => $chatId],
                [
                    'clinic_id' => $aiConfig->clinic_id,
                    'direction' => CallDirection::Web,
                    'caller_phone' => 'unknown',
                    'status' => CallStatus::InProgress,
                    'started_at' => now(),
                    'ai_handled' => true,
                    'language' => $aiConfig->language ?? 'en',
                ],
            );

            $vapiCallId = $chatId;
        } else {
            $call = Call::where('vapi_call_id', $vapiCallId)->first();

            if (! $call) {
                $callData = $message['call'] ?? [];
                $clinic = $this->resolveClinicFromCall($callData);

                if ($clinic) {
                    $aiConfig = $clinic->aiConfiguration;
                    $directionMap = [
                        'inboundPhoneCall' => CallDirection::Inbound,
                        'outboundPhoneCall' => CallDirection::Outbound,
                        'webCall' => CallDirection::Web,
                    ];

                    $call = Call::create([
                        'vapi_call_id' => $vapiCallId,
                        'clinic_id' => $clinic->id,
                        'direction' => $directionMap[$callData['type'] ?? ''] ?? CallDirection::Inbound,
                        'caller_phone' => $callData['customer']['number'] ?? $callData['customer']['sipUri'] ?? 'unknown',
                        'caller_name' => $callData['customer']['name'] ?? null,
                        'status' => CallStatus::InProgress,
                        'started_at' => now(),
                        'ai_handled' => true,
                        'language' => $aiConfig->language ?? 'en',
                    ]);
                } else {
                    Log::warning('Vapi webhook tool-calls: call not found and clinic unresolved', [
                        'request_id' => $requestId,
                        'vapi_call_id' => $vapiCallId,
                    ]);

                    return response()->json(['status' => 'not_found'], 404);
                }
            }
        }

        $clinic = $call->clinic;

        // Quarantined calls have no clinic, so tools cannot be executed for them.
        if (! $clinic) {
            Log::warning('Vapi webhook tool-calls: call has no resolved clinic', [
                'request_id' => $requestId,
                'vapi_call_id' => $vapiCallId,
            ]);

            return response()->json(['status' => 'error', 'message' => 'Call is not linked to a clinic'], 422);
        }

        $dispatcher = app(VapiToolDispatcher::class);
        $toolCalls = $message['toolCalls'] ?? $message['toolCallList'] ?? [];
        $results = [];

        foreach ($toolCalls as $toolCall) {
            $toolName = $toolCall['function']['name'] ?? $toolCall['name'] ?? 'unknown';
            $arguments = $toolCall['function']['arguments'] ?? $toolCall['arguments'] ?? [];

            if (is_string($arguments)) {
                $arguments = json_decode($arguments, true) ?? [];
            }

            Log::info('Vapi webhook tool-calls: dispatching tool', [
                'request_id' => $requestId,
                'call_id' => $call->id,
                'vapi_call_id' => $vapiCallId,
                'tool_call_id' => $toolCall['id'] ?? null,
                'tool_name' => $toolName,
                'arguments' => $arguments,
            ]);

            $startTime = microtime(true);

            try {
                $response = $dispatcher->dispatch($clinic, $call, $toolName, $arguments);
                $durationMs = (int) ((microtime(true) - $startTime) * 1000);

                Log::info('Vapi webhook tool-calls: tool result', [
                    'request_id' => $requestId,
                    'call_id' => $call->id,
                    'tool_call_id' => $toolCall['id'] ?? null,
                    'tool_name' => $toolName,
                    'duration_ms' => $durationMs,
                    'success' => $response['success'] ?? null,
                    'result' => $response['result'] ?? null,
                    'data' => $response['data'] ?? null,
                    'next_action' => $response['next_action'] ?? null,
                ]);

                $validToolName = CallToolName::tryFrom($toolName);
                if ($validToolName) {
                    CallToolInvocation::create([
                        'call_id' => $call->id,
                        'tool_name' => $validToolName,
                        'input_payload' => $arguments,
                        'output_payload' => $response['data'] ?? [],
                        'duration_ms' => $durationMs,
                        'success' => $response['success'],
                        'error_message' => $response['success'] ? null : $response['result'],
                        'invoked_at' => now(),
                        'created_at' => now(),
                    ]);
                } else {
                    // NOTE: any tool name not present in the CallToolName enum
                    // is silently dropped from the audit trail. Confirm the
                    // enum covers every tool the assistant prompt can call:
                    // lookup_patient, create_patient_lead, check_schedule,
                    // check_appointment_types, assess_urgency, book_appointment,
                    // reschedule_appointment, cancel_appointment,
                    // verify_insurance, list_upcoming_appointments,
                    // create_callback_task, transfer_call, send_sms.
                    Log::warning('Vapi webhook tool-calls: tool name not in CallToolName enum, invocation not persisted', [
                        'request_id' => $requestId,
                        'call_id' => $call->id,
                        'tool_name' => $toolName,
                    ]);
                }

                $resultText = $response['result'];
                if (! empty($response['next_action'])) {
                    $resultText .= ' [NEXT ACTION: '.$response['next_action'].']';
                }

                $results[] = [
                    'toolCallId' => $toolCall['id'] ?? null,
                    'result' => $resultText,
                ];
            } catch (\Throwable $e) {
                $durationMs = (int) ((microtime(true) - $startTime) * 1000);

                Log::error('Vapi tool call failed', [
                    'request_id' => $requestId,
                    'call_id' => $call->id,
                    'tool_call_id' => $toolCall['id'] ?? null,
                    'tool' => $toolName,
                    'arguments' => $arguments,
                    'duration_ms' => $durationMs,
                    'error' => $e->getMessage(),
                    'exception' => get_class($e),
                    'trace' => $e->getTraceAsString(),
                ]);

                $validToolName = CallToolName::tryFrom($toolName);
                if ($validToolName) {
                    CallToolInvocation::create([
                        'call_id' => $call->id,
                        'tool_name' => $validToolName,
                        'input_payload' => $arguments,
                        'success' => false,
                        'error_message' => $e->getMessage(),
                        'invoked_at' => now(),
                        'created_at' => now(),
                    ]);
                }

                $results[] = [
                    'toolCallId' => $toolCall['id'] ?? null,
                    'result' => 'I encountered an issue processing that request. Let me try another way to help.',
                ];
            }
        }

        Log::info('Vapi webhook: tool calls processed', [
            'request_id' => $requestId,
            'vapi_call_id' => $vapiCallId,
            'count' => count($toolCalls),
            'results' => $results,
        ]);

        return response()->json(['results' => $results]);
    }

    private function handleAssistantRequest(array $payload, string $requestId): JsonResponse
    {
        $callData = $payload['message']['call'] ?? [];

        Log::info('Vapi webhook assistant-request: params', [
            'request_id' => $requestId,
            'call' => $callData,
        ]);

        $clinic = $this->resolveClinicFromCall($callData);

        if (! $clinic) {
            Log::error('Vapi webhook assistant-request: could not resolve clinic', [
                'request_id' => $requestId,
                'call' => $callData,
            ]);

            return response()->json(['status' => 'error', 'message' => 'Could not resolve clinic from call data'], 500);
        }

        $config = $clinic->aiConfiguration;

        if (! $config) {
            Log::warning('Vapi webhook assistant-request: no assistant configured', [
                'request_id' => $requestId,
                'clinic_id' => $clinic->id,
            ]);

            return response()->json(['status' => 'error', 'message' => 'No assistant configured'], 400);
        }

        // Enforce the plan's monthly call-minute limit at the inbound entry point.
        // Vapi plays the returned `error` string to the caller, so the limit is
        // enforced rather than merely displayed in the dashboard.
        if ($clinic->subscription && app(UsageService::class)->isMinutesLimitExceeded($clinic)) {
            Log::warning('Vapi webhook assistant-request: minutes limit exceeded', [
                'request_id' => $requestId,
                'clinic_id' => $clinic->id,
            ]);

            return response()->json([
                'error' => 'We are unable to take your call through our virtual assistant right now. Please try again later or hold for the next available staff member.',
            ]);
        }

        if ($config->workflow_mode === 'squad' && $config->vapi_squad_id) {
            Log::info('Vapi webhook assistant-request: resolved squad', [
                'request_id' => $requestId,
                'clinic_id' => $clinic->id,
                'squad_id' => $config->vapi_squad_id,
            ]);

            return response()->json([
                'squadId' => $config->vapi_squad_id,
            ]);
        }

        if (! $config->vapi_assistant_id) {
            Log::warning('Vapi webhook assistant-request: no assistant configured', [
                'request_id' => $requestId,
                'clinic_id' => $clinic->id,
            ]);

            return response()->json(['status' => 'error', 'message' => 'No assistant configured'], 400);
        }

        Log::info('Vapi webhook assistant-request: resolved assistant', [
            'request_id' => $requestId,
            'clinic_id' => $clinic->id,
            'assistant_id' => $config->vapi_assistant_id,
        ]);

        return response()->json([
            'assistantId' => $config->vapi_assistant_id,
        ]);
    }

    /**
     * Resolve the clinic that owns a call by cascading through every identifier
     * Vapi provides. The lookup no longer stops at the first non-null identifier:
     * a stale assistant ID previously prevented the phone-number fallback from
     * ever running. As a last resort the dialed number itself is matched against
     * provisioned clinic numbers.
     */
    private function resolveClinicFromCall(array $callData): ?Clinic
    {
        $assistantId = $callData['assistantId'] ?? null;
        $phoneNumberId = $callData['phoneNumber']['id'] ?? $callData['phoneNumberId'] ?? null;
        $squadId = $callData['squadId'] ?? null;
        $dialedNumber = $callData['phoneNumber']['number'] ?? null;

        $aiConfig = null;

        if ($assistantId !== null) {
            $aiConfig = AiConfiguration::where('vapi_assistant_id', $assistantId)->first();
        }

        if (! $aiConfig && $phoneNumberId !== null) {
            $aiConfig = AiConfiguration::where('vapi_phone_number_id', $phoneNumberId)->first();
        }

        if (! $aiConfig && $squadId !== null) {
            $aiConfig = AiConfiguration::where('vapi_squad_id', $squadId)->first();
        }

        if (! $aiConfig && $dialedNumber !== null) {
            $aiConfig = AiConfiguration::where('vapi_phone_number', $dialedNumber)->first();
        }

        Log::debug('Vapi webhook: clinic resolution attempt', [
            'assistant_id' => $assistantId,
            'phone_number_id' => $phoneNumberId,
            'squad_id' => $squadId,
            'dialed_number' => $dialedNumber,
            'resolved_clinic_id' => $aiConfig?->clinic_id,
        ]);

        return $aiConfig?->clinic;
    }
}
