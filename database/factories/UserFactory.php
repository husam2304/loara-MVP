<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\Concerns\JordanianData;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    use JordanianData;

    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => $this->randomJordanianName(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'role' => UserRole::Staff,
            'phone' => $this->randomJordanianMobile(),
            'is_active' => true,
            'last_active_at' => fake()->dateTimeBetween('-7 days'),
            'two_factor_enabled' => false,
            'session_timeout_minutes' => 30,
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::SuperAdmin,
            'clinic_id' => null,
        ]);
    }

    public function clinicOwner(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::ClinicOwner,
        ]);
    }

    public function providerRole(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::Provider,
        ]);
    }

    public function billing(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::Billing,
        ]);
    }

    public function customer(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::Customer,
        ]);
    }
}
