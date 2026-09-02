<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\LandingPageContent;
use Illuminate\Database\Seeder;

class LandingPageContentSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Clinic::all() as $clinic) {
            LandingPageContent::updateOrCreate(
                ['clinic_id' => $clinic->id],
                ['content' => LandingPageContent::defaultContent()],
            );
        }
    }
}
