<?php

namespace App\Services\Gateways;

use App\Contracts\InsuranceVerificationContract;
use App\Enums\GatewayType;
use App\Models\GatewayConfiguration;
use Illuminate\Support\Facades\Http;

class StediGateway implements InsuranceVerificationContract
{
    private string $apiKey;

    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = $this->resolveCredential('api_key', 'services.stedi.api_key');
        $this->baseUrl = config('services.stedi.base_url', 'https://healthcare.stedi.com');
    }

    public function verifyEligibility(array $params): array
    {
        $response = Http::withHeaders([
            'Authorization' => "Key {$this->apiKey}",
            'Content-Type' => 'application/json',
        ])
            ->timeout(30)
            ->post("{$this->baseUrl}/2024-04-01/change/medicalnetwork/eligibility/v3", [
                'controlNumber' => (string) random_int(100000000, 999999999),
                'tradingPartnerServiceId' => $params['payer_id'],
                'provider' => [
                    'organizationName' => $params['provider_organization'] ?? '',
                    'npi' => $params['provider_npi'],
                ],
                'subscriber' => [
                    'memberId' => $params['member_id'],
                    'firstName' => $params['first_name'],
                    'lastName' => $params['last_name'],
                    'dateOfBirth' => $params['date_of_birth'],
                ],
                'encounter' => [
                    'serviceTypeCodes' => $params['service_type_codes'],
                    'dateRange' => [
                        'startDate' => $params['service_date'],
                        'endDate' => $params['service_date'],
                    ],
                ],
            ]);

        $response->throw();

        $body = $response->json();

        return [
            'status' => $this->extractPlanStatus($body),
            'plan_details' => $this->extractPlanDetails($body),
            'coverages' => $this->extractCoverages($body),
            'raw_response' => $body,
        ];
    }

    public function testConnection(): bool
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => "Key {$this->apiKey}",
            ])->timeout(10)->get("{$this->baseUrl}/2024-04-01/change/medicalnetwork/eligibility/v3/health");

            return $response->successful();
        } catch (\Exception) {
            return false;
        }
    }

    private function extractPlanStatus(array $body): string
    {
        foreach ($body['planStatus'] ?? [] as $status) {
            if (($status['statusCode'] ?? '') === '1') {
                return 'active';
            }
            if (($status['statusCode'] ?? '') === '6') {
                return 'inactive';
            }
        }

        return 'unknown';
    }

    /**
     * @return array{plan_name: string|null, plan_number: string|null, group_number: string|null}
     */
    private function extractPlanDetails(array $body): array
    {
        return [
            'plan_name' => $body['planInformation']['planName'] ?? null,
            'plan_number' => $body['planInformation']['planNumber'] ?? null,
            'group_number' => $body['planInformation']['groupNumber'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function extractCoverages(array $body): array
    {
        $coverages = [
            'copay' => null,
            'deductible' => null,
            'coinsurance' => null,
            'out_of_pocket_max' => null,
        ];

        foreach ($body['benefitsInformation'] ?? [] as $benefit) {
            $code = $benefit['code'] ?? '';
            $amount = isset($benefit['benefitAmount']) ? (float) $benefit['benefitAmount'] : null;
            $percent = isset($benefit['benefitPercent']) ? (float) $benefit['benefitPercent'] : null;
            $inNetwork = ($benefit['inPlanNetworkIndicatorCode'] ?? '') === 'Y';
            $level = $benefit['coverageLevelCode'] ?? 'IND';

            match ($code) {
                'B' => $this->mergeCopay($coverages['copay'], $amount, $inNetwork),
                'C' => $this->mergeDeductible($coverages['deductible'], $amount, $level, $inNetwork),
                'A' => $this->mergeCoinsurance($coverages['coinsurance'], $percent, $inNetwork),
                'G' => $this->mergeOutOfPocket($coverages['out_of_pocket_max'], $amount, $level, $inNetwork),
                default => null,
            };
        }

        return $coverages;
    }

    private function mergeCopay(?array &$copay, ?float $amount, bool $inNetwork): void
    {
        $copay ??= [];
        if ($inNetwork) {
            $copay['amount'] = $amount;
            $copay['in_network'] = true;
        } elseif (! isset($copay['amount'])) {
            $copay['amount'] = $amount;
            $copay['in_network'] = false;
        }
    }

    private function mergeCoinsurance(?array &$coinsurance, ?float $percent, bool $inNetwork): void
    {
        $coinsurance ??= [];
        $percentage = $percent ? $percent * 100 : null;
        if ($inNetwork) {
            $coinsurance['percentage'] = $percentage;
            $coinsurance['in_network'] = true;
        } elseif (! isset($coinsurance['percentage'])) {
            $coinsurance['percentage'] = $percentage;
            $coinsurance['in_network'] = false;
        }
    }

    private function mergeDeductible(?array &$deductible, ?float $amount, string $level, bool $inNetwork): void
    {
        $deductible ??= [];
        $key = $level === 'FAM' ? 'family' : 'individual';
        $deductible[$key] = $amount;
        $deductible['in_network'] = $inNetwork;
    }

    private function mergeOutOfPocket(?array &$oop, ?float $amount, string $level, bool $inNetwork): void
    {
        $oop ??= [];
        $key = $level === 'FAM' ? 'family' : 'individual';
        $oop[$key] = $amount;
        $oop['in_network'] = $inNetwork;
    }

    private function resolveCredential(string $credentialKey, string $configKey): string
    {
        $dbConfig = GatewayConfiguration::query()
            ->where('gateway', GatewayType::Stedi)
            ->where('is_active', true)
            ->whereNull('clinic_id')
            ->first();

        if ($dbConfig && $dbConfig->getCredential($credentialKey)) {
            return $dbConfig->getCredential($credentialKey);
        }

        return config($configKey) ?? '';
    }
}
