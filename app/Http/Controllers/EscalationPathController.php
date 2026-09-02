<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEscalationPathRequest;
use App\Http\Requests\UpdateEscalationPathRequest;
use App\Models\EscalationPath;
use Illuminate\Http\RedirectResponse;

class EscalationPathController extends Controller
{
    public function store(StoreEscalationPathRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        EscalationPath::create([
            'clinic_id' => $clinic->id,
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'level' => $request->validated('level'),
            'target_role' => $request->validated('target_role'),
            'timeout_seconds' => $request->validated('timeout_seconds'),
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'Escalation path created successfully.');
    }

    public function update(UpdateEscalationPathRequest $request, EscalationPath $escalationPath): RedirectResponse
    {
        $this->authorizePath($escalationPath);

        $escalationPath->update([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'level' => $request->validated('level'),
            'target_role' => $request->validated('target_role'),
            'timeout_seconds' => $request->validated('timeout_seconds'),
            'is_active' => $request->validated('is_active', $escalationPath->is_active),
        ]);

        return redirect()->back()->with('success', 'Escalation path updated successfully.');
    }

    public function toggle(EscalationPath $escalationPath): RedirectResponse
    {
        $this->authorizePath($escalationPath);

        $escalationPath->update(['is_active' => ! $escalationPath->is_active]);

        return redirect()->back()->with('success', 'Escalation path '.($escalationPath->is_active ? 'activated' : 'deactivated').'.');
    }

    public function destroy(EscalationPath $escalationPath): RedirectResponse
    {
        $this->authorizePath($escalationPath);

        $escalationPath->delete();

        return redirect()->back()->with('success', 'Escalation path deleted successfully.');
    }

    private function authorizePath(EscalationPath $escalationPath): void
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $escalationPath->clinic_id !== $clinic->id) {
            abort(403);
        }
    }
}
