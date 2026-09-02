<?php

namespace App\Services\Gateways;

use App\Contracts\InsuranceVerificationContract;
use App\Enums\GatewayType;
use App\Models\GatewayConfiguration;
use Nextvisit\ClaimMD\Client;
use Nextvisit\ClaimMD\DTO\EligibilityDTO;
use Nextvisit\ClaimMD\Requests\EligibilityRequest;
use Nextvisit\ClaimMD\Requests\FileRequest;
use Nextvisit\ClaimMD\Requests\PayerRequest;
use Nextvisit\ClaimMD\Requests\ResponseRequest;

class ClaimMdGateway implements InsuranceVerificationContract
{
    private Client $client;

    public function __construct()
    {
        $apiKey = $this->resolveApiKey();
        $this->client = new Client($apiKey);
    }

    public function verifyEligibility(array $params): array
    {
        $eligibility = new EligibilityRequest($this->client);

        $dto = new EligibilityDTO(
            insLastName: $params['last_name'],
            insFirstName: $params['first_name'],
            payerId: $params['payer_id'],
            patientRelationship: '18',
            serviceDate: $params['service_date'],
            providerNpi: $params['provider_npi'],
            providerTaxId: $params['provider_tax_id'] ?? '',
            insNumber: $params['member_id'] ?? null,
            insDob: $params['date_of_birth'] ?? null,
            serviceCode: $params['service_type_codes'][0] ?? '30',
        );

        $response = $eligibility->checkEligibilityJSON($dto);

        return [
            'status' => $this->extractPlanStatus($response),
            'plan_details' => $this->extractPlanDetails($response),
            'coverages' => $this->extractCoverages($response),
            'raw_response' => $response,
        ];
    }

    /**
     * Submit a claim to the payer via Claim.MD.
     *
     * @param  array{
     *     claim_data: array,
     *     filename?: string
     * }  $params
     * @return array{claim_md_id: string|null, status: string, messages: array, raw_response: array}
     */
    public function submitClaim(array $params): array
    {
        $fileRequest = new FileRequest($this->client);

        $jsonContent = json_encode($params['claim_data']);
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, $jsonContent);
        rewind($stream);

        $response = $fileRequest->upload($stream, $params['filename'] ?? 'claim_'.now()->format('Ymd_His').'.json');

        fclose($stream);

        $claimMdId = $response['file_id'] ?? $response['FileID'] ?? null;
        $messages = $response['messages'] ?? $response['message'] ?? [];

        return [
            'claim_md_id' => $claimMdId,
            'status' => ! empty($claimMdId) ? 'accepted' : 'rejected',
            'messages' => is_array($messages) ? $messages : [$messages],
            'raw_response' => $response,
        ];
    }

    /**
     * Fetch claim status/responses from Claim.MD.
     *
     * @return array{claims: array, last_response_id: string|null, raw_response: array}
     */
    public function getClaimResponses(string $responseId = '0', ?string $claimId = null): array
    {
        $responseRequest = new ResponseRequest($this->client);
        $response = $responseRequest->fetchResponses($responseId, $claimId);

        $claims = [];
        foreach ($response['claim'] ?? $response['claims'] ?? [] as $claim) {
            $claims[] = [
                'claim_md_id' => $claim['ClaimMD_ID'] ?? $claim['claimmd_id'] ?? null,
                'payer_claim_id' => $claim['PayerClaimID'] ?? $claim['payer_claim_id'] ?? null,
                'status' => $claim['Status'] ?? $claim['status'] ?? null,
                'paid_amount' => isset($claim['PaidAmount']) ? (float) $claim['PaidAmount'] : null,
                'messages' => $claim['messages'] ?? [],
            ];
        }

        return [
            'claims' => $claims,
            'last_response_id' => $response['last_responseid'] ?? null,
            'raw_response' => $response,
        ];
    }

    /**
     * Fetch list of supported payers.
     *
     * @return array<int, array{payer_id: string, payer_name: string}>
     */
    public function getPayerList(?string $payerName = null): array
    {
        $payerRequest = new PayerRequest($this->client);
        $response = $payerRequest->listPayer(payerName: $payerName);

        $payers = [];
        foreach ($response['payer'] ?? $response['payers'] ?? [] as $payer) {
            $payers[] = [
                'payer_id' => $payer['payerid'] ?? $payer['PayerID'] ?? '',
                'payer_name' => $payer['payer_name'] ?? $payer['PayerName'] ?? '',
            ];
        }

        return $payers;
    }

    public function testConnection(): bool
    {
        try {
            $payerRequest = new PayerRequest($this->client);
            $payerRequest->listPayer(payerName: 'Aetna');

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function extractPlanStatus(array $response): string
    {
        $statusCode = $response['elig_status'] ?? $response['status'] ?? null;

        return match ($statusCode) {
            '1', 'active', 'Active' => 'active',
            '6', 'inactive', 'Inactive' => 'inactive',
            default => 'unknown',
        };
    }

    /**
     * @return array{plan_name: string|null, plan_number: string|null, group_number: string|null}
     */
    private function extractPlanDetails(array $response): array
    {
        return [
            'plan_name' => $response['plan_name'] ?? $response['ins_name'] ?? null,
            'plan_number' => $response['plan_number'] ?? $response['policy_number'] ?? null,
            'group_number' => $response['group_number'] ?? $response['group_id'] ?? null,
        ];
    }

    /**
     * @return array{copay: array|null, deductible: array|null, coinsurance: array|null, out_of_pocket_max: array|null}
     */
    private function extractCoverages(array $response): array
    {
        $coverages = [
            'copay' => null,
            'deductible' => null,
            'coinsurance' => null,
            'out_of_pocket_max' => null,
        ];

        foreach ($response['benefits'] ?? $response['benefit'] ?? [] as $benefit) {
            $code = $benefit['code'] ?? $benefit['benefit_code'] ?? '';
            $amount = isset($benefit['amount']) ? (float) $benefit['amount'] : null;
            $percent = isset($benefit['percent']) ? (float) $benefit['percent'] : null;
            $inNetwork = ($benefit['in_network'] ?? $benefit['network'] ?? '') === 'Y';

            match ($code) {
                'B' => $coverages['copay'] = ['amount' => $amount, 'in_network' => $inNetwork],
                'C' => $coverages['deductible'] = ['amount' => $amount, 'in_network' => $inNetwork],
                'A' => $coverages['coinsurance'] = ['percentage' => $percent ? $percent * 100 : null, 'in_network' => $inNetwork],
                'G' => $coverages['out_of_pocket_max'] = ['amount' => $amount, 'in_network' => $inNetwork],
                default => null,
            };
        }

        return $coverages;
    }

    private function resolveApiKey(): string
    {
        $dbConfig = GatewayConfiguration::query()
            ->where('gateway', GatewayType::ClaimMd)
            ->where('is_active', true)
            ->whereNull('clinic_id')
            ->first();

        if ($dbConfig && $dbConfig->getCredential('api_key')) {
            return $dbConfig->getCredential('api_key');
        }

        return config('services.claim_md.api_key') ?? '';
    }
}
