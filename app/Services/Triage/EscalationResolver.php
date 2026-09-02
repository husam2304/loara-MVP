<?php

namespace App\Services\Triage;

use App\Enums\TaskStatus;
use App\Enums\UserRole;
use App\Models\Clinic;
use App\Models\EscalationPath;
use App\Models\TriageRule;
use App\Models\User;

/**
 * Turns a matched TriageRule into a concrete, currently-active staff member
 * to route the call/task to — the piece that was previously missing: rules
 * stored target_role/target_user_id, but nothing ever read them.
 *
 * Resolution order:
 *   1. rule.target_user_id, if that user is still active and in this clinic.
 *   2. rule.target_role, mapped via config('triage.role_map') to real
 *      UserRole values, picking the active clinic user with the fewest
 *      open tasks (simple load balancing).
 *   3. The clinic's EscalationPath ladder, walked in level order, using
 *      each level's target_role the same way — this is the actual runtime
 *      use of escalation_paths that was missing entirely before.
 *
 * If nothing resolves, the top-level escalation path (if any) is still
 * returned so callers can log/display where the case *should* have gone,
 * rather than silently losing the escalation.
 */
class EscalationResolver
{
    public function resolve(Clinic $clinic, TriageRule $rule): EscalationResolution
    {
        if ($rule->target_user_id) {
            $explicitUser = User::query()
                ->where('id', $rule->target_user_id)
                ->where('clinic_id', $clinic->id)
                ->where('is_active', true)
                ->first();

            if ($explicitUser) {
                return new EscalationResolution($explicitUser, null);
            }
        }

        $roleUser = $this->findUserForRole($clinic, $rule->target_role);

        if ($roleUser) {
            return new EscalationResolution($roleUser, null);
        }

        $paths = EscalationPath::query()
            ->where('clinic_id', $clinic->id)
            ->where('is_active', true)
            ->orderBy('level')
            ->get();

        foreach ($paths as $path) {
            $pathUser = $this->findUserForRole($clinic, $path->target_role);

            if ($pathUser) {
                return new EscalationResolution($pathUser, $path);
            }
        }

        return new EscalationResolution(null, $paths->first());
    }

    /**
     * @return array<int, UserRole>|null
     */
    private function rolesFor(?string $targetRole): ?array
    {
        if (! $targetRole) {
            return null;
        }

        $map = config('triage.role_map', []);

        return $map[mb_strtolower($targetRole)] ?? null;
    }

    private function findUserForRole(Clinic $clinic, ?string $targetRole): ?User
    {
        $roles = $this->rolesFor($targetRole);

        if (! $roles) {
            return null;
        }

        // Prefer whoever currently has the fewest open tasks, for a basic
        // fair-share distribution instead of always hammering the same user.
        return User::query()
            ->where('clinic_id', $clinic->id)
            ->where('is_active', true)
            ->whereIn('role', $roles)
            ->withCount(['assignedTasks as open_task_count' => function ($query) {
                $query->whereIn('status', [TaskStatus::Pending->value, TaskStatus::InProgress->value]);
            }])
            ->orderBy('open_task_count')
            ->orderBy('id')
            ->first();
    }
}
