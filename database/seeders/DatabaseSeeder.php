<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            ClinicSeeder::class,
            InsuranceSeeder::class,
            UserSeeder::class,
            ProviderSeeder::class,
            PatientSeeder::class,
            AppointmentSeeder::class,
            CallSeeder::class,
            InsuranceClaimSeeder::class,
            TriageSeeder::class,
            TaskSeeder::class,
            AiConfigurationSeeder::class,
            WorkflowSeeder::class,
            IntegrationSeeder::class,
            PlanConfigurationSeeder::class,
            BillingSeeder::class,
            LandingPageContentSeeder::class,
        ]);
    }
}
