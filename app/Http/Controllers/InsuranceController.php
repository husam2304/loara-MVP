<?php

namespace App\Http\Controllers;

use App\Contracts\InsuranceVerificationContract;
use App\Enums\AuthorizationStatus;
use App\Enums\ClaimStatus;
use App\Enums\EligibilityVerificationStatus;
use App\Enums\PatientStatus;
use App\Http\Requests\StoreInsuranceClaimRequest;
use App\Http\Requests\VerifyEligibilityRequest;
use App\Models\EligibilityVerification;
use App\Models\InsuranceClaim;
use App\Models\InsuranceProvider;
use App\Models\Patient;
use App\Models\PatientInsurance;
use App\Models\PriorAuthorization;
use App\Models\Provider;
use App\Services\Gateways\ClaimMdGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class InsuranceController extends Controller
{
    public function index(): Response
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic) {
            return Inertia::render('Insurance', [
                'claims' => collect(),
                'priorAuthorizations' => collect(),
                'patients' => collect(),
                'insuranceProviders' => collect(),
                'recentVerifications' => collect(),
                'stats' => [
                    'totalClaims' => 0,
                    'pendingClaims' => 0,
                    'approvalRate' => 0,
                    'pendingAuthorizations' => 0,
                    'avgTurnaroundDays' => 0,
                ],
            ]);
        }

        $claims = InsuranceClaim::query()
            ->where('clinic_id', $clinic->id)
            ->with(['patient', 'insuranceProvider'])
            ->latest('submitted_at')
            ->limit(20)
            ->get();

        $priorAuthorizations = PriorAuthorization::query()
            ->where('clinic_id', $clinic->id)
            ->with(['patient', 'insuranceProvider'])
            ->latest('requested_at')
            ->limit(10)
            ->get();

        $totalClaims = InsuranceClaim::where('clinic_id', $clinic->id)->count();

        $pendingClaimsCount = InsuranceClaim::where('clinic_id', $clinic->id)
            ->whereIn('status', [ClaimStatus::Pending, ClaimStatus::Submitted, ClaimStatus::InReview])
            ->count();

        $approvedClaims = InsuranceClaim::where('clinic_id', $clinic->id)
            ->where('status', ClaimStatus::Approved)
            ->count();

        $approvalRate = $totalClaims > 0
            ? round(($approvedClaims / $totalClaims) * 100, 1)
            : 0;

        $pendingAuthorizationsCount = PriorAuthorization::where('clinic_id', $clinic->id)
            ->where('status', AuthorizationStatus::Pending)
            ->count();

        $claimsWithDates = InsuranceClaim::where('clinic_id', $clinic->id)
            ->whereNotNull('resolved_at')
            ->whereNotNull('submitted_at')
            ->get(['submitted_at', 'resolved_at']);

        $avgTurnaroundDays = $claimsWithDates->isNotEmpty()
            ? round($claimsWithDates->avg(fn ($claim) => Carbon::parse($claim->resolved_at)->diffInDays(Carbon::parse($claim->submitted_at))), 1)
            : 0;

        // Seed the picker with recent patients only; the typeahead fetches the rest
        // from /patients/search so we never ship the whole patient table.
        $patients = Patient::query()
            ->where('clinic_id', $clinic->id)
            ->where('status', PatientStatus::Active)
            ->with(['insurancePolicies.insuranceProvider'])
            ->latest()
            ->limit(20)
            ->get(['id', 'first_name', 'last_name']);

        $insuranceProviders = InsuranceProvider::query()
            ->where('clinic_id', $clinic->id)
            ->where('is_accepted', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $recentVerifications = EligibilityVerification::query()
            ->where('clinic_id', $clinic->id)
            ->with(['patient', 'insuranceProvider'])
            ->latest()
            ->limit(5)
            ->get();

        return Inertia::render('Insurance', [
            'claims' => $claims,
            'priorAuthorizations' => $priorAuthorizations,
            'patients' => $patients,
            'insuranceProviders' => $insuranceProviders,
            'recentVerifications' => $recentVerifications,
            'stats' => [
                'totalClaims' => $totalClaims,
                'pendingClaims' => $pendingClaimsCount,
                'approvalRate' => $approvalRate,
                'pendingAuthorizations' => $pendingAuthorizationsCount,
                'avgTurnaroundDays' => $avgTurnaroundDays,
            ],
        ]);
    }

    public function store(StoreInsuranceClaimRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic) {
            return back()->with('error', 'No clinic associated with your account.');
        }

        InsuranceClaim::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $request->validated('patient_id'),
            'insurance_provider_id' => $request->validated('insurance_provider_id'),
            'claim_number' => $request->validated('claim_number'),
            'amount' => $request->validated('amount'),
            'notes' => $request->validated('notes'),
            'status' => ClaimStatus::Submitted,
            'submitted_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Insurance claim created successfully.');
    }

    public function verify(VerifyEligibilityRequest $request, InsuranceVerificationContract $gateway): JsonResponse
    {
        $clinic = $request->user()->clinic;
        $data = $request->validated();

        $patientInsurance = PatientInsurance::with(['patient', 'insuranceProvider'])
            ->findOrFail($data['patient_insurance_id']);

        $insuranceProvider = $patientInsurance->insuranceProvider;

        if (! $insuranceProvider->payer_id) {
            return response()->json([
                'error' => 'This insurance provider does not have a payer ID configured for electronic verification.',
            ], 422);
        }

        $renderingProvider = isset($data['provider_id'])
            ? Provider::findOrFail($data['provider_id'])
            : null;

        $serviceTypeCodes = $data['service_type_codes'] ?? ['30'];

        try {
            $result = $gateway->verifyEligibility([
                'payer_id' => $insuranceProvider->payer_id,
                'member_id' => $patientInsurance->member_id,
                'first_name' => $patientInsurance->patient->first_name,
                'last_name' => $patientInsurance->patient->last_name,
                'date_of_birth' => $patientInsurance->patient->date_of_birth->format('Ymd'),
                'provider_npi' => $renderingProvider?->npi_number ?? '',
                'provider_organization' => $clinic->name,
                'service_date' => str_replace('-', '', $data['service_date']),
                'service_type_codes' => $serviceTypeCodes,
            ]);

            $verification = EligibilityVerification::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patientInsurance->patient_id,
                'patient_insurance_id' => $patientInsurance->id,
                'insurance_provider_id' => $insuranceProvider->id,
                'provider_id' => $renderingProvider?->id,
                'status' => $result['status'],
                'payer_id' => $insuranceProvider->payer_id,
                'member_id' => $patientInsurance->member_id,
                'service_date' => $data['service_date'],
                'service_type_codes' => $serviceTypeCodes,
                'plan_details' => $result['plan_details'],
                'coverages' => $result['coverages'],
                'raw_response' => $result['raw_response'],
                'verified_by' => $request->user()->id,
            ]);

            return response()->json([
                'verification' => $verification->load(['patient', 'insuranceProvider']),
            ]);
        } catch (\Exception $e) {
            $verification = EligibilityVerification::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patientInsurance->patient_id,
                'patient_insurance_id' => $patientInsurance->id,
                'insurance_provider_id' => $insuranceProvider->id,
                'provider_id' => $renderingProvider?->id,
                'status' => EligibilityVerificationStatus::Error,
                'payer_id' => $insuranceProvider->payer_id,
                'member_id' => $patientInsurance->member_id,
                'service_date' => $data['service_date'],
                'service_type_codes' => $serviceTypeCodes,
                'error_message' => $e->getMessage(),
                'verified_by' => $request->user()->id,
            ]);

            return response()->json([
                'error' => 'Eligibility verification failed: '.$e->getMessage(),
                'verification' => $verification,
            ], 502);
        }
    }

    public function submitClaim(Request $request, InsuranceClaim $claim): JsonResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic || $claim->clinic_id !== $clinic->id) {
            abort(403);
        }

        if ($claim->claim_md_id) {
            return response()->json(['error' => 'This claim has already been submitted to the payer.'], 422);
        }

        $patient = $claim->patient;
        $insuranceProvider = $claim->insuranceProvider;

        if (! $insuranceProvider?->payer_id) {
            return response()->json(['error' => 'Insurance provider does not have a payer ID configured.'], 422);
        }

        $patientInsurance = PatientInsurance::where('patient_id', $patient->id)
            ->where('insurance_provider_id', $insuranceProvider->id)
            ->first();

        try {
            $gateway = app(ClaimMdGateway::class);

            $claimData = [
                'claim' => [
                    'payerid' => $insuranceProvider->payer_id,
                    'prov_npi' => $clinic->providers()->where('is_active', true)->value('npi_number') ?? '',
                    'prov_name_l' => $clinic->name,
                    'pat_name_l' => $patient->last_name,
                    'pat_name_f' => $patient->first_name,
                    'pat_dob' => $patient->date_of_birth?->format('Ymd') ?? '',
                    'ins_number' => $patientInsurance?->member_id ?? '',
                    'group_number' => $patientInsurance?->group_number ?? '',
                    'total_charge' => (string) $claim->amount,
                    'claim_number' => $claim->claim_number,
                ],
            ];

            $result = $gateway->submitClaim([
                'claim_data' => $claimData,
                'filename' => "claim_{$claim->claim_number}.json",
            ]);

            $claim->update([
                'claim_md_id' => $result['claim_md_id'],
                'claim_md_status' => $result['status'],
                'claim_md_response' => $result['raw_response'],
                'submitted_to_payer_at' => now(),
                'status' => ClaimStatus::Submitted,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Claim submitted to payer successfully.',
                'claim' => $claim->fresh(['patient', 'insuranceProvider']),
            ]);
        } catch (\Throwable $e) {
            Log::error('Claim.MD submission failed', [
                'claim_id' => $claim->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to submit claim: '.$e->getMessage(),
            ], 502);
        }
    }

    public function checkClaimStatus(Request $request, InsuranceClaim $claim): JsonResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic || $claim->clinic_id !== $clinic->id) {
            abort(403);
        }

        if (! $claim->claim_md_id) {
            return response()->json(['error' => 'This claim has not been submitted to a payer yet.'], 422);
        }

        try {
            $gateway = app(ClaimMdGateway::class);
            $result = $gateway->getClaimResponses('0', $claim->claim_md_id);

            $latestStatus = null;
            $paidAmount = null;

            foreach ($result['claims'] as $claimResponse) {
                if ($claimResponse['claim_md_id'] === $claim->claim_md_id) {
                    $latestStatus = $claimResponse['status'];
                    $paidAmount = $claimResponse['paid_amount'];
                }
            }

            if ($latestStatus) {
                $updates = [
                    'claim_md_status' => $latestStatus,
                    'claim_md_response' => $result['raw_response'],
                ];

                if ($paidAmount !== null) {
                    $updates['paid_amount'] = $paidAmount;
                }

                $mappedStatus = $this->mapClaimMdStatus($latestStatus);
                if ($mappedStatus) {
                    $updates['status'] = $mappedStatus;
                    if (in_array($mappedStatus, [ClaimStatus::Approved, ClaimStatus::Denied])) {
                        $updates['resolved_at'] = now();
                    }
                    if ($mappedStatus === ClaimStatus::Approved && $paidAmount !== null) {
                        $updates['approved_amount'] = $paidAmount;
                    }
                }

                $claim->update($updates);
            }

            return response()->json([
                'success' => true,
                'claim' => $claim->fresh(['patient', 'insuranceProvider']),
                'payer_status' => $latestStatus,
            ]);
        } catch (\Throwable $e) {
            Log::error('Claim.MD status check failed', [
                'claim_id' => $claim->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Failed to check claim status: '.$e->getMessage()], 502);
        }
    }

    public function payerList(Request $request): JsonResponse
    {
        $search = $request->input('search');

        try {
            $gateway = app(ClaimMdGateway::class);
            $payers = $gateway->getPayerList($search);

            return response()->json(['payers' => $payers]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to fetch payer list: '.$e->getMessage()], 502);
        }
    }

    private function mapClaimMdStatus(string $claimMdStatus): ?ClaimStatus
    {
        $normalized = strtolower(trim($claimMdStatus));

        return match (true) {
            str_contains($normalized, 'paid'), str_contains($normalized, 'approved'), str_contains($normalized, 'accepted') => ClaimStatus::Approved,
            str_contains($normalized, 'denied'), str_contains($normalized, 'rejected') => ClaimStatus::Denied,
            str_contains($normalized, 'pending'), str_contains($normalized, 'processing') => ClaimStatus::Pending,
            str_contains($normalized, 'review') => ClaimStatus::InReview,
            default => null,
        };
    }
}
