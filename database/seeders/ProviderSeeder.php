<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Clinic;
use App\Models\Provider;
use App\Models\ProviderSchedule;
use App\Models\User;
use Database\Seeders\Concerns\JordanianData;
use Illuminate\Database\Seeder;

class ProviderSeeder extends Seeder
{
    use JordanianData;

    public function run(): void
    {
        $colors = ['#22D3EE', '#A78BFA', '#F472B6'];

        foreach (Clinic::all() as $clinic) {
            $providerUsers = User::where('clinic_id', $clinic->id)
                ->where('role', UserRole::Provider)
                ->get();

            $specialties = $this->jordanianSpecialties;

            foreach ($providerUsers as $i => $user) {
                $nameParts = explode(' ', $user->name);
                $provider = Provider::create([
                    'clinic_id' => $clinic->id,
                    'user_id' => $user->id,
                    'first_name' => $nameParts[0],
                    'last_name' => $nameParts[1] ?? $this->jordanianFamilyNames[array_rand($this->jordanianFamilyNames)],
                    'title' => 'د.',
                    'specialty' => $specialties[$i % count($specialties)],
                    'color' => $colors[$i % count($colors)],
                    'npi_number' => fake()->numerify('##########'),
                    'is_active' => true,
                ]);

                // Jordan's clinic work week: Sunday (0) through Thursday (4).
                foreach ([0, 1, 2, 3, 4] as $day) {
                    ProviderSchedule::create([
                        'provider_id' => $provider->id,
                        'day_of_week' => $day,
                        'start_time' => '09:00',
                        'end_time' => '17:00',
                        'is_available' => true,
                    ]);
                }
            }
        }
    }
}
