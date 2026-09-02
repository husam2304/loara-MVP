<?php

namespace Database\Seeders;

use App\Enums\AuthorizationStatus;
use App\Enums\ClaimStatus;
use App\Models\Clinic;
use App\Models\InsuranceClaim;
use App\Models\InsuranceProvider;
use App\Models\Patient;
use App\Models\PriorAuthorization;
use Illuminate\Database\Seeder;

class InsuranceClaimSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Clinic::all() as $clinic) {
            $this->seedClinicClaims($clinic);
        }
    }

    private function seedClinicClaims(Clinic $clinic): void
    {
        $patients = Patient::where('clinic_id', $clinic->id)->get();
        $insuranceProviders = InsuranceProvider::where('clinic_id', $clinic->id)->get();

        if ($insuranceProviders->isEmpty()) {
            return;
        }

        $claimStatuses = [ClaimStatus::Approved, ClaimStatus::Approved, ClaimStatus::Pending, ClaimStatus::InReview, ClaimStatus::Denied, ClaimStatus::Approved, ClaimStatus::Pending, ClaimStatus::Appealed];

        for ($i = 0; $i < 8; $i++) {
            $amount = fake()->randomFloat(2, 75, 2200);
            $status = $claimStatuses[$i];

            InsuranceClaim::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patients->random()->id,
                'insurance_provider_id' => $insuranceProviders->random()->id,
                'claim_number' => 'CLM-'.$clinic->id.'-'.str_pad($i + 1, 6, '0', STR_PAD_LEFT),
                'amount' => $amount,
                'approved_amount' => $status === ClaimStatus::Approved ? $amount : null,
                'status' => $status,
                'submitted_at' => fake()->dateTimeBetween('-60 days', '-5 days'),
                'resolved_at' => in_array($status, [ClaimStatus::Approved, ClaimStatus::Denied]) ? fake()->dateTimeBetween('-30 days') : null,
            ]);
        }

        $procedures = [
            ['name' => 'رنين مغناطيسي لأسفل الظهر', 'code' => '72148'],
            ['name' => 'علاج طبيعي (12 جلسة)', 'code' => '97110'],
            ['name' => 'تنظير القولون', 'code' => '45378'],
            ['name' => 'اختبار جهد القلب', 'code' => '93015'],
        ];
        $authStatuses = [AuthorizationStatus::Pending, AuthorizationStatus::Approved, AuthorizationStatus::Denied, AuthorizationStatus::Approved];

        for ($i = 0; $i < 4; $i++) {
            PriorAuthorization::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patients->random()->id,
                'insurance_provider_id' => $insuranceProviders->random()->id,
                'authorization_number' => 'PA-'.$clinic->id.'-'.str_pad($i + 1, 6, '0', STR_PAD_LEFT),
                'procedure_name' => $procedures[$i]['name'],
                'procedure_code' => $procedures[$i]['code'],
                'status' => $authStatuses[$i],
                'requested_at' => fake()->dateTimeBetween('-30 days', '-5 days'),
                'decided_at' => $authStatuses[$i] !== AuthorizationStatus::Pending ? fake()->dateTimeBetween('-5 days') : null,
                'expires_at' => $authStatuses[$i] === AuthorizationStatus::Approved ? now()->addMonths(3) : null,
            ]);
        }
    }
}
