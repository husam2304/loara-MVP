<?php

namespace Database\Factories;

use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\InsuranceProvider>
 */
class InsuranceProviderFactory extends Factory
{
    public function definition(): array
    {
        $providers = ['Blue Cross Blue Shield', 'Aetna', 'UnitedHealthcare', 'Cigna', 'Humana', 'Kaiser Permanente', 'Anthem', 'Centene'];

        return [
            'clinic_id' => Clinic::factory(),
            'name' => fake()->randomElement($providers),
            'payer_id' => fake()->numerify('#####'),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->companyEmail(),
            'website' => fake()->url(),
            'is_accepted' => true,
            'plan_types' => ['ppo', 'hmo'],
        ];
    }
}
