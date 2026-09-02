<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Clinic;
use App\Models\NotificationSetting;
use App\Models\User;
use Database\Seeders\Concerns\JordanianData;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    use JordanianData;

    public function run(): void
    {
        // Platform super admin (no clinic)
        $superAdmin = User::factory()->create([
            'name' => 'مدير المنصة',
            'email' => 'hiro@mail.com',
            'role' => UserRole::SuperAdmin,
            'clinic_id' => null,
            'title' => 'مالك المنصة',
            'phone' => $this->randomJordanianMobile(),
            'password' => 'password',
            'is_active' => true,
            'last_active_at' => now()->subMinutes(5),
        ]);

        NotificationSetting::create([
            'user_id' => $superAdmin->id,
            'email_enabled' => true,
            'sms_enabled' => true,
            'push_enabled' => false,
        ]);

        foreach (Clinic::all() as $index => $clinic) {
            $this->seedClinicUsers($clinic, $index === 0);
        }
    }

    private function seedClinicUsers(Clinic $clinic, bool $isPrimary = false): void
    {
        $roles = [
            ['role' => UserRole::ClinicOwner, 'title' => 'مالك العيادة'],
            ['role' => UserRole::Provider, 'title' => 'المدير الطبي'],
            ['role' => UserRole::Provider, 'title' => 'طبيب أسرة'],
            ['role' => UserRole::Provider, 'title' => 'أخصائي باطنية'],
            ['role' => UserRole::Staff, 'title' => 'مدير المكتب'],
            ['role' => UserRole::Staff, 'title' => 'مساعد طبي'],
            ['role' => UserRole::Billing, 'title' => 'أخصائي فوترة'],
            ['role' => UserRole::Customer, 'title' => 'مريض'],
        ];

        foreach ($roles as $member) {
            $attributes = array_merge($member, [
                'clinic_id' => $clinic->id,
                'password' => 'password',
                'is_active' => true,
                'last_active_at' => now()->subMinutes(rand(5, 120)),
            ]);

            // Give the primary demo clinic a deterministic owner login so it can
            // be documented (clinic@mail.com / password).
            if ($isPrimary && $member['role'] === UserRole::ClinicOwner) {
                $attributes['email'] = 'clinic@mail.com';
                $attributes['name'] = 'مالك العيادة';
            }

            $user = User::factory()->create($attributes);

            NotificationSetting::create([
                'user_id' => $user->id,
                'email_enabled' => true,
                'sms_enabled' => true,
                'push_enabled' => false,
            ]);
        }
    }
}
