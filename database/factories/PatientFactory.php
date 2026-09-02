<?php

namespace Database\Factories;

use App\Enums\Gender;
use App\Enums\PatientSource;
use App\Enums\PatientStatus;
use App\Models\Clinic;
use App\Models\Patient;
use Database\Seeders\Concerns\JordanianData;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Patient>
 */
class PatientFactory extends Factory
{
    use JordanianData;

    public function definition(): array
    {
        $avatarColors = ['#22D3EE', '#A78BFA', '#F472B6', '#34D399', '#FBBF24', '#FB923C', '#EF4444', '#8B5CF6'];
        $gender = fake()->randomElement(Gender::cases());
        $firstName = $gender === Gender::Male
            ? $this->jordanianMaleFirstNames[array_rand($this->jordanianMaleFirstNames)]
            : $this->jordanianFemaleFirstNames[array_rand($this->jordanianFemaleFirstNames)];
        $lastName = $this->jordanianFamilyNames[array_rand($this->jordanianFamilyNames)];
        $governorate = $this->randomGovernorate();

        return [
            'clinic_id' => Clinic::factory(),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'date_of_birth' => fake()->dateTimeBetween('-85 years', '-18 years'),
            'gender' => $gender,
            'phone' => $this->randomJordanianMobile(),
            'email' => fake()->optional(0.8)->safeEmail(),
            'address' => $this->randomJordanianStreetAddress(),
            'city' => $governorate['city'],
            'state' => $governorate['state'],
            'zip_code' => $governorate['zip'],
            'emergency_contact_name' => $this->randomJordanianName(),
            'emergency_contact_phone' => $this->randomJordanianMobile(),
            'preferred_language' => fake()->randomElement(['ar', 'ar', 'ar', 'ar', 'en']),
            'status' => PatientStatus::Active,
            'source' => fake()->randomElement(PatientSource::cases()),
            'avatar_color' => fake()->randomElement($avatarColors),
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PatientStatus::Inactive,
        ]);
    }
}
