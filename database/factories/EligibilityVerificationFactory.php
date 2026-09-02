<?php

namespace Database\Factories;

use App\Enums\EligibilityVerificationStatus;
use App\Models\Clinic;
use App\Models\InsuranceProvider;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EligibilityVerification>
 */
class EligibilityVerificationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'patient_id' => Patient::factory(),
            'patient_insurance_id' => 1,
            'insurance_provider_id' => InsuranceProvider::factory(),
            'status' => EligibilityVerificationStatus::Active,
            'payer_id' => fake()->numerify('#####'),
            'member_id' => 'MEM'.fake()->numerify('######'),
            'service_date' => now()->addDays(fake()->numberBetween(1, 30)),
            'service_type_codes' => ['30'],
            'plan_details' => [
                'plan_name' => 'Gold PPO Plan',
                'plan_number' => 'PLN'.fake()->numerify('###'),
                'group_number' => 'GRP'.fake()->numerify('###'),
            ],
            'coverages' => [
                'copay' => ['amount' => 30, 'in_network' => true],
                'deductible' => ['individual' => 1500, 'family' => 3000, 'in_network' => true],
                'coinsurance' => ['percentage' => 20, 'in_network' => true],
                'out_of_pocket_max' => ['individual' => 6000, 'family' => 12000, 'in_network' => true],
            ],
        ];
    }

    public function inactive(): static
    {
        return $this->state([
            'status' => EligibilityVerificationStatus::Inactive,
        ]);
    }

    public function error(): static
    {
        return $this->state([
            'status' => EligibilityVerificationStatus::Error,
            'error_message' => 'Unable to connect to payer.',
            'coverages' => null,
            'plan_details' => null,
        ]);
    }
}
