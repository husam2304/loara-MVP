<?php

namespace Database\Factories;

use App\Models\Clinic;
use Database\Seeders\Concerns\JordanianData;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Clinic>
 */
class ClinicFactory extends Factory
{
    use JordanianData;

    public function definition(): array
    {
        $governorate = $this->randomGovernorate();

        return [
            'name' => 'مركز '.$governorate['city'].' الطبي',
            'phone' => '06 '.fake()->numerify('### ####'),
            'email' => fake()->unique()->companyEmail(),
            'address' => $this->randomJordanianStreetAddress(),
            'city' => $governorate['city'],
            'state' => $governorate['state'],
            'zip_code' => $governorate['zip'],
            'timezone' => 'Asia/Amman',
            'after_hours_ai_enabled' => true,
        ];
    }
}
