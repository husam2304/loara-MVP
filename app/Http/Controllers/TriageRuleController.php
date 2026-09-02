<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\StoreTriageRuleRequest;
use App\Http\Requests\UpdateTriageRuleRequest;
use App\Models\EscalationPath;
use App\Models\TriageKeyword;
use App\Models\TriageRule;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class TriageRuleController extends Controller
{
    public function index(): Response
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic) {
            return Inertia::render('TriageRules', [
                'rules' => collect(),
                'escalationPaths' => collect(),
                'keywords' => collect(),
                'staff' => collect(),
                'stats' => [
                    'activeRuleCount' => 0,
                    'totalRuleCount' => 0,
                    'escalationPathCount' => 0,
                ],
            ]);
        }

        $rules = TriageRule::where('clinic_id', $clinic->id)
            ->with('keywords')
            ->orderBy('sort_order')
            ->get();

        $escalationPaths = EscalationPath::where('clinic_id', $clinic->id)
            ->orderBy('level')
            ->get();

        $keywords = $rules->flatMap(fn ($rule) => $rule->keywords);

        $activeRuleCount = $rules->where('is_active', true)->count();

        // Clinic staff eligible to be an explicit triage escalation target,
        // for the target_user_id selector in the rule editor.
        $staff = User::where('clinic_id', $clinic->id)
            ->where('is_active', true)
            ->whereIn('role', [UserRole::Provider, UserRole::Staff, UserRole::Billing, UserRole::ClinicOwner])
            ->orderBy('name')
            ->get(['id', 'name', 'role']);

        return Inertia::render('TriageRules', [
            'rules' => $rules,
            'escalationPaths' => $escalationPaths,
            'keywords' => $keywords,
            'staff' => $staff,
            'stats' => [
                'activeRuleCount' => $activeRuleCount,
                'totalRuleCount' => $rules->count(),
                'escalationPathCount' => $escalationPaths->where('is_active', true)->count(),
            ],
        ]);
    }

    public function store(StoreTriageRuleRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        $maxOrder = TriageRule::where('clinic_id', $clinic->id)->max('sort_order') ?? 0;

        $rule = TriageRule::create([
            'clinic_id' => $clinic->id,
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'priority' => $request->validated('priority'),
            'action' => $request->validated('action'),
            'target_role' => $request->validated('target_role'),
            'target_user_id' => $request->validated('target_user_id'),
            'conditions' => $this->buildConditions($request),
            'is_active' => true,
            'sort_order' => $maxOrder + 1,
        ]);

        foreach ($request->validated('keywords', []) as $kw) {
            TriageKeyword::create([
                'triage_rule_id' => $rule->id,
                'keyword' => $kw['keyword'],
                'category' => $kw['category'],
            ]);
        }

        return redirect()->back()->with('success', 'Triage rule created successfully.');
    }

    public function update(UpdateTriageRuleRequest $request, TriageRule $triageRule): RedirectResponse
    {
        $this->authorizeRule($triageRule);

        $triageRule->update([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'priority' => $request->validated('priority'),
            'action' => $request->validated('action'),
            'is_active' => $request->validated('is_active', $triageRule->is_active),
            'target_role' => $request->validated('target_role'),
            'target_user_id' => $request->validated('target_user_id'),
        ]);

        // Only rebuild keywords (and the conditions snapshot deployed to Vapi)
        // when the request actually includes them — a partial edit (e.g. renaming
        // or toggling) must not wipe the rule's existing keywords.
        if ($request->has('keywords')) {
            $keywords = $request->validated('keywords', []);

            $triageRule->update([
                'conditions' => $this->buildConditions($request),
            ]);

            $triageRule->keywords()->delete();

            foreach ($keywords as $kw) {
                TriageKeyword::create([
                    'triage_rule_id' => $triageRule->id,
                    'keyword' => $kw['keyword'],
                    'category' => $kw['category'],
                ]);
            }
        }

        return redirect()->back()->with('success', 'Triage rule updated successfully.');
    }

    /**
     * Build the `conditions` JSON column from the request: the plain
     * keyword list the UI edits, plus any advanced declarative groups
     * (all_keywords / exclude_keywords / min_keyword_matches) that
     * TriageMatchEngine understands — supplied by API consumers even
     * though the current UI only edits the plain keyword list.
     */
    private function buildConditions(StoreTriageRuleRequest|UpdateTriageRuleRequest $request): array
    {
        $conditions = [
            'keywords' => collect($request->validated('keywords', []))->pluck('keyword')->toArray(),
        ];

        if ($request->filled('all_keywords')) {
            $conditions['all_keywords'] = $request->validated('all_keywords');
        }

        if ($request->filled('exclude_keywords')) {
            $conditions['exclude_keywords'] = $request->validated('exclude_keywords');
        }

        if ($request->filled('min_keyword_matches')) {
            $conditions['min_keyword_matches'] = (int) $request->validated('min_keyword_matches');
        }

        return $conditions;
    }

    public function toggle(TriageRule $triageRule): RedirectResponse
    {
        $this->authorizeRule($triageRule);

        $triageRule->update(['is_active' => ! $triageRule->is_active]);

        return redirect()->back()->with('success', 'Triage rule '.($triageRule->is_active ? 'activated' : 'deactivated').'.');
    }

    public function destroy(TriageRule $triageRule): RedirectResponse
    {
        $this->authorizeRule($triageRule);

        $triageRule->keywords()->delete();
        $triageRule->delete();

        return redirect()->back()->with('success', 'Triage rule deleted successfully.');
    }

    private function authorizeRule(TriageRule $triageRule): void
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $triageRule->clinic_id !== $clinic->id) {
            abort(403);
        }
    }
}
