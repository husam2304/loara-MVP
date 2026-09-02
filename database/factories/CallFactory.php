<?php

namespace Database\Factories;

use App\Enums\CallDirection;
use App\Enums\CallResolution;
use App\Enums\CallSentiment;
use App\Enums\CallStatus;
use App\Enums\CallType;
use App\Models\Call;
use App\Models\Clinic;
use Database\Seeders\Concerns\JordanianData;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Call>
 */
class CallFactory extends Factory
{
    use JordanianData;

    public function definition(): array
    {
        $startedAt = fake()->dateTimeBetween('-30 days', 'now');
        $durationSeconds = fake()->numberBetween(30, 600);

        $summaries = [
            'اتصال لحجز موعد جديد مع طبيب '.fake()->randomElement($this->jordanianSpecialties).'.',
            'مكالمة تذكير بموعد قادم، أكّد المريض حضوره.',
            'طلب تجديد وصفة دواء، تم تحويل الطلب للطبيب للمراجعة.',
            'استفسار عن قبول شركة التأمين، تم تأكيد التغطية.',
            'استفسار حول فاتورة، تم تحويل المكالمة لقسم الفوترة.',
            'مكالمة متابعة بعد الزيارة، المريض أفاد بتحسن الحالة.',
            'استفسار عام عن مواعيد دوام العيادة.',
        ];

        return [
            'clinic_id' => Clinic::factory(),
            'direction' => fake()->randomElement(CallDirection::cases()),
            'caller_phone' => $this->randomJordanianMobile(),
            'caller_name' => $this->randomJordanianName(),
            'type' => fake()->randomElement(CallType::cases()),
            'status' => CallStatus::Completed,
            'duration_seconds' => $durationSeconds,
            'started_at' => $startedAt,
            'ended_at' => (clone $startedAt)->modify("+{$durationSeconds} seconds"),
            'answered_at' => (clone $startedAt)->modify('+3 seconds'),
            'ai_handled' => true,
            'ai_confidence_score' => fake()->randomFloat(2, 0.70, 0.99),
            'sentiment' => fake()->randomElement(CallSentiment::cases()),
            'language' => 'ar',
            'resolution' => fake()->randomElement(CallResolution::cases()),
            'summary' => fake()->randomElement($summaries),
            'cost' => fake()->randomFloat(4, 0.05, 0.50),
        ];
    }

    public function inbound(): static
    {
        return $this->state(fn (array $attributes) => [
            'direction' => CallDirection::Inbound,
        ]);
    }

    public function outbound(): static
    {
        return $this->state(fn (array $attributes) => [
            'direction' => CallDirection::Outbound,
        ]);
    }

    public function missed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CallStatus::Missed,
            'duration_seconds' => 0,
            'ended_at' => null,
            'answered_at' => null,
            'ai_handled' => false,
            'resolution' => null,
        ]);
    }
}
