<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\InsuranceProvider;
use Illuminate\Database\Seeder;

class InsuranceSeeder extends Seeder
{
    public function run(): void
    {
        // Real Jordanian insurers and the two large institutional payers
        // (Royal Medical Services and the Civil Health Insurance scheme)
        // that Jordanian clinics commonly bill against, plus a self-pay
        // option for uninsured patients.
        $providers = [
            ['name' => 'شركة القدس للتأمين', 'payer_id' => 'JICO01', 'phone' => '06 465 2222', 'plan_types' => ['ppo', 'hmo']],
            ['name' => 'الشركة الأردنية الفرنسية للتأمين', 'payer_id' => 'JOFICO', 'phone' => '06 462 7010', 'plan_types' => ['ppo', 'hmo']],
            ['name' => 'مجموعة الخليج للتأمين - الأردن', 'payer_id' => 'GIGJO1', 'phone' => '06 552 5100', 'plan_types' => ['ppo', 'hmo', 'epo']],
            ['name' => 'الشركة الأهلية للتأمين', 'payer_id' => 'AHLIA1', 'phone' => '06 462 7126', 'plan_types' => ['ppo', 'hmo']],
            ['name' => 'شركة الاتحاد العربي الدولي للتأمين', 'payer_id' => 'AUIC01', 'phone' => '06 461 6666', 'plan_types' => ['hmo']],
            ['name' => 'الشركة الإسلامية للتأمين', 'payer_id' => 'ISLINS', 'phone' => '06 463 9666', 'plan_types' => ['hmo', 'epo']],
            ['name' => 'الخدمات الطبية الملكية', 'payer_id' => 'RMS001', 'phone' => '06 519 4000', 'plan_types' => ['military']],
            ['name' => 'التأمين الصحي المدني - وزارة الصحة', 'payer_id' => 'CIVHI1', 'phone' => '080022216', 'plan_types' => ['civil']],
            ['name' => 'الضمان الاجتماعي', 'payer_id' => 'SSC001', 'phone' => '06 580 0700', 'plan_types' => ['hmo']],
            ['name' => 'دفع نقدي (بدون تأمين)', 'payer_id' => 'SELFPAY', 'phone' => null, 'plan_types' => ['self_pay']],
        ];

        foreach (Clinic::all() as $clinic) {
            foreach ($providers as $provider) {
                InsuranceProvider::create([
                    'clinic_id' => $clinic->id,
                    'name' => $provider['name'],
                    'payer_id' => $provider['payer_id'],
                    'phone' => $provider['phone'],
                    'email' => strtolower($provider['payer_id']).'@providers.jo',
                    'is_accepted' => true,
                    'plan_types' => $provider['plan_types'],
                ]);
            }
        }
    }
}
