<?php

namespace Database\Seeders;

use App\Enums\AllergySeverity;
use App\Enums\Gender;
use App\Enums\InsurancePlanType;
use App\Enums\PatientSource;
use App\Enums\PatientStatus;
use App\Models\Clinic;
use App\Models\InsuranceProvider;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientInsurance;
use App\Models\PatientMedication;
use App\Models\PatientVital;
use App\Models\Provider;
use Database\Seeders\Concerns\JordanianData;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;

class PatientSeeder extends Seeder
{
    use JordanianData;

    public function run(): void
    {
        foreach (Clinic::all() as $clinic) {
            $this->seedClinicPatients($clinic);
        }
    }

    private function seedClinicPatients(Clinic $clinic): void
    {
        $providers = Provider::where('clinic_id', $clinic->id)->get();
        $insuranceProviders = InsuranceProvider::where('clinic_id', $clinic->id)->get();

        $patients = [
            ['first_name' => 'محمد', 'last_name' => 'العجارمة', 'dob' => '1958-03-15', 'gender' => Gender::Male, 'phone' => $this->randomJordanianMobile(), 'email' => 'mohammad.ajarmeh@gmail.com'],
            ['first_name' => 'نورا', 'last_name' => 'الخطيب', 'dob' => '1975-07-22', 'gender' => Gender::Female, 'phone' => $this->randomJordanianMobile(), 'email' => 'noura.khatib@gmail.com'],
            ['first_name' => 'يزن', 'last_name' => 'الزعبي', 'dob' => '1990-11-08', 'gender' => Gender::Male, 'phone' => $this->randomJordanianMobile(), 'email' => 'yazan.zoubi@gmail.com'],
            ['first_name' => 'سارة', 'last_name' => 'العياصرة', 'dob' => '1982-05-30', 'gender' => Gender::Female, 'phone' => $this->randomJordanianMobile(), 'email' => 'sara.ayasrah@gmail.com'],
            ['first_name' => 'أحمد', 'last_name' => 'الرواشدة', 'dob' => '1967-01-18', 'gender' => Gender::Male, 'phone' => $this->randomJordanianMobile(), 'email' => 'ahmad.rawashdeh@gmail.com'],
            ['first_name' => 'ليان', 'last_name' => 'الشرايري', 'dob' => '1995-09-12', 'gender' => Gender::Female, 'phone' => $this->randomJordanianMobile(), 'email' => 'layan.sharayri@gmail.com'],
        ];

        $colors = ['#22D3EE', '#A78BFA', '#F472B6', '#34D399', '#FBBF24', '#FB923C'];

        foreach ($patients as $i => $data) {
            $governorate = $this->randomGovernorate();

            $patient = Patient::create([
                'clinic_id' => $clinic->id,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'date_of_birth' => $data['dob'],
                'gender' => $data['gender'],
                'phone' => $data['phone'],
                'email' => $data['email'],
                'address' => $this->randomJordanianStreetAddress(),
                'city' => $governorate['city'],
                'state' => $governorate['state'],
                'zip_code' => $governorate['zip'],
                'emergency_contact_name' => $this->randomJordanianName(),
                'emergency_contact_phone' => $this->randomJordanianMobile(),
                'preferred_language' => 'ar',
                'preferred_provider_id' => $providers->random()->id,
                'status' => PatientStatus::Active,
                'source' => fake()->randomElement(PatientSource::cases()),
                'avatar_color' => $colors[$i],
            ]);

            $this->seedAllergies($patient);
            $this->seedMedications($patient, $providers);
            $this->seedVitals($patient);
            $this->seedInsurance($patient, $insuranceProviders);
        }

        Patient::factory(14)->create([
            'clinic_id' => $clinic->id,
            'preferred_provider_id' => fn () => $providers->random()->id,
        ])->each(function (Patient $patient) use ($providers, $insuranceProviders) {
            $this->seedAllergies($patient);
            $this->seedMedications($patient, $providers);
            $this->seedVitals($patient);
            $this->seedInsurance($patient, $insuranceProviders);
        });
    }

