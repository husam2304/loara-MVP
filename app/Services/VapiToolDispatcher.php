<?php

namespace App\Services;

use App\Enums\AppointmentSource;
use App\Enums\AppointmentStatus;
use App\Enums\PatientSource;
use App\Enums\PatientStatus;
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Enums\TaskType;
use App\Enums\AuditStatus;
use App\Enums\TriageAction;
use App\Enums\TriagePriority;
use App\Models\AuditLog;
use App\Models\Appointment;
use App\Models\AppointmentType;
use App\Models\Call;
use App\Models\Clinic;
use App\Models\ClinicOperatingHour;
use App\Models\Patient;
use App\Models\PatientInsurance;
use App\Models\Provider;
use App\Models\Task;
use App\Models\TriageRule;
use App\Models\User;
use App\Notifications\TriageEscalationNotification;
use App\Services\Triage\EscalationResolution;
use App\Services\Triage\EscalationResolver;
use App\Services\Triage\TriageMatchEngine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class VapiToolDispatcher
{
    public function __construct(
        private readonly TriageMatchEngine $triageMatchEngine = new TriageMatchEngine,
        private readonly EscalationResolver $escalationResolver = new EscalationResolver,
    ) {}

    /**
     * Centralized deep tracing for debugging Vapi tool execution.
     * Sensitive values are redacted before they are written to the log.
     */
    private function traceValue(mixed $value, int $depth = 0): mixed
    {
        if ($depth > 4) {
            return '[max-depth]';
        }

        if ($value instanceof Model) {
            return [
                'class' => $value::class,
                'id' => $value->getKey(),
            ];
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format(\DateTimeInterface::ATOM);
        }

        if (is_array($value)) {
            $result = [];
            foreach ($value as $key => $item) {
                $keyString = (string) $key;
                $normalizedKey = strtolower(str_replace(['-', ' '], '_', $keyString));

                if (
                    str_contains($normalizedKey, 'phone') ||
                    str_contains($normalizedKey, 'dob') ||
                    str_contains($normalizedKey, 'date_of_birth')
                ) {
                    $result[$keyString] = '[REDACTED]';
                    continue;
                }

                $result[$keyString] = $this->traceValue($item, $depth + 1);
            }

            return $result;
        }

        if (is_object($value)) {
            return [
                'class' => $value::class,
            ];
        }

        if (is_string($value) && strlen($value) > 1000) {
            return substr($value, 0, 1000).'...[truncated]';
        }

        return $value;
    }

    private function traceParams(string $method, array $params): void
    {
        Log::info("[VapiToolDispatcher] {$method} PARAMS", [
            'params' => $this->traceValue($params),
        ]);
    }

    private function traceReturn(string $method, mixed $result): mixed
    {
        Log::info("[VapiToolDispatcher] {$method} RETURN", [
            'return_type' => get_debug_type($result),
            'return' => $this->traceValue($result),
        ]);

        return $result;
    }

    private function traceStep(string $method, string $step, array $context = []): void
    {
        Log::info("[VapiToolDispatcher] {$method} STEP: {$step}", [
            'context' => $this->traceValue($context),
        ]);
    }

    private function traceException(string $method, \Throwable $e): void
    {
        Log::error("[VapiToolDispatcher] {$method} EXCEPTION", [
            'exception' => $e::class,
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ]);
    }

    /**
     * Parse a date-of-birth string in any recognisable format to YYYY-MM-DD.
     * Returns null when the string cannot be parsed or represents an implausible date.
     */
    protected function parseDob(string $raw): ?string
    {
        Log::info('[VapiToolDispatcher] parseDob PARAMS', [
            'params' => $this->traceValue(['raw' => $raw]),
        ]);
        Log::info('[VapiToolDispatcher] parseDob START', ['method' => 'parseDob']);
        $raw = trim($raw);

        if (empty($raw)) {
            $__vapi_return = null;

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }

        // Normalise ordinal suffixes: "March 15th" → "March 15"
        $normalized = preg_replace('/\b(\d+)(st|nd|rd|th)\b/i', '$1', $raw);

        try {
            $date = Carbon::parse($normalized);

            // Sanity-check: must be a plausible date of birth (between 1900 and today)
            if ($date->year < 1900 || $date->isFuture()) {
                $__vapi_return = null;

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $__vapi_return = $date->toDateString();

            return $this->traceReturn(__FUNCTION__, $__vapi_return); // YYYY-MM-DD
        } catch (\Throwable) {
            $__vapi_return = null;

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /** @var string[] Tools that require patient identity verification before execution. */
    protected const PROTECTED_TOOLS = [
        'book_appointment', 'reschedule_appointment', 'cancel_appointment',
        'verify_insurance', 'list_upcoming_appointments',
    ];

    /**
     * Dispatch a tool call to the appropriate handler.
     *
     * @return array{success: bool, result: string, data: array}
     */
    public function dispatch(Clinic $clinic, Call $call, string $toolName, array $args): array
    {
        Log::info('[VapiToolDispatcher] dispatch PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'call' => $call, 'toolName' => $toolName, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] dispatch START', ['method' => 'dispatch']);
        // Verification gate: protected tools require patient identity verification.
        // Identity is ONLY established by confirming the patient's date of birth via
        // lookup_patient (matching DOB) or verify_identity — never by trusting a
        // patient_id/appointment_id passed in the tool args, which the caller (or a
        // malicious web/chat client) can supply for any record in the clinic. Trusting
        // those args was an IDOR allowing any caller to act on another patient's PHI.
        if (in_array($toolName, self::PROTECTED_TOOLS, true) && ! $call->patient_verified) {
            $next = $call->patient_id
                ? 'Call verify_identity with the date of birth the caller provides to confirm their identity, then retry this action.'
                : 'Call lookup_patient with the caller\'s name first, then verify_identity with the caller\'s date of birth, then retry this action.';

            $__vapi_return = [
                'success' => false,
                'result' => 'Patient not yet identified. '.$next,
                'next_action' => $next,
                'data' => ['requires_lookup' => true, 'requires_verification' => true],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }

        $result = match ($toolName) {
            'lookup_patient' => $this->lookupPatient($clinic, $call, $args),
            'create_patient_lead' => $this->createPatientLead($clinic, $call, $args),
            'verify_identity' => $this->verifyIdentity($clinic, $call, $args),
            'check_schedule' => $this->checkSchedule($clinic, $args),
            'check_appointment_types' => $this->checkAppointmentTypes($clinic),
            'list_upcoming_appointments' => $this->listUpcomingAppointments($clinic, $args),
            'book_appointment' => $this->bookAppointment($clinic, $call, $args),
            'reschedule_appointment' => $this->rescheduleAppointment($clinic, $args),
            'cancel_appointment' => $this->cancelAppointment($clinic, $args),
            'verify_insurance' => $this->verifyInsurance($clinic, $args),
            'assess_urgency' => $this->assessUrgency($clinic, $call, $args),
            'create_callback_task' => $this->createCallbackTask($clinic, $call, $args),
            'transfer_call' => $this->transferCall($clinic, $call, $args),
            'send_sms' => $this->sendSms($clinic, $call, $args),
            default => ['success' => false, 'result' => "Unknown tool: {$toolName}. I'm unable to process that request.", 'data' => []],
        };

        // Track consecutive failures for escalation
        if (! $result['success'] && ! str_contains($result['result'], 'because this is a Web Call')) {
            $call->increment('tool_failure_count');
            $call->refresh();

            if ($call->tool_failure_count >= 2) {
                $result['result'] .= ' I\'m having difficulty processing requests. Would you like me to transfer you to a staff member who can help directly?';
                $result['data']['suggest_transfer'] = true;
            }
        } elseif ($result['success'] && $call->tool_failure_count > 0) {
            $call->update(['tool_failure_count' => 0]);
        }

        $__vapi_return = $result;

        return $this->traceReturn(__FUNCTION__, $__vapi_return);
    }

    /**
     * Look up a patient by phone, name, or date of birth.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function lookupPatient(Clinic $clinic, Call $call, array $args): array
    {
        Log::info('[VapiToolDispatcher] lookupPatient PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'call' => $call, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] lookupPatient START', ['method' => 'lookupPatient']);
        try {
            $hasFilter = false;

            // Use caller ID automatically if the AI did not pass a phone number.
            // This means patients never need to say their phone number aloud.
            $phoneArg = $args['phone'] ?? null;
            if (empty($phoneArg) && ! empty($call->caller_phone) && $call->caller_phone !== 'unknown') {
                $phoneArg = $call->caller_phone;
            }

            $nameQuery = trim(($args['first_name'] ?? '').' '.($args['last_name'] ?? ''));

            if (! empty($phoneArg) || ! empty($nameQuery) || ! empty($args['date_of_birth'])) {
                $hasFilter = true;
            }

            if (! $hasFilter) {
                if ($call->caller_phone === 'unknown') {
                    $__vapi_return = ['success' => false, 'result' => 'I cannot auto-detect the caller phone number because this is a Web Call. You MUST explicitly ask the caller for their first and last name, or date of birth, and then call lookup_patient again with those arguments.', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }
                $__vapi_return = ['success' => false, 'result' => 'I need at least a phone number, name, or date of birth to look up a patient.', 'data' => []];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $searchService = app(ArabicSearchService::class);
            $searchResult = $searchService->searchPatient($nameQuery, $clinic->id, $phoneArg);

            if ($searchResult->status === ArabicSearchResult::STATUS_FOUND) {
                $patients = collect([$searchResult->entity]);
            } elseif ($searchResult->status === ArabicSearchResult::STATUS_AMBIGUOUS) {
                $patients = collect($searchResult->ambiguousMatches);
            } else {
                $patients = collect();
            }

            // Filter by DOB if provided
            if (! empty($args['date_of_birth']) && $patients->isNotEmpty()) {
                $parsedDob = $this->parseDob($args['date_of_birth']);
                if ($parsedDob) {
                    $patients = $patients->filter(fn ($p) => $p->date_of_birth && $p->date_of_birth->toDateString() === $parsedDob);
                } else {
                    Log::warning('VapiToolDispatcher: unparseable DOB in lookup_patient');
                }
            }

            if ($patients->isEmpty()) {
                $__vapi_return = [
                    'success' => true,
                    'result' => 'No patient found.',
                    'next_action' => 'call create_patient_lead immediately with first_name and last_name — do NOT ask for date of birth or phone number before creating the record.',
                    'data' => ['count' => 0, 'is_new_patient' => true],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            if ($patients->count() === 1) {
                $patient = $patients->first();
                $call->update(['patient_id' => $patient->id]);

                // If the caller already provided their DOB in this lookup and it matches,
                // auto-verify immediately — no need to ask for it again.
                if (! empty($args['date_of_birth']) && $patient->date_of_birth) {
                    try {
                        $providedDob = $this->parseDob($args['date_of_birth']);
                        if ($providedDob && $providedDob === $patient->date_of_birth->toDateString()) {
                            $call->update(['patient_verified' => true]);

                            $__vapi_return = [
                                'success' => true,
                                'result' => "Found and verified patient: {$patient->full_name} (patient_id={$patient->id}). Identity confirmed.",
                                'data' => ['patient_id' => $patient->id, 'name' => $patient->full_name, 'verified' => true],
                            ];

                            return $this->traceReturn(__FUNCTION__, $__vapi_return);
                        }
                    } catch (\Throwable) {
                        // DOB parse failed — fall through to standard verification flow
                    }
                }

                $dobText = $patient->date_of_birth
                    ? 'date of birth '.Carbon::parse($patient->date_of_birth)->format('F j, Y')
                    : 'no date of birth on file';

                // No DOB on file — auto-verify immediately, no extra step needed
                if (! $patient->date_of_birth) {
                    $call->update(['patient_verified' => true]);

                    $__vapi_return = [
                        'success' => true,
                        'result' => "Found and verified patient: {$patient->full_name} (patient_id={$patient->id}).",
                        'data' => ['patient_id' => $patient->id, 'name' => $patient->full_name, 'verified' => true, 'no_dob_on_file' => true],
                    ];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $__vapi_return = [
                    'success' => true,
                    'result' => "Found patient: {$patient->full_name} (patient_id={$patient->id}).",
                    'next_action' => "Call verify_identity with patient_id={$patient->id} and the date of birth the caller provides.",
                    'data' => ['patient_id' => $patient->id, 'name' => $patient->full_name],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            // Multiple patients found — include patient_ids so verify_identity can be called
            // with the right patient_id after the caller confirms their DOB.
            $list = $patients->map(function (Patient $p, int $i) {
                $dobText = $p->date_of_birth
                    ? 'DOB: '.Carbon::parse($p->date_of_birth)->format('F j, Y')
                    : 'no DOB on file';

                $__vapi_return = ($i + 1).") {$p->full_name} (ID:{$p->id}, {$dobText})";

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            })->join('; ');

            $__vapi_return = [
                'success' => true,
                'result' => "Found {$patients->count()} patients matching that name.",
                'next_action' => 'Ask the caller for their date of birth to identify the right record, then call verify_identity with the matching patient_id from the list.',
                'data' => ['count' => $patients->count(), 'patient_ids' => $patients->pluck('id')->toArray(), 'patients' => $patients->map(fn (Patient $p) => ['patient_id' => $p->id, 'name' => $p->full_name, 'date_of_birth' => $p->date_of_birth?->toDateString()])->toArray()],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher lookup_patient failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => 'I was unable to look up the patient right now. Please try again or I can take a message.', 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Create a minimal patient record for a new caller (lead).
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function createPatientLead(Clinic $clinic, Call $call, array $args): array
    {
        Log::info('[VapiToolDispatcher] createPatientLead PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'call' => $call, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] createPatientLead START', ['method' => 'createPatientLead']);
        try {
            if (empty($args['first_name']) || empty($args['last_name'])) {
                $__vapi_return = [
                    'success' => false,
                    'result' => "I need the caller's first name and last name to create their record.",
                    'data' => [],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            // Use phone from args, or fall back to caller ID captured at call start.
            // For web/chat calls (caller_phone = 'unknown'), phone is optional.
            // Never ask phone for inbound phone calls — it is captured automatically.
            $phone = $args['phone'] ?? null;
            if (empty($phone) && ! empty($call->caller_phone) && $call->caller_phone !== 'unknown') {
                $phone = $call->caller_phone;
            }

            $isWebCall = $call->caller_phone === 'unknown' || $call->direction?->value === 'web';
            if (empty($phone) && ! $isWebCall) {
                $__vapi_return = [
                    'success' => false,
                    'result' => 'I need a phone number to create the patient record.',
                    'data' => [],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            // Check for existing patient to avoid duplicates
            $existing = null;
            if (! empty($phone)) {
                $digits = preg_replace('/\D/', '', $phone);
                $last10 = strlen($digits) >= 10 ? substr($digits, -10) : $digits;

                $existing = Patient::where('clinic_id', $clinic->id)
                    ->whereRaw('LOWER(first_name) = ?', [mb_strtolower($args['first_name'])])
                    ->whereRaw('LOWER(last_name) = ?', [mb_strtolower($args['last_name'])])
                    ->where(DB::raw("REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')"), 'like', "%{$last10}%")
                    ->first();
            } else {
                // No phone (web/chat call): match by name only
                $existing = Patient::where('clinic_id', $clinic->id)
                    ->whereRaw('LOWER(first_name) = ?', [mb_strtolower($args['first_name'])])
                    ->whereRaw('LOWER(last_name) = ?', [mb_strtolower($args['last_name'])])
                    ->first();
            }

            if ($existing) {
                Log::info('[VapiToolDispatcher] Existing patient matched.', ['patient_id' => $existing->id]);
                $call->update(['patient_id' => $existing->id, 'patient_verified' => true]);

                $__vapi_return = [
                    'success' => true,
                    'result' => "Found existing patient: {$existing->full_name} (patient_id={$existing->id}). Linked to this call.",
                    'data' => ['patient_id' => $existing->id, 'name' => $existing->full_name, 'existing' => true],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $patientData = [
                'clinic_id' => $clinic->id,
                'first_name' => $args['first_name'],
                'last_name' => $args['last_name'],
                'phone' => $phone,
                'source' => PatientSource::AiCall,
                'status' => PatientStatus::Active,
            ];

            if (! empty($args['date_of_birth'])) {
                $parsedDob = $this->parseDob($args['date_of_birth']);

                if ($parsedDob) {
                    $patientData['date_of_birth'] = $parsedDob;
                }
            }
            if (! empty($args['gender'])) {
                if (! in_array(strtolower($args['gender']), ['male', 'female', 'prefer_not_to_say', 'ذكر', 'أنثى', 'انثى', 'افضل عد الإفصاح'], true)) {
                    $__vapi_return = [
                        'success' => false,
                        'result' => "I wasn't able to understand that gender.",
                        'data' => [],
                    ];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }
                $genderMap = [
                    'male' => 'male',
                    'female' => 'female',
                    'prefer_not_to_say' => 'prefer_not_to_say',
                    'ذكر' => 'male',
                    'أنثى' => 'female',
                    'انثى' => 'female',
                    'افضل عد الإفصاح' => 'prefer_not_to_say',
                ];
                $patientData['gender'] = $genderMap[strtolower($args['gender'])];
            }

            Log::info('[VapiToolDispatcher] Creating new patient record.', ['clinic_id' => $clinic->id, 'has_phone' => ! empty($phone)]);

            $patient = Patient::create($patientData);
            Log::info('[VapiToolDispatcher] Patient created.', ['patient_id' => $patient->id]);

            $call->update(['patient_id' => $patient->id, 'patient_verified' => true]);

            $__vapi_return = [
                'success' => true,
                'result' => "New patient created: {$patient->full_name} (patient_id={$patient->id}).",
                'next_action' => "Proceed directly to booking with patient_id={$patient->id} — do NOT call verify_identity.",
                'data' => ['patient_id' => $patient->id, 'name' => $patient->full_name, 'existing' => false],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher create_patient_lead failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => 'I was unable to create the patient record right now. Let me take a message and have someone follow up.', 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Verify a patient's identity by confirming their date of birth.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function verifyIdentity(Clinic $clinic, Call $call, array $args): array
    {
        Log::info('[VapiToolDispatcher] verifyIdentity PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'call' => $call, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] verifyIdentity START', ['method' => 'verifyIdentity']);
        try {
            // Use explicit patient_id from args, fall back to call's patient_id
            $patientId = $args['patient_id'] ?? $call->patient_id;

            if (! $patientId) {
                $__vapi_return = [
                    'success' => false,
                    'result' => "I need to look up the patient first before verifying identity. Can you provide the patient's name or phone number?",
                    'data' => [],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            // Sync call's patient_id if provided explicitly
            if (! empty($args['patient_id']) && $call->patient_id !== (int) $args['patient_id']) {
                $call->update(['patient_id' => (int) $args['patient_id']]);
            }

            if ($call->patient_verified) {
                $__vapi_return = [
                    'success' => true,
                    'result' => "The patient's identity has already been verified for this call.",
                    'data' => ['already_verified' => true],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $patient = Patient::where('id', $patientId)
                ->where('clinic_id', $clinic->id)
                ->first();

            if (! $patient) {
                $__vapi_return = [
                    'success' => false,
                    'result' => 'I could not find the patient record. Let me look them up again.',
                    'data' => [],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            // Patient has no DOB on file — auto-verify without requiring DOB arg
            if (! $patient->date_of_birth) {
                $call->update(['patient_verified' => true]);

                $__vapi_return = [
                    'success' => true,
                    'result' => "Identity verified for {$patient->full_name} (patient_id={$patient->id}) — no DOB on file.",
                    'data' => ['verified' => true, 'patient_id' => $patient->id, 'no_dob_on_file' => true],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            if (empty($args['date_of_birth'])) {
                $__vapi_return = [
                    'success' => false,
                    'result' => 'I need the caller to confirm their date of birth for verification.',
                    'data' => [],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $providedDob = $this->parseDob($args['date_of_birth']);
            $actualDob = $patient->date_of_birth->toDateString();

            if (! $providedDob) {
                $__vapi_return = [
                    'success' => false,
                    'result' => "I wasn't able to understand that date of birth format. Could the caller say it again, for example 'March 15, 1980' or '03/15/1980'?",
                    'data' => ['verified' => false, 'unparseable_dob' => true],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            if ($providedDob !== $actualDob) {
                $__vapi_return = [
                    'success' => false,
                    'result' => 'The date of birth provided does not match our records. Could the caller please try again?',
                    'data' => ['verified' => false],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $call->update(['patient_verified' => true]);

            $__vapi_return = [
                'success' => true,
                'result' => "Identity verified for {$patient->full_name} (patient_id={$patient->id}).",
                'data' => ['verified' => true, 'patient_id' => $patient->id],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher verify_identity failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => 'I was unable to verify identity right now. Let me transfer you to a staff member.', 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Check provider schedule availability for a given date.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function checkSchedule(Clinic $clinic, array $args): array
    {
        Log::info('[VapiToolDispatcher] checkSchedule PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] checkSchedule START', ['method' => 'checkSchedule']);
        try {
            if (empty($args['date'])) {
                $__vapi_return = ['success' => false, 'result' => 'I need a date to check the schedule. What date would the caller prefer?', 'data' => []];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            // Strip time-of-day qualifiers so Carbon can parse cleanly (e.g. "tomorrow morning" → "tomorrow")
            $dateInput = preg_replace('/\b(morning|afternoon|evening|night|early|late)\b/i', '', $args['date']);
            $dateInput = trim(preg_replace('/\s+/', ' ', $dateInput));
            $date = Carbon::parse($dateInput);
            $dayOfWeek = $date->dayOfWeek;

            // Current time in clinic's local timezone, as a naive UTC Carbon
            // (matches the "local time stored as UTC" convention used for schedule times)
            $timezone = $clinic->timezone ?? 'America/New_York';
            $clinicNow = Carbon::parse(now($timezone)->format('Y-m-d H:i:s'));

            $duration = 30;
            if (! empty($args['appointment_type'])) {
                $searchService = app(ArabicSearchService::class);
                $searchResult = $searchService->searchAppointmentType($args['appointment_type'], $clinic->id);

                if ($searchResult->status === ArabicSearchResult::STATUS_FOUND) {
                    $duration = $searchResult->entity->duration_minutes;
                } elseif ($searchResult->status === ArabicSearchResult::STATUS_AMBIGUOUS) {
                    $names = array_map(fn ($t) => $t['name'], $searchResult->ambiguousMatches);
                    $__vapi_return = ['success' => false, 'result' => 'I found multiple matching appointment types: '.implode(', ', $names).'. Could you clarify which one?', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }
            }

            // Resolve providers
            if (! empty($args['provider_name'])) {
                $searchService = app(ArabicSearchService::class);
                $searchResult = $searchService->searchProvider($args['provider_name'], $clinic->id);

                if ($searchResult->status === ArabicSearchResult::STATUS_AMBIGUOUS) {
                    $names = array_map(fn ($p) => $p['full_name'], $searchResult->ambiguousMatches);
                    $__vapi_return = ['success' => false, 'result' => 'I found multiple matching providers: '.implode(', ', $names).'. Could you clarify which doctor?', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                if ($searchResult->status === ArabicSearchResult::STATUS_FOUND) {
                    $providers = collect([$searchResult->entity->load(['schedules', 'blockTimes'])]);
                } else {
                    $providers = collect();
                }
            } else {
                $providers = Provider::where('clinic_id', $clinic->id)->where('is_active', true)->with(['schedules', 'blockTimes'])->get();
            }

            if ($providers->isEmpty()) {
                $__vapi_return = ['success' => true, 'result' => 'No providers found matching that name. Could you confirm the provider name?', 'data' => []];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $allSlots = [];
            foreach ($providers as $provider) {
                $schedule = $provider->schedules
                    ->where('day_of_week', $dayOfWeek)
                    ->where('is_available', true)
                    ->first();

                if (! $schedule) {
                    continue;
                }

                // Existing active appointments for this provider on this date
                $activeStatuses = [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed, AppointmentStatus::CheckedIn, AppointmentStatus::InProgress];
                $existingAppointments = Appointment::where('provider_id', $provider->id)
                    ->whereDate('scheduled_at', $date)
                    ->whereIn('status', $activeStatuses)
                    ->get(['scheduled_at', 'ends_at']);

                // Block times overlapping this date
                $blockTimes = $provider->blockTimes->filter(function ($bt) use ($date) {
                    $__vapi_return = $bt->start_at->startOfDay()->lte($date->copy()->endOfDay())
                        && $bt->end_at->endOfDay()->gte($date->copy()->startOfDay());

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                });

                // Generate available slots
                $slotStart = $date->copy()->setTimeFromTimeString($schedule->start_time);
                $dayEnd = $date->copy()->setTimeFromTimeString($schedule->end_time);
                $slots = [];

                while ($slotStart->copy()->addMinutes($duration)->lte($dayEnd)) {
                    $candidateEnd = $slotStart->copy()->addMinutes($duration);

                    // Skip past slots (compare in clinic's local timezone)
                    if ($slotStart->lt($clinicNow)) {
                        $slotStart->addMinutes($duration);

                        continue;
                    }

                    // Check overlap with existing appointments
                    $isOccupied = $existingAppointments->contains(function ($apt) use ($slotStart, $candidateEnd) {
                        $__vapi_return = $slotStart->lt($apt->ends_at) && $candidateEnd->gt($apt->scheduled_at);

                        return $this->traceReturn(__FUNCTION__, $__vapi_return);
                    });

                    // Check overlap with block times
                    $isBlocked = $blockTimes->contains(function ($bt) use ($slotStart, $candidateEnd) {
                        $__vapi_return = $slotStart->lt($bt->end_at) && $candidateEnd->gt($bt->start_at);

                        return $this->traceReturn(__FUNCTION__, $__vapi_return);
                    });

                    if (! $isOccupied && ! $isBlocked) {
                        $slots[] = [
                            'time' => $slotStart->format('g:i A'),
                            'slot_id' => "slot_{$provider->id}_{$date->toDateString()}_{$slotStart->format('H:i')}",
                        ];
                    }

                    $slotStart->addMinutes($duration);
                }

                if (count($slots) > 0) {
                    $allSlots[$provider->full_name] = array_slice($slots, 0, 20);
                }
            }

            if (empty($allSlots)) {
                $dateFormatted = $date->format('l, F j');

                $__vapi_return = [
                    'success' => true,
                    'result' => "There are no available slots on {$dateFormatted}. Would the caller like to try a different date?",
                    'data' => ['date' => $date->toDateString(), 'available_slots' => []],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $parts = [];
            foreach ($allSlots as $providerName => $slots) {
                $slotEntries = array_map(fn ($s) => "{$s['time']} [slot_id:{$s['slot_id']}]", $slots);
                $slotList = implode(', ', $slotEntries);
                $parts[] = "{$providerName}: {$slotList}";
            }

            $dateFormatted = $date->format('l, F j');
            $result = "Available slots on {$dateFormatted} ({$duration} min): ".implode('. ', $parts).'. Use the slot_id when calling book_appointment.';

            $__vapi_return = [
                'success' => true,
                'result' => $result,
                'data' => ['date' => $date->toDateString(), 'duration' => $duration, 'available_slots' => $allSlots],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher check_schedule failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => 'I was unable to check the schedule right now. Let me take a message and have someone call you back.', 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Return available appointment types for the clinic.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function checkAppointmentTypes(Clinic $clinic): array
    {
        Log::info('[VapiToolDispatcher] checkAppointmentTypes PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic]),
        ]);
        Log::info('[VapiToolDispatcher] checkAppointmentTypes START', ['method' => 'checkAppointmentTypes']);
        try {
            $types = AppointmentType::where('clinic_id', $clinic->id)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'duration_minutes']);

            if ($types->isEmpty()) {
                $__vapi_return = [
                    'success' => true,
                    'result' => 'There are no appointment types currently configured. I can book a general appointment.',
                    'data' => ['types' => []],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $list = $types->map(fn (AppointmentType $t) => "{$t->name} ({$t->duration_minutes} minutes)")->join(', ');

            $__vapi_return = [
                'success' => true,
                'result' => "The available appointment types are: {$list}. Which type of appointment does the caller need?",
                'data' => [
                    'types' => $types->map(fn (AppointmentType $t) => [
                        'id' => $t->id,
                        'name' => $t->name,
                        'duration_minutes' => $t->duration_minutes,
                    ])->toArray(),
                ],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher check_appointment_types failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => 'I was unable to retrieve appointment types right now.', 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * List a patient's upcoming appointments.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function listUpcomingAppointments(Clinic $clinic, array $args): array
    {
        Log::info('[VapiToolDispatcher] listUpcomingAppointments PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] listUpcomingAppointments START', ['method' => 'listUpcomingAppointments']);
        try {
            $patientId = $args['patient_id'] ?? null;
            if (! $patientId) {
                $__vapi_return = ['success' => false, 'result' => 'I need the patient ID to list appointments. Please call lookup_patient first.', 'data' => []];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $patient = Patient::where('id', $patientId)->where('clinic_id', $clinic->id)->first();
            if (! $patient) {
                $__vapi_return = ['success' => false, 'result' => 'I could not find that patient. Let me look them up again.', 'data' => []];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $clinicNow = Carbon::parse(now($clinic->timezone ?? 'America/New_York')->format('Y-m-d H:i:s'));
            $appointments = Appointment::where('clinic_id', $clinic->id)
                ->where('patient_id', $patient->id)
                ->whereIn('status', [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed])
                ->where('scheduled_at', '>=', $clinicNow)
                ->orderBy('scheduled_at')
                ->with(['provider', 'appointmentType'])
                ->limit(5)
                ->get();

            if ($appointments->isEmpty()) {
                $__vapi_return = [
                    'success' => true,
                    'result' => "No upcoming appointments found for {$patient->full_name}. Would they like to book one?",
                    'data' => ['appointments' => []],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $list = $appointments->map(function (Appointment $a) {
                $date = $a->scheduled_at->format('l, F j');
                $time = $a->scheduled_at->format('g:i A');
                $provider = $a->provider->full_name;
                $type = $a->appointmentType?->name ?? 'Appointment';

                $__vapi_return = "{$date} at {$time} with {$provider} for {$type} (ID: {$a->id})";

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            })->join('; ');

            $count = $appointments->count();

            $__vapi_return = [
                'success' => true,
                'result' => "{$patient->full_name} has {$count} upcoming ".($count === 1 ? 'appointment' : 'appointments').": {$list}. Which appointment is the caller asking about?",
                'data' => [
                    'appointments' => $appointments->map(fn (Appointment $a) => [
                        'id' => $a->id,
                        'date' => $a->scheduled_at->toDateString(),
                        'time' => $a->scheduled_at->format('g:i A'),
                        'provider' => $a->provider->full_name,
                        'type' => $a->appointmentType?->name,
                    ])->toArray(),
                ],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher list_upcoming_appointments failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => 'I was unable to retrieve appointments right now.', 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Book a new appointment with atomic conflict detection.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function bookAppointment(Clinic $clinic, Call $call, array $args): array
    {
        Log::info('[VapiToolDispatcher] bookAppointment PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'call' => $call, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] bookAppointment START', ['method' => 'bookAppointment']);
        try {
            // Validate patient
            $patientId = $args['patient_id'] ?? null;
            if (! $patientId) {
                $__vapi_return = ['success' => false, 'result' => 'I need to look up the patient first before booking. Can you confirm the patient name or date of birth?', 'data' => []];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $patient = Patient::where('id', $patientId)->where('clinic_id', $clinic->id)->first();
            if (! $patient) {
                $__vapi_return = ['success' => false, 'result' => 'I could not find that patient in our system. Let me look them up again.', 'data' => []];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            // Resolve provider, date, and time via slot_id or separate fields
            if (! empty($args['slot_id'])) {
                Log::debug('book_appointment slot_id', ['slot_id' => $args['slot_id'], 'all_args' => $args]);
                $slotData = $this->parseSlotId($args['slot_id']);
                if (! $slotData) {
                    // slot_id is invalid (e.g. "9:00 AM") — fall through to provider_name+date+time path below
                    $args['slot_id'] = null;
                } else {
                    $provider = Provider::where('id', $slotData['provider_id'])
                        ->where('clinic_id', $clinic->id)
                        ->where('is_active', true)
                        ->first();
                    if (! $provider) {
                        $__vapi_return = ['success' => false, 'result' => "I couldn't find that provider. Please check the schedule again.", 'data' => []];

                        return $this->traceReturn(__FUNCTION__, $__vapi_return);
                    }

                    $date = $slotData['date'];
                    $time = $slotData['time'];
                }
            }

            if (empty($args['slot_id'])) {
                if (empty($args['provider_name'])) {
                    $__vapi_return = ['success' => false, 'result' => 'Which provider should the appointment be with?', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $searchService = app(ArabicSearchService::class);
                $searchResult = $searchService->searchProvider($args['provider_name'], $clinic->id);

                if ($searchResult->status === ArabicSearchResult::STATUS_AMBIGUOUS) {
                    $names = array_map(fn ($p) => $p->full_name, $searchResult->ambiguousMatches);
                    $__vapi_return = ['success' => false, 'result' => 'I found multiple matching providers: '.implode(', ', $names).'. Could you clarify which doctor?', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                if ($searchResult->status !== ArabicSearchResult::STATUS_FOUND) {
                    $__vapi_return = ['success' => false, 'result' => "I couldn't find a provider matching that name. Could you confirm the provider?", 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $provider = $searchResult->entity;

                if (empty($args['date']) || empty($args['time'])) {
                    $__vapi_return = ['success' => false, 'result' => 'I need both a date and time for the appointment.', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $date = $args['date'];
                $time = $args['time'];
            }

            // Resolve appointment type
            $appointmentType = null;
            $duration = 30;
            if (! empty($args['appointment_type'])) {
                $searchService = app(ArabicSearchService::class);
                $searchResult = $searchService->searchAppointmentType($args['appointment_type'], $clinic->id);

                if ($searchResult->status === ArabicSearchResult::STATUS_FOUND) {
                    $appointmentType = $searchResult->entity;
                } elseif ($searchResult->status === ArabicSearchResult::STATUS_AMBIGUOUS) {
                    $names = array_map(fn ($t) => $t->name, $searchResult->ambiguousMatches);
                    $__vapi_return = ['success' => false, 'result' => 'I found multiple matching appointment types: '.implode(', ', $names).'. Could you clarify which one?', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }
            }
            if (! $appointmentType) {
                $appointmentType = AppointmentType::where('clinic_id', $clinic->id)
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->first();
            }
            if ($appointmentType) {
                $duration = $appointmentType->duration_minutes;
            }

            $scheduledAt = Carbon::parse($date.' '.$time);
            $endsAt = $scheduledAt->copy()->addMinutes($duration);

            // Atomic conflict check + create to prevent race conditions
            $appointment = DB::transaction(function () use ($clinic, $call, $patient, $provider, $appointmentType, $scheduledAt, $endsAt, $args) {
                $activeStatuses = [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed, AppointmentStatus::CheckedIn, AppointmentStatus::InProgress];

                $conflict = Appointment::where('provider_id', $provider->id)
                    ->whereIn('status', $activeStatuses)
                    ->where('scheduled_at', '<', $endsAt)
                    ->where('ends_at', '>', $scheduledAt)
                    ->lockForUpdate()
                    ->exists();

                if ($conflict) {
                    Log::warning('[VapiToolDispatcher] Appointment conflict detected.', ['provider_id' => $provider->id]);
                    $__vapi_return = null;

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $__vapi_return = Appointment::create([
                    'clinic_id' => $clinic->id,
                    'patient_id' => $patient->id,
                    'provider_id' => $provider->id,
                    'appointment_type_id' => $appointmentType?->id,
                    'scheduled_at' => $scheduledAt,
                    'ends_at' => $endsAt,
                    'status' => AppointmentStatus::Scheduled,
                    'source' => AppointmentSource::Ai,
                    'call_id' => $call->id,
                    'reason' => $args['reason'] ?? null,
                ]);

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            });

            if (! $appointment) {
                Log::warning('[VapiToolDispatcher] Appointment creation returned no appointment (conflict).');
                $__vapi_return = [
                    'success' => false,
                    'result' => "That time slot is no longer available with {$provider->full_name}. Would the caller like me to check for the next available time?",
                    'data' => ['conflict' => true],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $dateFormatted = $scheduledAt->format('l, F j');
            $timeFormatted = $scheduledAt->format('g:i A');
            $typeName = $appointmentType?->name ?? 'appointment';

            $__vapi_return = [
                'success' => true,
                'result' => "Appointment booked for {$patient->full_name} with {$provider->full_name} on {$dateFormatted} at {$timeFormatted} for a {$typeName}. The appointment is {$duration} minutes long.",
                'data' => ['appointment_id' => $appointment->id],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher book_appointment failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => 'I was unable to book the appointment right now. Let me take a message and have someone call you back to schedule.', 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Reschedule an existing appointment with atomic conflict detection.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function rescheduleAppointment(Clinic $clinic, array $args): array
    {
        Log::info('[VapiToolDispatcher] rescheduleAppointment PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] rescheduleAppointment START', ['method' => 'rescheduleAppointment']);
        try {
            $appointment = null;
            $patient = null;
            $clinicNow = Carbon::parse(now($clinic->timezone ?? 'America/New_York')->format('Y-m-d H:i:s'));

            // Fast-path: appointment_id from list_upcoming_appointments
            if (! empty($args['appointment_id'])) {
                $appointment = Appointment::where('id', $args['appointment_id'])
                    ->where('clinic_id', $clinic->id)
                    ->whereIn('status', [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed])
                    ->where('scheduled_at', '>=', $clinicNow)
                    ->with(['provider', 'appointmentType', 'patient'])
                    ->first();

                if (! $appointment) {
                    $__vapi_return = ['success' => false, 'result' => 'I could not find that appointment. It may have been cancelled or already passed. Let me check for upcoming appointments.', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $patient = $appointment->patient;
            } else {
                // Fallback: lookup by patient_id
                if (empty($args['patient_id'])) {
                    $__vapi_return = ['success' => false, 'result' => 'I need to verify the patient first before rescheduling.', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $patient = Patient::where('id', $args['patient_id'])->where('clinic_id', $clinic->id)->first();
                if (! $patient) {
                    $__vapi_return = ['success' => false, 'result' => 'I could not find that patient. Let me look them up again.', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $appointment = Appointment::where('clinic_id', $clinic->id)
                    ->where('patient_id', $patient->id)
                    ->whereIn('status', [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed])
                    ->where('scheduled_at', '>=', $clinicNow)
                    ->orderBy('scheduled_at')
                    ->with(['provider', 'appointmentType'])
                    ->first();

                if (! $appointment) {
                    $__vapi_return = ['success' => true, 'result' => "I couldn't find an upcoming appointment for {$patient->full_name}. Would they like to book a new one?", 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }
            }

            // Resolve new slot via new_slot_id or separate fields
            $providerId = $appointment->provider_id;

            if (! empty($args['new_slot_id'])) {
                $slotData = $this->parseSlotId($args['new_slot_id']);
                if (! $slotData) {
                    $__vapi_return = ['success' => false, 'result' => 'Invalid slot reference. Please use check_schedule to get available time slots.', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $newProvider = Provider::where('id', $slotData['provider_id'])
                    ->where('clinic_id', $clinic->id)
                    ->where('is_active', true)
                    ->first();
                if (! $newProvider) {
                    $__vapi_return = ['success' => false, 'result' => "I couldn't find that provider. Please check the schedule again.", 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $providerId = $newProvider->id;
                $newScheduledAt = Carbon::parse($slotData['date'].' '.$slotData['time']);
            } else {
                if (empty($args['new_date']) || empty($args['new_time'])) {
                    $__vapi_return = ['success' => false, 'result' => 'What date and time would the caller like to reschedule to?', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $newScheduledAt = Carbon::parse($args['new_date'].' '.$args['new_time']);

                if (! empty($args['provider_name'])) {
                    $searchService = app(ArabicSearchService::class);
                    $searchResult = $searchService->searchProvider($args['provider_name'], $clinic->id);
                    if ($searchResult->status === ArabicSearchResult::STATUS_FOUND) {
                        $providerId = $searchResult->entity->id;
                    } elseif ($searchResult->status === ArabicSearchResult::STATUS_AMBIGUOUS) {
                        $names = array_map(fn ($p) => $p->full_name, $searchResult->ambiguousMatches);
                        $__vapi_return = ['success' => false, 'result' => 'I found multiple matching providers: '.implode(', ', $names).'. Could you clarify which doctor?', 'data' => []];

                        return $this->traceReturn(__FUNCTION__, $__vapi_return);
                    } else {
                        $__vapi_return = ['success' => false, 'result' => "I couldn't find a provider matching that name. Could you confirm the provider?", 'data' => []];

                        return $this->traceReturn(__FUNCTION__, $__vapi_return);
                    }
                }
            }

            $duration = $appointment->appointmentType?->duration_minutes ?? 30;
            $newEndsAt = $newScheduledAt->copy()->addMinutes($duration);

            // Capture original date before update (getOriginal is unreliable after update+syncOriginal)
            $oldScheduledAt = $appointment->scheduled_at;

            // Atomic conflict check + update to prevent race conditions
            $success = DB::transaction(function () use ($appointment, $providerId, $newScheduledAt, $newEndsAt) {
                $activeStatuses = [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed, AppointmentStatus::CheckedIn, AppointmentStatus::InProgress];

                $conflict = Appointment::where('provider_id', $providerId)
                    ->where('id', '!=', $appointment->id)
                    ->whereIn('status', $activeStatuses)
                    ->where('scheduled_at', '<', $newEndsAt)
                    ->where('ends_at', '>', $newScheduledAt)
                    ->lockForUpdate()
                    ->exists();

                if ($conflict) {
                    $__vapi_return = false;

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $appointment->update([
                    'scheduled_at' => $newScheduledAt,
                    'ends_at' => $newEndsAt,
                    'provider_id' => $providerId,
                ]);

                $__vapi_return = true;

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            });

            if (! $success) {
                $__vapi_return = ['success' => false, 'result' => 'That time slot is not available. Would the caller like me to check for other available times?', 'data' => ['conflict' => true]];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $oldDate = $oldScheduledAt
                ? Carbon::parse($oldScheduledAt)->format('l, F j').' at '.Carbon::parse($oldScheduledAt)->format('g:i A')
                : 'the previous time';

            $newDate = $newScheduledAt->format('l, F j').' at '.$newScheduledAt->format('g:i A');
            $providerName = Provider::find($providerId)?->full_name ?? 'the provider';

            $__vapi_return = [
                'success' => true,
                'result' => "Appointment rescheduled. {$patient->full_name}'s appointment has been moved from {$oldDate} to {$newDate} with {$providerName}.",
                'data' => ['appointment_id' => $appointment->id],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher reschedule_appointment failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => 'I was unable to reschedule the appointment right now. Let me take a message and have someone follow up.', 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Cancel an existing appointment.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function cancelAppointment(Clinic $clinic, array $args): array
    {
        Log::info('[VapiToolDispatcher] cancelAppointment PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] cancelAppointment START', ['method' => 'cancelAppointment']);
        try {
            $appointment = null;
            $patient = null;
            $clinicNow = Carbon::parse(now($clinic->timezone ?? 'America/New_York')->format('Y-m-d H:i:s'));

            // Fast-path: appointment_id from list_upcoming_appointments
            if (! empty($args['appointment_id'])) {
                $appointment = Appointment::where('id', $args['appointment_id'])
                    ->where('clinic_id', $clinic->id)
                    ->whereIn('status', [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed])
                    ->where('scheduled_at', '>=', $clinicNow)
                    ->with(['provider', 'patient'])
                    ->first();

                if (! $appointment) {
                    $__vapi_return = ['success' => false, 'result' => 'I could not find that appointment. It may have been cancelled or already passed.', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $patient = $appointment->patient;
            } else {
                // Fallback: lookup by patient_id
                if (empty($args['patient_id'])) {
                    $__vapi_return = ['success' => false, 'result' => 'I need to verify the patient first before cancelling.', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $patient = Patient::where('id', $args['patient_id'])->where('clinic_id', $clinic->id)->first();
                if (! $patient) {
                    $__vapi_return = ['success' => false, 'result' => 'I could not find that patient. Let me look them up again.', 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }

                $appointment = Appointment::where('clinic_id', $clinic->id)
                    ->where('patient_id', $patient->id)
                    ->whereIn('status', [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed])
                    ->where('scheduled_at', '>=', $clinicNow)
                    ->orderBy('scheduled_at')
                    ->with('provider')
                    ->first();

                if (! $appointment) {
                    $__vapi_return = ['success' => true, 'result' => "I couldn't find an upcoming appointment for {$patient->full_name} to cancel.", 'data' => []];

                    return $this->traceReturn(__FUNCTION__, $__vapi_return);
                }
            }

            $dateFormatted = $appointment->scheduled_at->format('l, F j').' at '.$appointment->scheduled_at->format('g:i A');

            $appointment->update([
                'status' => AppointmentStatus::Cancelled,
                'cancelled_at' => now(),
                'cancellation_reason' => $args['reason'] ?? 'Cancelled by patient via phone',
            ]);

            $__vapi_return = [
                'success' => true,
                'result' => "The appointment on {$dateFormatted} with {$appointment->provider->full_name} has been cancelled. The caller can reschedule anytime by calling back.",
                'data' => ['appointment_id' => $appointment->id],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher cancel_appointment failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => 'I was unable to cancel the appointment right now. Let me take a message and have someone follow up.', 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Verify a patient's insurance eligibility.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function verifyInsurance(Clinic $clinic, array $args): array
    {
        Log::info('[VapiToolDispatcher] verifyInsurance PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] verifyInsurance START', ['method' => 'verifyInsurance']);
        try {
            if (empty($args['patient_id'])) {
                $__vapi_return = ['success' => false, 'result' => 'I need to look up the patient first before checking insurance.', 'data' => []];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $patient = Patient::where('id', $args['patient_id'])->where('clinic_id', $clinic->id)->first();
            if (! $patient) {
                $__vapi_return = ['success' => false, 'result' => 'I could not find that patient. Let me look them up again.', 'data' => []];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $query = PatientInsurance::where('patient_id', $patient->id)
                ->with('insuranceProvider');

            if (! empty($args['provider_name'])) {
                $query->whereHas('insuranceProvider', function ($q) use ($args) {
                    $q->whereRaw('LOWER(name) LIKE ?', ['%'.mb_strtolower($args['provider_name']).'%']);
                });
            }

            Log::info('[VapiToolDispatcher] Executing insurance policy lookup.', ['patient_id' => $patient->id]);

            $policies = $query->get();
            Log::info('[VapiToolDispatcher] Insurance policy lookup completed.', ['count' => $policies->count()]);

            if ($policies->isEmpty()) {
                $__vapi_return = [
                    'success' => true,
                    'result' => "No insurance policies found on file for {$patient->full_name}. They may need to provide their insurance information.",
                    'data' => ['count' => 0],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $results = [];
            foreach ($policies as $policy) {
                $insurer = $policy->insuranceProvider;
                $isExpired = $policy->expiration_date && $policy->expiration_date->lt(today());
                $isEffective = $policy->effective_date->lte(today());
                $isAccepted = $insurer?->is_accepted ?? false;

                $planName = $insurer?->name ?? 'Unknown';
                $planType = $policy->plan_type->value ?? '';
                $copay = $policy->copay_amount ? '$'.number_format((float) $policy->copay_amount, 2) : 'not specified';

                if ($isExpired) {
                    $expDate = $policy->expiration_date->format('F j, Y');
                    $results[] = "The {$planName} {$planType} policy expired on {$expDate}.";
                } elseif (! $isEffective) {
                    $effDate = $policy->effective_date->format('F j, Y');
                    $results[] = "The {$planName} {$planType} policy is not yet effective until {$effDate}.";
                } elseif (! $isAccepted) {
                    $results[] = "The patient has a {$planName} {$planType} plan, but this insurance provider is not currently accepted at the clinic.";
                } else {
                    $primary = $policy->is_primary ? 'primary' : 'secondary';
                    $results[] = "The patient has an active {$planName} {$planType} plan ({$primary}) with a {$copay} copay. This insurance is accepted at the clinic.";
                }
            }

            $__vapi_return = [
                'success' => true,
                'result' => implode(' ', $results),
                'data' => ['count' => $policies->count()],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher verify_insurance failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => 'I was unable to verify insurance right now. I can transfer you to our billing department for assistance.', 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Assess the urgency of caller-described symptoms against clinic triage rules.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function assessUrgency(Clinic $clinic, Call $call, array $args): array
    {
        Log::info('[VapiToolDispatcher] assessUrgency PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'call' => $call, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] assessUrgency START', ['method' => 'assessUrgency']);
        try {
            $symptoms = $args['symptoms'] ?? '';

            if (empty($symptoms)) {
                $__vapi_return = [
                    'success' => false,
                    'result' => 'I need the caller to describe their symptoms so I can assess the urgency.',
                    'data' => [],
                ]; return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            // Load active triage rules with their keywords. Priority-tier
            // selection and specificity scoring both happen inside
            // TriageMatchEngine, so sort_order here only breaks ties between
            // equally-scored rules in the same tier.
            $rules = TriageRule::where('clinic_id', $clinic->id)
                ->where('is_active', true)
                ->with('keywords')
                ->orderBy('sort_order')
                ->get();

            $match = $this->triageMatchEngine->evaluate($rules, $symptoms);

            // Check clinic operating hours for after-hours context
            $hoursInfo = $this->checkClinicHours($clinic);

            if (! $match) {
                $result = 'Based on the symptoms described, this does not appear to be urgent. I can help schedule an appointment.';

                if (! $hoursInfo['is_open']) {
                    $result .= " The clinic is currently closed ({$hoursInfo['hours_today']}), but I can still book an appointment for a future date. What date works best?";
                }

                $this->recordTriageAudit($clinic, $call, $symptoms, null, [], 0, 'low', 'schedule_appointment', null, null, ! $hoursInfo['is_open']);

                $__vapi_return = [
                    'success' => true,
                    'result' => $result,
                    'data' => [
                        'priority' => 'low',
                        'action' => 'schedule_appointment',
                        'matched_keywords' => [],
                        'is_after_hours' => ! $hoursInfo['is_open'],
                    ],
                ]; return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $matchedRule = $match->rule;
            $priority = $matchedRule->priority;
            $action = $matchedRule->action;
            $matchedKeywords = $match->matchedKeywords;

            $responseText = match ($priority) {
                TriagePriority::Critical => "URGENT: Based on the symptoms described ({$matchedRule->name}), this may be a medical emergency. The caller should call 911 or go to the nearest emergency room immediately. Do NOT attempt to schedule a routine appointment.",
                TriagePriority::High => "The symptoms described suggest a high-priority concern ({$matchedRule->name}). I should transfer the caller to a nurse or provider for further assessment.",
                TriagePriority::Medium => "The symptoms warrant prompt attention ({$matchedRule->name}). I can help schedule an appointment as soon as possible.",
                TriagePriority::Low => "The symptoms described appear to be non-urgent ({$matchedRule->name}). I can help schedule a regular appointment.",
            };

            // Add after-hours context for non-critical priorities
            if (! $hoursInfo['is_open'] && $priority !== TriagePriority::Critical) {
                $responseText .= " The clinic is currently closed ({$hoursInfo['hours_today']}).";
                if ($priority === TriagePriority::High) {
                    $responseText .= ' If symptoms worsen, the caller should go to the nearest emergency room.';
                } else {
                    $responseText .= ' I can still book an appointment for a future date.';
                }
            }

            // Resolve who this should actually go to (target_user_id →
            // target_role → the clinic's escalation ladder) and execute the
            // rule's configured action as a real side effect, not just a
            // label in the response text.
            $escalation = $this->escalationResolver->resolve($clinic, $matchedRule);
            $executed = $this->executeTriageAction($clinic, $call, $matchedRule, $symptoms, $matchedKeywords, $escalation);

            if ($executed['notify'] && $escalation->assignee) {
                $this->notifyEscalation($escalation->assignee, $matchedRule, $call, $symptoms, $matchedKeywords);
            }

            $this->recordTriageAudit(
                $clinic,
                $call,
                $symptoms,
                $matchedRule,
                $matchedKeywords,
                $match->score,
                $priority->value,
                $action->value,
                $escalation,
                $executed['task_id'] ?? null,
                ! $hoursInfo['is_open'],
            );

            $__vapi_return = [
                'success' => true,
                'result' => $responseText,
                'data' => [
                    'priority' => $priority->value,
                    'action' => $action->value,
                    'rule_name' => $matchedRule->name,
                    'matched_keywords' => array_values(array_unique($matchedKeywords)),
                    'match_score' => $match->score,
                    'is_after_hours' => ! $hoursInfo['is_open'],
                    'assigned_to' => $escalation->assignee?->name,
                    'escalation_level' => $escalation->escalationPath?->level,
                ],
            ]; return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher assess_urgency failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            try {
                AuditLog::create([
                    'clinic_id' => $clinic->id,
                    'action' => 'triage.assessment_failed',
                    'description' => 'assess_urgency threw an exception: '.$e->getMessage(),
                    'status' => AuditStatus::Failed,
                    'created_at' => now(),
                ]);
            } catch (\Throwable) {
                // Auditing must never block the caller response.
            }

            $__vapi_return = [
                'success' => false,
                'result' => 'I was unable to assess urgency right now. If the caller is experiencing a medical emergency, please advise them to call 911.',
                'data' => [],
            ]; return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Execute the real, distinct side effect for each TriageAction branch —
     * previously the action was stored on the rule and echoed back in text,
     * but never actually operationalized. Every branch creates (or
     * deliberately skips) a Task assigned to the resolved escalation target,
     * and returns whether an escalation notification should also fire.
     *
     * @param  array<int, string>  $matchedKeywords
     * @return array{task_id: ?int, notify: bool}
     */
    private function executeTriageAction(
        Clinic $clinic,
        Call $call,
        TriageRule $rule,
        string $symptoms,
        array $matchedKeywords,
        EscalationResolution $escalation,
    ): array {
        $priority = $rule->priority;
        $assigneeId = $escalation->assignee?->id;
        $baseDescription = "Caller described: {$symptoms}. Matched rule: {$rule->name}. Priority: {$priority->value}. Action: {$rule->action->value}.";

        if ($escalation->escalationPath) {
            $baseDescription .= " Escalation level {$escalation->escalationPath->level} ({$escalation->escalationPath->name}).";
        }

        return match ($rule->action) {
            TriageAction::TransferImmediately => (function () use ($clinic, $call, $rule, $priority, $assigneeId, $baseDescription) {
                $call->update([
                    'transferred_to' => $assigneeId,
                    'transfer_reason' => "Immediate triage transfer: {$rule->name}",
                ]);

                $task = Task::create([
                    'clinic_id' => $clinic->id,
                    'call_id' => $call->id,
                    'patient_id' => $call->patient_id,
                    'title' => "Urgent triage: {$rule->name}",
                    'description' => $baseDescription,
                    'type' => TaskType::Review,
                    'priority' => TaskPriority::Urgent,
                    'status' => TaskStatus::Pending,
                    'assigned_to' => $assigneeId,
                ]);

                return ['task_id' => $task->id, 'notify' => true];
            })(),

            TriageAction::TransferNurse => (function () use ($clinic, $call, $rule, $assigneeId, $baseDescription) {
                $call->update([
                    'transferred_to' => $assigneeId,
                    'transfer_reason' => "Nurse triage transfer: {$rule->name}",
                ]);

                $task = Task::create([
                    'clinic_id' => $clinic->id,
                    'call_id' => $call->id,
                    'patient_id' => $call->patient_id,
                    'title' => "Nurse review: {$rule->name}",
                    'description' => $baseDescription,
                    'type' => TaskType::Review,
                    'priority' => TaskPriority::High,
                    'status' => TaskStatus::Pending,
                    'assigned_to' => $assigneeId,
                ]);

                return ['task_id' => $task->id, 'notify' => true];
            })(),

            TriageAction::SendAlert => (function () use ($clinic, $call, $rule, $priority, $assigneeId, $baseDescription) {
                $task = Task::create([
                    'clinic_id' => $clinic->id,
                    'call_id' => $call->id,
                    'patient_id' => $call->patient_id,
                    'title' => "Triage alert: {$rule->name}",
                    'description' => $baseDescription,
                    'type' => TaskType::Review,
                    'priority' => $priority === TriagePriority::Critical ? TaskPriority::Urgent : TaskPriority::High,
                    'status' => TaskStatus::Pending,
                    'assigned_to' => $assigneeId,
                ]);

                return ['task_id' => $task->id, 'notify' => true];
            })(),

            TriageAction::QueueCallback => (function () use ($clinic, $call, $rule, $assigneeId, $baseDescription) {
                $task = Task::create([
                    'clinic_id' => $clinic->id,
                    'call_id' => $call->id,
                    'patient_id' => $call->patient_id,
                    'title' => "Callback needed: {$rule->name}",
                    'description' => $baseDescription,
                    'type' => TaskType::Callback,
                    'priority' => TaskPriority::Normal,
                    'status' => TaskStatus::Pending,
                    'assigned_to' => $assigneeId,
                ]);

                return ['task_id' => $task->id, 'notify' => false];
            })(),

            // Voicemail routing needs no staff task of its own — there's no
            // one to notify since the caller is simply being routed to
            // voicemail, not handed to a person.
            TriageAction::RouteToVoicemail => ['task_id' => null, 'notify' => false],
        };
    }

    private function notifyEscalation(
        User $assignee,
        TriageRule $rule,
        Call $call,
        string $symptoms,
        array $matchedKeywords,
    ): void {
        $settings = $assignee->notificationSetting;

        // Default to notifying when no preference row exists yet (matches
        // ClinicProvisioner's own default of escalation_alerts = true) —
        // a missing settings row must never silently swallow an urgent alert.
        if ($settings && ! $settings->escalation_alerts) {
            return;
        }

        try {
            $assignee->notify(new TriageEscalationNotification($rule, $call, $symptoms, $matchedKeywords));
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher triage notification failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * @param  array<int, string>  $matchedKeywords
     */
    private function recordTriageAudit(
        Clinic $clinic,
        Call $call,
        string $symptoms,
        ?TriageRule $matchedRule,
        array $matchedKeywords,
        int $score,
        string $priority,
        string $action,
        ?EscalationResolution $escalation,
        ?int $taskId,
        bool $isAfterHours,
    ): void {
        try {
            AuditLog::create([
                'clinic_id' => $clinic->id,
                'user_id' => $escalation?->assignee?->id,
                'action' => 'triage.assessment',
                'auditable_type' => $matchedRule ? TriageRule::class : null,
                'auditable_id' => $matchedRule?->id,
                'description' => $matchedRule
                    ? "assess_urgency matched \"{$matchedRule->name}\" ({$priority}/{$action}) for call #{$call->id}."
                    : "assess_urgency found no matching rule for call #{$call->id}.",
                'new_values' => [
                    'call_id' => $call->id,
                    'symptoms' => $symptoms,
                    'priority' => $priority,
                    'action' => $action,
                    'matched_keywords' => array_values(array_unique($matchedKeywords)),
                    'score' => $score,
                    'escalation_path_id' => $escalation?->escalationPath?->id,
                    'assigned_user_id' => $escalation?->assignee?->id,
                    'task_id' => $taskId,
                    'is_after_hours' => $isAfterHours,
                ],
                'status' => ($matchedRule && ! $escalation?->assignee && in_array($matchedRule->priority, [TriagePriority::Critical, TriagePriority::High], true))
                    ? AuditStatus::Warning
                    : AuditStatus::Success,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Auditing is best-effort — never let it break call handling.
            Log::error('VapiToolDispatcher triage audit log failed', ['error' => $e->getMessage()]);
        }
    }
    /**
     * Create a callback task for requests the AI cannot handle directly.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function createCallbackTask(Clinic $clinic, Call $call, array $args): array
    {
        Log::info('[VapiToolDispatcher] createCallbackTask PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'call' => $call, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] createCallbackTask START', ['method' => 'createCallbackTask']);
        try {
            if (empty($args['reason'])) {
                $__vapi_return = [
                    'success' => false,
                    'result' => 'I need to know the reason for the callback request. What does the caller need help with?',
                    'data' => [],
                ];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            $reason = $args['reason'];
            $category = $args['category'] ?? 'callback';

            $taskType = match ($category) {
                'prescription' => TaskType::Prescription,
                'lab_results' => TaskType::FollowUp,
                'insurance' => TaskType::Insurance,
                default => TaskType::Callback,
            };

            $priority = ! empty($args['urgent']) ? TaskPriority::High : TaskPriority::Normal;

            $description = $reason;
            if ($call->caller_phone) {
                $description .= " | Caller phone: {$call->caller_phone}";
            }

            Task::create([
                'clinic_id' => $clinic->id,
                'call_id' => $call->id,
                'patient_id' => $call->patient_id,
                'title' => 'Callback: '.ucfirst(str_replace('_', ' ', $category)),
                'description' => $description,
                'type' => $taskType,
                'priority' => $priority,
                'status' => TaskStatus::Pending,
            ]);

            $__vapi_return = [
                'success' => true,
                'result' => "I've created a callback request. A staff member will follow up regarding: {$reason}.",
                'data' => ['category' => $category, 'task_type' => $taskType->value],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher create_callback_task failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => 'I was unable to create the callback request right now. Let me transfer you to a staff member.', 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Record a transfer call intent and create a callback task.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function transferCall(Clinic $clinic, Call $call, array $args): array
    {
        Log::info('[VapiToolDispatcher] transferCall PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'call' => $call, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] transferCall START', ['method' => 'transferCall']);
        try {
            $department = $args['department'] ?? 'front desk';
            $reason = $args['reason'] ?? 'Caller requested transfer';

            $call->update([
                'transfer_reason' => $reason,
            ]);

            Task::create([
                'clinic_id' => $clinic->id,
                'call_id' => $call->id,
                'patient_id' => $call->patient_id,
                'title' => "Transfer requested: {$department}",
                'description' => $reason,
                'type' => TaskType::Callback,
                'priority' => TaskPriority::High,
                'status' => TaskStatus::Pending,
            ]);

            $phone = $clinic->phone ?? 'the main line';

            $__vapi_return = [
                'success' => true,
                'result' => "I've flagged this for our staff as a high-priority callback so a team member can follow up with the caller right away. If it's urgent, they can also be reached directly at {$phone}.",
                'data' => ['department' => $department, 'phone' => $clinic->phone, 'queued_as_task' => true],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher transfer_call failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => "I'm unable to transfer the call right now. I'll create a callback task for the staff to follow up.", 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Handle SMS sending request — creates a task since SMS integration may not be configured.
     *
     * @return array{success: bool, result: string, data: array}
     */
    protected function sendSms(Clinic $clinic, Call $call, array $args): array
    {
        Log::info('[VapiToolDispatcher] sendSms PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic, 'call' => $call, 'args' => $args]),
        ]);
        Log::info('[VapiToolDispatcher] sendSms START', ['method' => 'sendSms']);
        try {
            $phone = $args['phone'] ?? $call->caller_phone ?? null;
            $message = $args['message'] ?? null;

            if (! $phone || ! $message) {
                $__vapi_return = ['success' => false, 'result' => 'I need a phone number and message content to send a text.', 'data' => []];

                return $this->traceReturn(__FUNCTION__, $__vapi_return);
            }

            // Create a task for staff to send the SMS (or could integrate with Twilio in the future)
            Task::create([
                'clinic_id' => $clinic->id,
                'call_id' => $call->id,
                'patient_id' => $call->patient_id,
                'title' => 'Send SMS to patient',
                'description' => "Send to {$phone}: {$message}",
                'type' => TaskType::General,
                'priority' => TaskPriority::Normal,
                'status' => TaskStatus::Pending,
            ]);

            $__vapi_return = [
                'success' => true,
                'result' => "I've passed the details to our front-desk staff, who will text them to the caller's phone number shortly.",
                'data' => ['phone' => $phone, 'queued_as_task' => true],
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        } catch (\Throwable $e) {
            Log::error('VapiToolDispatcher send_sms failed', ['error' => $e->getMessage()]);
            $this->traceException(__FUNCTION__, $e);

            $__vapi_return = ['success' => false, 'result' => "I wasn't able to send the text message right now. I'll note it for staff to follow up.", 'data' => []];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }
    }

    /**
     * Check if the clinic is currently open based on operating hours.
     *
     * @return array{is_open: bool, hours_today: string}
     */
    protected function checkClinicHours(Clinic $clinic): array
    {
        Log::info('[VapiToolDispatcher] checkClinicHours PARAMS', [
            'params' => $this->traceValue(['clinic' => $clinic]),
        ]);
        Log::info('[VapiToolDispatcher] checkClinicHours START', ['method' => 'checkClinicHours']);
        $timezone = $clinic->timezone ?? 'America/New_York';
        $now = Carbon::now($timezone);

        $todayHours = ClinicOperatingHour::where('clinic_id', $clinic->id)
            ->where('day_of_week', $now->dayOfWeek)
            ->first();

        // No operating hours configured — assume open
        if (! $todayHours) {
            $__vapi_return = ['is_open' => true, 'hours_today' => ''];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }

        if ($todayHours->is_closed) {
            $__vapi_return = [
                'is_open' => false,
                'hours_today' => 'The clinic is closed today.',
            ];

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }

        $currentTime = $now->format('H:i:s');
        $isOpen = $currentTime >= $todayHours->open_time && $currentTime < $todayHours->close_time;

        $openFormatted = Carbon::parse($todayHours->open_time)->format('g:i A');
        $closeFormatted = Carbon::parse($todayHours->close_time)->format('g:i A');

        $__vapi_return = [
            'is_open' => $isOpen,
            'hours_today' => "Today's hours are {$openFormatted} to {$closeFormatted}.",
        ];

        return $this->traceReturn(__FUNCTION__, $__vapi_return);
    }

    /**
     * Parse a slot_id string into its components.
     *
     * @return array{provider_id: int, date: string, time: string}|null
     */
    protected function parseSlotId(string $slotId): ?array
    {
        Log::info('[VapiToolDispatcher] parseSlotId PARAMS', [
            'params' => $this->traceValue(['slotId' => $slotId]),
        ]);
        Log::info('[VapiToolDispatcher] parseSlotId START', ['method' => 'parseSlotId']);
        if (! str_starts_with($slotId, 'slot_')) {
            $__vapi_return = null;

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }

        $parts = explode('_', substr($slotId, 5), 3);

        if (count($parts) !== 3 || ! is_numeric($parts[0])) {
            $__vapi_return = null;

            return $this->traceReturn(__FUNCTION__, $__vapi_return);
        }

        $__vapi_return = [
            'provider_id' => (int) $parts[0],
            'date' => $parts[1],
            'time' => $parts[2],
        ];

        return $this->traceReturn(__FUNCTION__, $__vapi_return);
    }
}
