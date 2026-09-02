<?php

namespace Database\Factories;

use App\Enums\InvoiceStatus;
use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Invoice>
 */
class InvoiceFactory extends Factory
{
    public function definition(): array
    {
        $amount = 349.00;
        $tax = 0;

        return [
            'clinic_id' => Clinic::factory(),
            'number' => 'INV-' . fake()->unique()->numerify('####-###'),
            'amount' => $amount,
            'tax' => $tax,
            'total' => $amount + $tax,
            'status' => InvoiceStatus::Paid,
            'period_start' => now()->subMonth()->startOfMonth(),
            'period_end' => now()->subMonth()->endOfMonth(),
            'paid_at' => now()->subMonth()->endOfMonth(),
            'due_at' => now()->subMonth()->endOfMonth()->addDays(15),
        ];
    }
}
