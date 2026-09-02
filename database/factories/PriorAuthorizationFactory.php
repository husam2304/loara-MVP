<?php

namespace Database\Factories;

use App\Enums\AuthorizationStatus;
use App\Models\Clinic;
use App\Models\InsuranceProvider;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PriorAuthorization>
 */
class PriorAuthorizationFactory extends Factory
{
    public function definition(): array
    {
        $procedures = [
            ['name' => 'MRI Lumbar Spine', 'code' => '72148'],
            ['name' => 'Physical Therapy (12 sessions)', 'code' => '97110'],
            ['name' => 'Cardiac Stress Test', 'code' => '93015'],
            ['name' => 'Dermatology Referral', 'code' => '99243'],
            ['name' => 'CT Scan Abdomen', 'code' => '74177'],
            ['name' => 'Knee Arthroscopy', 'code' => '29881'],
        ];

        $procedure = fake()->randomElement($procedures);
        $status = fake()->randomElement(AuthorizationStatus::cases());

        return [
            'clinic_id' => Clinic::factory(),
            'patient_id' => Patient::factory(),
            'insurance_provider_id' => InsuranceProvider::factory(),
            'authorization_number' => 'AUTH-'.fake()->unique()->numerify('####'),
            'procedure_name' => $procedure['name'],
            'procedure_code' => $procedure['code'],
            'status' => $status,
            'requested_at' => fake()->dateTimeBetween('-30 days', '-1 day'),
            'decided_at' => in_array($status, [AuthorizationStatus::Approved, AuthorizationStatus::Denied]) ? fake()->dateTimeBetween('-15 days') : null,
            'expires_at' => $status === AuthorizationStatus::Approved ? fake()->dateTimeBetween('+30 days', '+90 days') : null,
        ];
    }
}
