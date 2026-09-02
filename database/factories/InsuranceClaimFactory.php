<?php

namespace Database\Factories;

use App\Enums\ClaimStatus;
use App\Models\Clinic;
use App\Models\InsuranceProvider;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\InsuranceClaim>
 */
class InsuranceClaimFactory extends Factory
{
    public function definition(): array
    {
        $amount = fake()->randomFloat(2, 50, 2500);
        $status = fake()->randomElement(ClaimStatus::cases());

        return [
            'clinic_id' => Clinic::factory(),
            'patient_id' => Patient::factory(),
            'insurance_provider_id' => InsuranceProvider::factory(),
            'claim_number' => 'CLM-' . fake()->unique()->numerify('######'),
            'amount' => $amount,
            'approved_amount' => $status === ClaimStatus::Approved ? $amount : null,
            'status' => $status,
            'submitted_at' => fake()->dateTimeBetween('-60 days', '-1 day'),
            'resolved_at' => in_array($status, [ClaimStatus::Approved, ClaimStatus::Denied]) ? fake()->dateTimeBetween('-30 days') : null,
        ];
    }
}
