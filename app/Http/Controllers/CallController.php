<?php

namespace App\Http\Controllers;

use App\Enums\CallDirection;
use App\Enums\CallStatus;
use App\Http\Requests\InitiateOutboundCallRequest;
use App\Models\Call;
use App\Models\Clinic;
use App\Models\Patient;
use App\Services\CallService;
use App\Services\FeatureGateService;
use App\Services\UsageService;
use App\Services\VapiService;
use Carbon\Carbon;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class CallController extends Controller
{
    public function index(): Response
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic) {
            return Inertia::render('CallCenter', [
                'activeCalls' => collect(),
                'callLog' => new LengthAwarePaginator([], 0, 20),
                'stats' => [
                    'activeCalls' => 0,
                    'callsToday' => 0,
                    'missedCalls' => 0,
                    'avgDurationSeconds' => 0,
                ],
            ]);
        }

        $activeCalls = Call::where('clinic_id', $clinic->id)
            ->whereIn('status', [CallStatus::InProgress, CallStatus::Ringing])
            ->with('patient')
            ->latest('started_at')
            ->get();

        $callLog = Call::where('clinic_id', $clinic->id)
            ->whereNotIn('status', [CallStatus::InProgress, CallStatus::Ringing])
            ->with('patient')
            ->latest('started_at')
            ->paginate(20)
            ->withQueryString();

        $todayStart = now()->startOfDay();
        $callsToday = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $todayStart)
            ->count();

        $missedToday = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $todayStart)
            ->where('status', CallStatus::Missed)
            ->count();

        $avgDuration = Call::where('clinic_id', $clinic->id)
            ->where('started_at', '>=', $todayStart)
            ->whereNotNull('duration_seconds')
            ->where('duration_seconds', '>', 0)
            ->avg('duration_seconds');

        return Inertia::render('CallCenter', [
            'activeCalls' => $activeCalls,
            'callLog' => $callLog,
            'stats' => [
                'activeCalls' => $activeCalls->count(),
                'callsToday' => $callsToday,
                'missedCalls' => $missedToday,
                'avgDurationSeconds' => $avgDuration ? round($avgDuration) : 0,
            ],
        ]);
    }

    public function store(InitiateOutboundCallRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;
        $aiConfig = $clinic->aiConfiguration;

        if (! $aiConfig || ! $aiConfig->vapi_assistant_id || ! $aiConfig->vapi_phone_number_id) {
            return back()->with('error', 'VAPI assistant and phone number must be configured in Settings before making outbound calls.');
        }

        if (app(UsageService::class)->isMinutesLimitExceeded($clinic)) {
            return back()->with('error', 'Your plan\'s monthly call minutes have been exceeded. Please upgrade your plan to continue making outbound calls.');
        }

        if (app(FeatureGateService::class)->isConcurrentLimitExceeded($clinic)) {
            return back()->with('error', 'Your plan\'s concurrent call limit has been reached. Please wait for active calls to end or upgrade your plan.');
        }

        $vapiService = app(VapiService::class);

        try {
            if ($request->input('mode') === 'single') {
                return $this->handleSingleCall($request, $clinic, $aiConfig, $vapiService);
            }

            return $this->handleBatchCalls($request, $clinic, $aiConfig, $vapiService);
        } catch (RequestException $e) {
            Log::error('Outbound call failed', ['error' => $e->getMessage()]);

            return back()->with('error', 'Failed to initiate call: '.($e->response?->json('message') ?? 'VAPI API error'));
        }
    }

    /**
     * Get full call detail — transcript, recording, and tool invocation log —
     * for the call-detail modal in Call Center.
     */
    public function show(Call $call,
        CallService $callService,
    ): JsonResponse {
        Log::info('CallController@show - START', [
            'call_id' => $call->id,
            'call_attributes' => $call->toArray(),
        ]);

        try {
            // ---------------------------------------------------------
            // 1. Get authenticated user
            // ---------------------------------------------------------
            $user = auth()->user();

            Log::info('CallController@show - Authenticated user', [
                'user_id' => $user?->id,
                'user_email' => $user?->email,
                'user_class' => $user ? get_class($user) : null,
                'is_authenticated' => auth()->check(),
            ]);

            // ---------------------------------------------------------
            // 2. Get user's clinic
            // ---------------------------------------------------------
            $clinic = $user?->clinic;

            Log::info('CallController@show - Clinic resolved', [
                'user_id' => $user?->id,
                'clinic_id' => $clinic?->id,
                'clinic_exists' => (bool) $clinic,
                'call_clinic_id' => $call->clinic_id,
            ]);

            // ---------------------------------------------------------
            // 3. Authorization check
            // ---------------------------------------------------------
            $clinicExists = (bool) $clinic;
            $clinicMatchesCall = $clinic && $call->clinic_id === $clinic->id;

            Log::info('CallController@show - Authorization check', [
                'clinic_exists' => $clinicExists,
                'clinic_matches_call' => $clinicMatchesCall,
                'user_clinic_id' => $clinic?->id,
                'call_clinic_id' => $call->clinic_id,
                'authorized' => $clinicExists && $clinicMatchesCall,
            ]);

            if (! $clinic || $call->clinic_id !== $clinic->id) {
                Log::warning('CallController@show - ACCESS DENIED', [
                    'user_id' => $user?->id,
                    'user_clinic_id' => $clinic?->id,
                    'call_id' => $call->id,
                    'call_clinic_id' => $call->clinic_id,
                ]);

                abort(403);
            }

            Log::info('CallController@show - ACCESS GRANTED', [
                'user_id' => $user?->id,
                'clinic_id' => $clinic->id,
                'call_id' => $call->id,
            ]);
            try {
                $recording = $call->recording;
                $freshUrl = $callService->refreshRecordingUrl($recording);
            } catch (Throwable $e) {
                Log::error('DownloadCallRecording::refreshRecordingUrl - EXCEPTION', [
                    'call_recording_id' => $recording->id,
                    'exception_class' => get_class($e),
                    'exception_message' => $e->getMessage(),
                    'exception_code' => $e->getCode(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
            // ---------------------------------------------------------
            // 4. Load relationships
            // ---------------------------------------------------------
            Log::info('CallController@show - Loading relationships', [
                'call_id' => $call->id,
                'relationships' => [
                    'patient',
                    'transcripts',
                    'recording',
                    'toolInvocations',
                ],
            ]);

            $call->load([
                'patient:id,first_name,last_name,phone',

                'transcripts' => fn ($query) => $query->orderBy('timestamp_ms'),

                'recording',

                'toolInvocations' => fn ($query) => $query->orderBy('created_at'),
            ]);

            // ---------------------------------------------------------
            // 5. Log loaded relationships
            // ---------------------------------------------------------
            Log::info('CallController@show - Relationships loaded', [
                'call_id' => $call->id,

                'patient_loaded' => $call->relationLoaded('patient'),
                'patient_id' => $call->patient?->id,

                'transcripts_loaded' => $call->relationLoaded('transcripts'),
                'transcripts_count' => $call->transcripts->count(),

                'recording_loaded' => $call->relationLoaded('recording'),
                'recording_id' => $call->recording?->id,

                'tool_invocations_loaded' => $call->relationLoaded('toolInvocations'),
                'tool_invocations_count' => $call->toolInvocations->count(),
            ]);

            // ---------------------------------------------------------
            // 6. Log transcript information
            // ---------------------------------------------------------
            Log::debug('CallController@show - Transcripts loaded', [
                'call_id' => $call->id,
                'transcripts' => $call->transcripts->map(fn ($t) => [
                    'id' => $t->id,
                    'speaker' => $t->speaker,
                    'timestamp_ms' => $t->timestamp_ms,
                    'content_length' => strlen($t->content ?? ''),
                ])->values()->toArray(),
            ]);

            // ---------------------------------------------------------
            // 7. Log recording information
            // ---------------------------------------------------------
            Log::debug('CallController@show - Recording loaded', [
                'call_id' => $call->id,
                'recording_exists' => (bool) $call->recording,
                'recording_id' => $call->recording?->id,
                'recording_duration_seconds' => $call->recording?->duration_seconds,
                'recording_format' => $call->recording?->format,
                'recording_is_redacted' => $call->recording?->is_redacted,
                'recording_url_exists' => ! empty($call->recording?->url),
            ]);

            // ---------------------------------------------------------
            // 8. Log tool invocations
            // ---------------------------------------------------------
            Log::debug('CallController@show - Tool invocations loaded', [
                'call_id' => $call->id,
                'tool_invocations' => $call->toolInvocations->map(fn ($t) => [
                    'id' => $t->id,
                    'tool_name' => $t->tool_name,
                    'success' => $t->success,
                    'duration_ms' => $t->duration_ms,
                    'has_error' => ! empty($t->error_message),
                    'created_at' => $t->created_at?->toISOString(),
                ])->values()->toArray(),
            ]);

            // ---------------------------------------------------------
            // 9. Build transcripts response
            // ---------------------------------------------------------
            $transcripts = $call->transcripts->map(fn ($t) => [
                'speaker' => $t->speaker,
                'content' => $t->content,
                'timestamp_ms' => $t->timestamp_ms,
            ])->values();

            Log::debug('CallController@show - Transcripts mapped', [
                'call_id' => $call->id,
                'count' => $transcripts->count(),
            ]);

            // ---------------------------------------------------------
            // 10. Build recording response
            // ---------------------------------------------------------
            $recording = $call->recording ? [
                'url' => $call->recording->file_url,
                'duration_seconds' => $call->recording->duration_seconds,
                'format' => $call->recording->format,
                'is_redacted' => $call->recording->is_redacted,
            ] : null;

            Log::debug('CallController@show - Recording mapped', [
                'call_id' => $call->id,
                'has_recording' => $recording !== null,
            ]);

            // ---------------------------------------------------------
            // 11. Build tool invocations response
            // ---------------------------------------------------------
            $toolInvocations = $call->toolInvocations->map(fn ($t) => [
                'tool_name' => $t->tool_name,
                'success' => $t->success,
                'duration_ms' => $t->duration_ms,
                'error_message' => $t->error_message,
                'created_at' => $t->created_at->toISOString(),
            ])->values();

            Log::debug('CallController@show - Tool invocations mapped', [
                'call_id' => $call->id,
                'count' => $toolInvocations->count(),
            ]);

            // ---------------------------------------------------------
            // 12. Build final response data
            // ---------------------------------------------------------
            $responseData = [
                'id' => $call->id,
                'direction' => $call->direction->value,
                'status' => $call->status->value,
                'caller_phone' => $call->caller_phone,
                'caller_name' => $call->caller_name,

                'patient' => $call->patient,

                'started_at' => $call->started_at?->toISOString(),
                'answered_at' => $call->answered_at?->toISOString(),
                'ended_at' => $call->ended_at?->toISOString(),

                'duration_seconds' => $call->duration_seconds,

                'ai_handled' => $call->ai_handled,
                'ai_confidence_score' => $call->ai_confidence_score,

                'sentiment' => $call->sentiment,
                'language' => $call->language,
                'resolution' => $call->resolution,
                'summary' => $call->summary,

                'transcripts' => $transcripts,

                'recording' => $recording,

                'tool_invocations' => $toolInvocations,
            ];

            // ---------------------------------------------------------
            // 13. Log final response summary
            // ---------------------------------------------------------
            Log::info('CallController@show - Response prepared', [
                'call_id' => $call->id,

                'direction' => $responseData['direction'],
                'status' => $responseData['status'],

                'caller_phone' => $responseData['caller_phone'],
                'caller_name' => $responseData['caller_name'],

                'patient_id' => $call->patient?->id,

                'started_at' => $responseData['started_at'],
                'answered_at' => $responseData['answered_at'],
                'ended_at' => $responseData['ended_at'],

                'duration_seconds' => $responseData['duration_seconds'],

                'ai_handled' => $responseData['ai_handled'],
                'ai_confidence_score' => $responseData['ai_confidence_score'],

                'sentiment' => $responseData['sentiment'],
                'language' => $responseData['language'],
                'resolution' => $responseData['resolution'],

                'has_summary' => ! empty($responseData['summary']),
                'summary_length' => strlen($responseData['summary'] ?? ''),

                'transcripts_count' => $transcripts->count(),
                'has_recording' => $recording !== null,
                'tool_invocations_count' => $toolInvocations->count(),
            ]);

            // ---------------------------------------------------------
            // 14. Return response
            // ---------------------------------------------------------
            $response = response()->json($responseData);

            Log::info('CallController@show - END', [
                'call_id' => $call->id,
                'http_status' => $response->getStatusCode(),
            ]);

            return $response;

        } catch (\Throwable $e) {

            // ---------------------------------------------------------
            // 15. Log any exception
            // ---------------------------------------------------------
            Log::error('CallController@show - EXCEPTION', [
                'call_id' => $call->id ?? null,

                'user_id' => auth()->id(),

                'exception_class' => get_class($e),
                'exception_message' => $e->getMessage(),
                'exception_code' => $e->getCode(),

                'file' => $e->getFile(),
                'line' => $e->getLine(),

                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Get live call status from VAPI for a specific call.
     */
    public function callStatus(Call $call): JsonResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $call->clinic_id !== $clinic->id) {
            abort(403);
        }

        // If call already ended locally, return local data without hitting VAPI
        if (in_array($call->status, [CallStatus::Completed, CallStatus::Failed, CallStatus::Missed, CallStatus::Ended])) {
            return response()->json([
                'id' => $call->id,
                'status' => $call->status->value,
                'duration_seconds' => $call->duration_seconds,
                'ended_at' => $call->ended_at?->toISOString(),
                'end_reason' => $call->end_reason,
            ]);
        }

        // Fetch live status from VAPI
        if ($call->vapi_call_id) {
            try {
                $vapiService = app(VapiService::class);
                $vapiCall = $vapiService->getCall($call->vapi_call_id);

                $newStatus = $this->mapVapiStatus($vapiCall['status'] ?? 'queued');

                $updates = ['status' => $newStatus];

                if (! empty($vapiCall['endedAt'])) {
                    $updates['ended_at'] = $vapiCall['endedAt'];
                }
                if (! empty($vapiCall['endedReason'])) {
                    $updates['end_reason'] = $vapiCall['endedReason'];
                }
                if (isset($vapiCall['costBreakdown']['total'])) {
                    $updates['cost'] = $vapiCall['costBreakdown']['total'];
                }

                // Calculate duration if call has started and ended
                if (! empty($vapiCall['startedAt']) && ! empty($vapiCall['endedAt'])) {
                    $start = Carbon::parse($vapiCall['startedAt']);
                    $end = Carbon::parse($vapiCall['endedAt']);
                    $updates['duration_seconds'] = (int) $start->diffInSeconds($end);
                }

                $call->update($updates);

                return response()->json([
                    'id' => $call->id,
                    'status' => $newStatus->value,
                    'duration_seconds' => $updates['duration_seconds'] ?? $call->duration_seconds,
                    'ended_at' => $updates['ended_at'] ?? $call->ended_at?->toISOString(),
                    'end_reason' => $updates['end_reason'] ?? $call->end_reason,
                    'transcript' => $vapiCall['transcript'] ?? null,
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to fetch VAPI call status', [
                    'call_id' => $call->id,
                    'vapi_call_id' => $call->vapi_call_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Fallback: return local data
        return response()->json([
            'id' => $call->id,
            'status' => $call->status->value,
            'duration_seconds' => $call->duration_seconds,
            'ended_at' => $call->ended_at?->toISOString(),
            'end_reason' => $call->end_reason,
        ]);
    }

    private function handleSingleCall(
        InitiateOutboundCallRequest $request,
        Clinic $clinic,
        mixed $aiConfig,
        VapiService $vapiService,
    ): RedirectResponse {
        $phoneNumber = $request->input('phone_number');
        $name = $request->input('name');

        $customer = ['number' => $phoneNumber];
        if ($name) {
            $customer['name'] = $name;
        }

        $vapiResponse = $vapiService->createOutboundCall(
            $aiConfig->vapi_assistant_id,
            $aiConfig->vapi_phone_number_id,
            $customer,
        );

        $patient = Patient::where('clinic_id', $clinic->id)
            ->where('phone', $phoneNumber)
            ->first();

        $call = Call::create([
            'clinic_id' => $clinic->id,
            'vapi_call_id' => $vapiResponse['id'],
            'direction' => CallDirection::Outbound,
            'caller_phone' => $phoneNumber,
            'caller_name' => $name ?? $patient?->full_name,
            'patient_id' => $patient?->id,
            'status' => CallStatus::Queued,
            'started_at' => now(),
            'ai_handled' => true,
            'language' => $aiConfig->language ?? 'en',
        ]);

        return back()
            ->with('success', 'Outbound call initiated to '.$phoneNumber)
            ->with('outbound_calls', [[
                'id' => $call->id,
                'phone' => $phoneNumber,
                'name' => $call->caller_name,
                'status' => 'queued',
            ]]);
    }

    private function handleBatchCalls(
        InitiateOutboundCallRequest $request,
        Clinic $clinic,
        mixed $aiConfig,
        VapiService $vapiService,
    ): RedirectResponse {
        $phoneNumbers = $request->input('phone_numbers');
        $customers = array_map(fn (string $number) => ['number' => $number], $phoneNumbers);

        $vapiResponse = $vapiService->createBatchOutboundCalls(
            $aiConfig->vapi_assistant_id,
            $aiConfig->vapi_phone_number_id,
            $customers,
        );

        $patients = Patient::where('clinic_id', $clinic->id)
            ->whereIn('phone', $phoneNumbers)
            ->get()
            ->keyBy('phone');

        // VAPI batch may return array of calls or a single batch object
        $callResults = isset($vapiResponse[0]) ? $vapiResponse : [$vapiResponse];

        $outboundCalls = [];

        foreach ($phoneNumbers as $index => $number) {
            $patient = $patients->get($number);

            $call = Call::create([
                'clinic_id' => $clinic->id,
                'vapi_call_id' => $callResults[$index]['id'] ?? null,
                'direction' => CallDirection::Outbound,
                'caller_phone' => $number,
                'caller_name' => $patient?->full_name,
                'patient_id' => $patient?->id,
                'status' => CallStatus::Queued,
                'started_at' => now(),
                'ai_handled' => true,
                'language' => $aiConfig->language ?? 'en',
            ]);

            $outboundCalls[] = [
                'id' => $call->id,
                'phone' => $number,
                'name' => $call->caller_name,
                'status' => 'queued',
            ];
        }

        $count = count($phoneNumbers);

        return back()
            ->with('success', "Initiated {$count} outbound call(s).")
            ->with('outbound_calls', $outboundCalls);
    }

    private function mapVapiStatus(string $vapiStatus): CallStatus
    {
        return match ($vapiStatus) {
            'queued' => CallStatus::Queued,
            'ringing' => CallStatus::Ringing,
            'in-progress' => CallStatus::InProgress,
            'forwarding' => CallStatus::Transferred,
            'ended' => CallStatus::Ended,
            default => CallStatus::Queued,
        };
    }
}
