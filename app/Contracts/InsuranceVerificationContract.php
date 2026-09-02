<?php

namespace App\Contracts;

interface InsuranceVerificationContract
{
    /**
     * Verify insurance eligibility for a patient.
     *
     * @param  array{
     *     payer_id: string,
     *     member_id: string,
     *     first_name: string,
     *     last_name: string,
     *     date_of_birth: string,
     *     provider_npi: string,
     *     provider_organization: string,
     *     service_date: string,
     *     service_type_codes: string[]
     * }  $params
     * @return array{
     *     status: string,
     *     plan_details: array<string, mixed>,
     *     coverages: array<string, mixed>,
     *     raw_response: array<string, mixed>
     * }
     */
    public function verifyEligibility(array $params): array;

    /**
     * Test the gateway connection with current credentials.
     */
    public function testConnection(): bool;
}
