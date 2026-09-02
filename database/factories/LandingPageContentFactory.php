<?php

namespace Database\Factories;

use App\Models\Clinic;
use App\Models\LandingPageContent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LandingPageContent>
 */
class LandingPageContentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'content' => LandingPageContent::defaultContent(),
        ];
    }
}
