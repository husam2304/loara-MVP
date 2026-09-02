<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\ClinicOperatingHour;
use Illuminate\Database\Seeder;

class ClinicSeeder extends Seeder
{
    public function run(): void
    {
        $clinics = [
            [
                'name' => 'مركز عمّان الطبي التخصصي',
                'slug' => 'amman-specialized-medical-center',
                'phone' => '06 552 0180',
                'email' => 'info@ammanmedicalcenter.jo',
                'address' => 'شارع الملكة رانيا، مبنى 24',
                'city' => 'عمّان',
                'state' => 'AM',
                'zip_code' => '11118',
                'latitude' => 31.9632,
                'longitude' => 35.9304,
                'timezone' => 'Asia/Amman',
                'website' => 'https://ammanmedicalcenter.jo',
                'after_hours_ai_enabled' => true,
                'is_publicly_listed' => true,
            ],
            [
                'name' => 'عيادة إربد لطب الأطفال',
                'slug' => 'irbid-pediatric-clinic',
                'phone' => '02 724 5510',
                'email' => 'info@irbidpediatric.jo',
                'address' => 'شارع الجامعة، مقابل الجامعة الأردنية',
                'city' => 'إربد',
                'state' => 'IR',
                'zip_code' => '21110',
                'latitude' => 32.5556,
                'longitude' => 35.8497,
                'timezone' => 'Asia/Amman',
                'website' => 'https://irbidpediatric.jo',
                'after_hours_ai_enabled' => false,
                'is_publicly_listed' => true,
            ],
        ];

        // Jordan's work week runs Sunday-Thursday. Friday is the weekly
        // holiday and Saturday is a shorter half day for clinics that choose
        // to open.
        $hours = [
            ['day_of_week' => 0, 'open_time' => '09:00', 'close_time' => '17:00'],
            ['day_of_week' => 1, 'open_time' => '09:00', 'close_time' => '17:00'],
            ['day_of_week' => 2, 'open_time' => '09:00', 'close_time' => '17:00'],
            ['day_of_week' => 3, 'open_time' => '09:00', 'close_time' => '17:00'],
            ['day_of_week' => 4, 'open_time' => '09:00', 'close_time' => '17:00'],
            ['day_of_week' => 5, 'is_closed' => true],
            ['day_of_week' => 6, 'open_time' => '10:00', 'close_time' => '14:00'],
        ];

        foreach ($clinics as $clinicData) {
            $clinic = Clinic::create($clinicData);

            foreach ($hours as $hour) {
                ClinicOperatingHour::create(
                    array_merge(['clinic_id' => $clinic->id], $hour)
                );
            }
        }
    }
}
