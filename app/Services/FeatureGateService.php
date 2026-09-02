<?php

namespace App\Services;

use App\Enums\CallStatus;
use App\Models\Call;
use App\Models\Clinic;
use App\Models\Provider;

class FeatureGateService
{
    /** @var array<int, array<string>> */
    private array $featuresCache = [];

    /**
     * Check if a clinic's subscription plan includes a specific feature.
     */
    public function clinicHasFeature(Clinic $clinic, string $feature): bool
    {
        return in_array($feature, $this->getClinicFeatures($clinic));
    }

    /**
     * Check if a clinic's plan includes ALL of the given features.
     *
     * @param  array<string>  $features
     */
    public function clinicHasAllFeatures(Clinic $clinic, array $features): bool
    {
        $clinicFeatures = $this->getClinicFeatures($clinic);

        foreach ($features as $feature) {
            if (! in_array($feature, $clinicFeatures)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if a clinic's plan includes ANY of the given features.
     *
     * @param  array<string>  $features
     */
    public function clinicHasAnyFeature(Clinic $clinic, array $features): bool
    {
        $clinicFeatures = $this->getClinicFeatures($clinic);

        foreach ($features as $feature) {
            if (in_array($feature, $clinicFeatures)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the list of features available for a clinic's plan.
     *
     * @return array<string>
     */
    public function getClinicFeatures(Clinic $clinic): array
    {
        if (isset($this->featuresCache[$clinic->id])) {
            return $this->featuresCache[$clinic->id];
        }

        $subscription = $clinic->subscription;

        if (! $subscription) {
            return $this->featuresCache[$clinic->id] = [];
        }

        return $this->featuresCache[$clinic->id] = $subscription->planConfig()['features'] ?? [];
    }

    /**
     * Check if a clinic has reached its concurrent call limit.
     */
    public function isConcurrentLimitExceeded(Clinic $clinic): bool
    {
        $subscription = $clinic->subscription;

        if (! $subscription) {
            return true;
        }

        $limit = $subscription->concurrent_limit;

        // -1 means unlimited
        if ($limit === -1) {
            return false;
        }

        $activeCalls = Call::where('clinic_id', $clinic->id)
            ->whereIn('status', [CallStatus::InProgress, CallStatus::Ringing, CallStatus::Queued])
            ->count();

        return $activeCalls >= $limit;
    }

    /**
     * Check if a clinic has reached its team member limit.
     */
    public function isTeamMemberLimitExceeded(Clinic $clinic): bool
    {
        $subscription = $clinic->subscription;

        if (! $subscription) {
            return true;
        }

        $limit = $subscription->team_member_limit;

        // -1 means unlimited
        if ($limit === -1) {
            return false;
        }

        $currentCount = Provider::where('clinic_id', $clinic->id)->count();

        return $currentCount >= $limit;
    }
}
