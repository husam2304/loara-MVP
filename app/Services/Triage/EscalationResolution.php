<?php

namespace App\Services\Triage;

use App\Models\EscalationPath;
use App\Models\User;

/**
 * The outcome of resolving who a matched triage rule should be routed to.
 *
 * $assignee is null when no active user could be found for the rule's
 * target — the caller should still record $escalationPath (if any) so the
 * gap is visible instead of silently dropping the escalation.
 */
final class EscalationResolution
{
    public function __construct(
        public readonly ?User $assignee,
        public readonly ?EscalationPath $escalationPath,
    ) {}
}
