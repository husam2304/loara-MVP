<?php

namespace App\Services\Triage;

use App\Enums\TriagePriority;
use App\Models\TriageRule;
use Illuminate\Support\Collection;

/**
 * Matches caller-reported symptom text against a clinic's active triage
 * rules and picks the single best match.
 *
 * This replaces plain "first rule whose keyword appears anywhere in the
 * text wins" matching with a small declarative rules engine:
 *
 *  - `conditions.keywords` / `conditions.any_keywords` — matches if ANY of
 *    these phrases appear (this is the legacy shape existing rules already
 *    use, kept for backward compatibility).
 *  - `conditions.all_keywords` — the rule only matches if EVERY phrase in
 *    this group appears (lets a rule require e.g. both "chest" and "pain").
 *  - `conditions.exclude_keywords` — if ANY of these phrases appear, the
 *    rule never matches, even if other conditions are satisfied (lets a
 *    rule avoid over-triggering on unrelated phrases).
 *  - `conditions.min_keyword_matches` — minimum number of distinct matched
 *    keywords required for the rule to match (default 1).
 *
 * Every TriageKeyword row attached to the rule is also checked and
 * contributes to a weighted specificity score (config('triage.keyword_weights')),
 * based on its category. Free-text conditions keywords always contribute a
 * flat weight of 1, since they carry no category.
 *
 * Rules are first grouped by priority tier (critical > high > medium > low):
 * the highest tier with at least one match wins. Within that tier, the rule
 * with the highest score wins — i.e. the more specific match, not simply
 * whichever rule happened to be checked first.
 */
class TriageMatchEngine
{
    /**
     * Evaluate $rules (expected: active rules for one clinic, eager-loaded
     * with `keywords`) against $symptoms and return the single best match,
     * or null if no rule matches.
     */
    public function evaluate(Collection $rules, string $symptoms): ?TriageMatchResult
    {
        $symptomsLower = mb_strtolower(trim($symptoms));

        if ($symptomsLower === '') {
            return null;
        }

        $best = null;
        $bestPriorityRank = null;

        foreach ($rules as $rule) {
            $result = $this->evaluateRule($rule, $symptomsLower);

            if ($result === null) {
                continue;
            }

            $priorityRank = self::priorityRank($rule->priority);

            $isBetter = $best === null
                || $priorityRank < $bestPriorityRank
                || ($priorityRank === $bestPriorityRank && $result->score > $best->score);

            if ($isBetter) {
                $best = $result;
                $bestPriorityRank = $priorityRank;
            }
        }

        return $best;
    }

    private function evaluateRule(TriageRule $rule, string $symptomsLower): ?TriageMatchResult
    {
        $conditions = $rule->conditions ?? [];

        $anyKeywords = $conditions['any_keywords'] ?? $conditions['keywords'] ?? [];
        $allKeywords = $conditions['all_keywords'] ?? [];
        $excludeKeywords = $conditions['exclude_keywords'] ?? [];
        $minMatches = max(1, (int) ($conditions['min_keyword_matches'] ?? 1));

        // Exclusion keywords short-circuit the whole rule regardless of
        // anything else matching, so check them first.
        foreach ($excludeKeywords as $excluded) {
            if ($excluded !== '' && str_contains($symptomsLower, mb_strtolower((string) $excluded))) {
                return null;
            }
        }

        $matched = [];
        $score = 0;
        $weights = config('triage.keyword_weights', []);

        // Structured TriageKeyword rows carry a category weight.
        foreach ($rule->keywords as $keywordRow) {
            if (str_contains($symptomsLower, mb_strtolower($keywordRow->keyword))) {
                if (! isset($matched[$keywordRow->keyword])) {
                    $score += $weights[$keywordRow->category->value] ?? 1;
                }
                $matched[$keywordRow->keyword] = true;
            }
        }

        // Free-text "any of these" keywords from the conditions JSON.
        foreach ($anyKeywords as $keyword) {
            if ($keyword !== '' && str_contains($symptomsLower, mb_strtolower((string) $keyword))) {
                if (! isset($matched[$keyword])) {
                    $score += 1;
                }
                $matched[$keyword] = true;
            }
        }

        // "All of these" required group — every phrase must be present, or
        // the rule does not match at all.
        if (! empty($allKeywords)) {
            foreach ($allKeywords as $keyword) {
                if ($keyword === '' || ! str_contains($symptomsLower, mb_strtolower((string) $keyword))) {
                    return null;
                }

                if (! isset($matched[$keyword])) {
                    $score += 1;
                }
                $matched[$keyword] = true;
            }

            // Fully satisfying a required-all group is a strong, specific
            // signal — reward it above simply matching the same count of
            // "any" keywords.
            $score += 2;
        }

        if (empty($matched) || count($matched) < $minMatches) {
            return null;
        }

        return new TriageMatchResult($rule, array_keys($matched), $score);
    }

    private static function priorityRank(TriagePriority $priority): int
    {
        return match ($priority) {
            TriagePriority::Critical => 1,
            TriagePriority::High => 2,
            TriagePriority::Medium => 3,
            TriagePriority::Low => 4,
        };
    }
}
