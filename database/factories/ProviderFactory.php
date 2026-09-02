<?php

namespace Database\Factories;

use App\Models\Clinic;
use App\Models\Provider;
use Database\Seeders\Concerns\JordanianData;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Provider>
 */
class ProviderFactory extends Factory
{
    use JordanianData;

    public function definition(): array
    {
        $colors = ['#22D3EE', '#A78BFA', '#F472B6', '#34D399', '#FBBF24', '#FB923C'];
        $name = $this->randomJordanianName();
        $nameParts = explode(' ', $name);

        return [
            'clinic_id' => Clinic::factory(),
            'first_name' => $nameParts[0],
            'last_name' => $nameParts[1] ?? $this->jordanianFamilyNames[array_rand($this->jordanianFamilyNames)],
            'title' => 'د.',
            'specialty' => fake()->randomElement($this->jordanianSpecialties),
            'npi_number' => fake()->numerify('##########'),
            'color' => fake()->randomElement($colors),
            'is_active' => true,
        ];
    }
}
