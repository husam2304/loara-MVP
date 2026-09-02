<?php

namespace Database\Seeders;

use App\Enums\IntegrationProvider;
use App\Enums\IntegrationStatus;
use App\Models\Clinic;
use App\Models\Integration;
use Illuminate\Database\Seeder;

class IntegrationSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Clinic::all() as $clinic) {
            $this->seedClinicIntegrations($clinic);
        }
    }

    private function seedClinicIntegrations(Clinic $clinic): void
    {
        $integrations = [
            [
                'provider' => IntegrationProvider::Epic,
                'name' => 'Epic EMR',
                'status' => IntegrationStatus::Connected,
                'last_synced_at' => now()->subMinutes(15),
            ],
            [
                'provider' => IntegrationProvider::TwilioVoice,
                'name' => 'Twilio Voice',
                'status' => IntegrationStatus::Connected,
                'last_synced_at' => now()->subMinutes(2),
            ],
            [
                'provider' => IntegrationProvider::GoogleCalendar,
                'name' => 'Google Calendar',
                'status' => IntegrationStatus::Connected,
                'last_synced_at' => now()->subHours(1),
            ],
            [
                'provider' => IntegrationProvider::Stripe,
                'name' => 'Stripe Billing',
                'status' => IntegrationStatus::SetupRequired,
            ],
            [
                'provider' => IntegrationProvider::Sendgrid,
                'name' => 'SendGrid Email',
                'status' => IntegrationStatus::Connected,
                'last_synced_at' => now()->subMinutes(30),
            ],
            [
                'provider' => IntegrationProvider::TwilioSms,
                'name' => 'Twilio SMS',
                'status' => IntegrationStatus::Connected,
                'last_synced_at' => now()->subMinutes(5),
            ],
        ];

        foreach ($integrations as $integration) {
            Integration::create(array_merge($integration, [
                'clinic_id' => $clinic->id,
            ]));
        }
    }
}
