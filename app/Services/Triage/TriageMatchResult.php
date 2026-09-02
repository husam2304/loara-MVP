<?php

namespace App\Services\Triage;

use App\Models\TriageRule;

/**
 * The outcome of matching a single TriageRule against caller-reported
 * symptoms: which rule matched, which keywords triggered it, and how
 * strong (specific) the match was.
 */
final class TriageMatchResult
{
    /**
     * @param  array<int, string>  $matchedKeywords  Distinct keyword strings that matched, in match order.
     * @param  int  $score  Weighted specificity score used to rank rules within the same priority tier.
     */
    public function __construct(
        public readonly TriageRule $rule,
        public readonly array $matchedKeywords,
        public readonly int $score,
    ) {}
}
