<?php

namespace App\Services;

use App\Enums\UsageType;
use App\Models\Clinic;
use App\Models\UsageRecord;
use Illuminate\Support\Collection;

class UsageService
{
    /**
     * Record usage for a clinic.
     */
    public function record(Clinic $clinic, UsageType $type, float $quantity): UsageRecord
    {
        return UsageRecord::create([
            'clinic_id' => $clinic->id,
            'type' => $type,
            'quantity' => $quantity,
            'recorded_date' => now()->toDateString(),
        ]);
    }

    /**
     * Get total usage for the current billing period.
     */
    public function currentPeriodUsage(Clinic $clinic, UsageType $type): float
    {
        $subscription = $clinic->subscription;

        if (! $subscription) {
            return 0;
        }

        return (float) UsageRecord::where('clinic_id', $clinic->id)
            ->where('type', $type->value)
            ->whereBetween('recorded_date', [
                $subscription->current_period_start,
                $subscription->current_period_end,
            ])
            ->sum('quantity');
    }

    /**
     * Check if a clinic has exceeded its minutes limit.
     */
    public function isMinutesLimitExceeded(Clinic $clinic): bool
    {
        $subscription = $clinic->subscription;

        if (! $subscription) {
            return true;
        }

        $limit = $subscription->minutes_limit;

        // -1 means unlimited
        if ($limit === -1) {
            return false;
        }

        if ($limit === 0) {
            return true;
        }

        $used = $this->currentPeriodUsage($clinic, UsageType::AiCallMinutes);

        return $used >= $limit;
    }

    /**
     * Get the percentage of limit used (0-100+).
     */
    public function usagePercentage(Clinic $clinic, UsageType $type): float
    {
        $subscription = $clinic->subscription;

        if (! $subscription) {
            return 0;
        }

        $limit = match ($type) {
            UsageType::AiCallMinutes => $subscription->minutes_limit,
            default => 0,
        };

        if ($limit <= 0) {
            return $limit === -1 ? 0 : 100;
        }

        $used = $this->currentPeriodUsage($clinic, $type);

        return round(($used / $limit) * 100, 1);
    }

    /**
     * Get remaining minutes for the current period.
     */
    public function remainingMinutes(Clinic $clinic): float
    {
        $subscription = $clinic->subscription;

        if (! $subscription) {
            return 0;
        }

        $limit = $subscription->minutes_limit;

        if ($limit === -1) {
            return -1;
        }

        $used = $this->currentPeriodUsage($clinic, UsageType::AiCallMinutes);

        return max(0, $limit - $used);
    }

    /**
     * Record call minutes from a completed call.
     */
    public function recordCallMinutes(Clinic $clinic, int $durationSeconds): UsageRecord
    {
        $minutes = round($durationSeconds / 60, 2);

        return $this->record($clinic, UsageType::AiCallMinutes, max(0.01, $minutes));
    }

    /**
     * Get usage grouped by day for the current billing period.
     *
     * @return Collection<int, array{date: string, quantity: float}>
     */
    public function dailyUsage(Clinic $clinic, UsageType $type, ?int $days = null): Collection
    {
        $subscription = $clinic->subscription;

        if (! $subscription) {
            return collect();
        }

        $query = UsageRecord::where('clinic_id', $clinic->id)
            ->where('type', $type->value)
            ->selectRaw('recorded_date as date, SUM(quantity) as quantity')
            ->groupBy('recorded_date')
            ->orderBy('recorded_date');

        if ($days) {
            $query->where('recorded_date', '>=', now()->subDays($days)->toDateString());
        } else {
            $query->whereBetween('recorded_date', [
                $subscription->current_period_start,
                $subscription->current_period_end,
            ]);
        }

        return $query->get()->map(fn ($row) => [
            'date' => $row->date,
            'quantity' => (float) $row->quantity,
        ]);
    }
}