    private function seedAllergies(Patient $patient): void
    {
        $allergies = ['Penicillin', 'Sulfa Drugs', 'Aspirin', 'Latex', 'Codeine', 'NSAIDs', 'Iodine'];
        $count = fake()->numberBetween(0, 3);

        $selected = fake()->randomElements($allergies, $count);
        foreach ($selected as $allergen) {
            PatientAllergy::create([
                'patient_id' => $patient->id,
                'allergen' => $allergen,
                'severity' => fake()->randomElement(AllergySeverity::cases()),
                'reaction' => fake()->randomElement(['Rash', 'Hives', 'Swelling', 'Anaphylaxis', 'Nausea', 'Difficulty breathing']),
            ]);
        }
    }

    /**
     * @param  Collection<int, Provider>  $providers
     */
    private function seedMedications(Patient $patient, $providers): void
    {
        $medications = [
            ['name' => 'Lisinopril', 'dosage' => '10mg', 'frequency' => 'Once daily'],
            ['name' => 'Metformin', 'dosage' => '500mg', 'frequency' => 'Twice daily'],
            ['name' => 'Atorvastatin', 'dosage' => '20mg', 'frequency' => 'Once daily at bedtime'],
            ['name' => 'Omeprazole', 'dosage' => '20mg', 'frequency' => 'Once daily before breakfast'],
            ['name' => 'Amlodipine', 'dosage' => '5mg', 'frequency' => 'Once daily'],
            ['name' => 'Levothyroxine', 'dosage' => '50mcg', 'frequency' => 'Once daily on empty stomach'],
        ];

        $count = fake()->numberBetween(1, 4);
        $selected = fake()->randomElements($medications, $count);

        foreach ($selected as $med) {
            PatientMedication::create([
                'patient_id' => $patient->id,
                'medication_name' => $med['name'],
                'dosage' => $med['dosage'],
                'frequency' => $med['frequency'],
                'prescribing_provider_id' => $providers->random()->id,
                'start_date' => fake()->dateTimeBetween('-2 years', '-30 days'),
                'refill_date' => fake()->dateTimeBetween('now', '+90 days'),
                'is_active' => true,
            ]);
        }
    }

    private function seedVitals(Patient $patient): void
    {
        PatientVital::create([
            'patient_id' => $patient->id,
            'heart_rate' => fake()->numberBetween(60, 100),
            'blood_pressure_systolic' => fake()->numberBetween(110, 140),
            'blood_pressure_diastolic' => fake()->numberBetween(65, 90),
            'temperature' => fake()->randomFloat(1, 97.0, 99.5),
            'weight' => fake()->randomFloat(1, 110, 250),
            'height' => fake()->randomFloat(1, 60, 76),
            'oxygen_saturation' => fake()->numberBetween(95, 100),
            'respiratory_rate' => fake()->numberBetween(12, 20),
            'recorded_at' => fake()->dateTimeBetween('-30 days'),
        ]);
    }

    /**
     * @param  Collection<int, InsuranceProvider>  $insuranceProviders
     */
    private function seedInsurance(Patient $patient, $insuranceProviders): void
    {
        if ($insuranceProviders->isEmpty()) {
            return;
        }

        PatientInsurance::create([
            'patient_id' => $patient->id,
            'insurance_provider_id' => $insuranceProviders->random()->id,
            'member_id' => strtoupper(fake()->bothify('???######')),
            'group_number' => strtoupper(fake()->bothify('GRP-####')),
            'plan_type' => fake()->randomElement([InsurancePlanType::Ppo, InsurancePlanType::Hmo]),
            'copay_amount' => fake()->randomElement([25.00, 30.00, 40.00, 50.00]),
            'is_primary' => true,
            'effective_date' => now()->startOfYear(),
            'expiration_date' => now()->endOfYear(),
        ]);
    }
}
