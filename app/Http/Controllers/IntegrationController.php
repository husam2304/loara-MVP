<?php

namespace App\Http\Controllers;

use App\Enums\IntegrationProvider;
use App\Enums\IntegrationStatus;
use App\Http\Requests\StoreIntegrationRequest;
use App\Models\Integration;
use App\Services\IntegrationSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationController extends Controller
{
    public function index(): Response
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic) {
            $availableProviders = collect(IntegrationProvider::cases())
                ->values()
                ->map(fn ($p) => ['value' => $p->value, 'label' => $p->name]);

            return Inertia::render('Integrations', [
                'integrations' => collect(),
                'stats' => [
                    'activeCount' => 0,
                    'totalCount' => 0,
                    'errorCount' => 0,
                    'uptimePercentage' => 100,
                    'daysSinceError' => 0,
                ],
                'availableProviders' => $availableProviders,
            ]);
        }

        $integrations = Integration::where('clinic_id', $clinic->id)
            ->with(['syncLogs' => fn ($q) => $q->orderByDesc('started_at')->limit(5)])
            ->get();

        $activeCount = $integrations->where('status', IntegrationStatus::Connected)->count();
        $errorCount = $integrations->where('status', IntegrationStatus::Error)->count();

        $lastErrorAt = $integrations
            ->where('status', IntegrationStatus::Error)
            ->max('updated_at');

        if ($lastErrorAt) {
            $daysSinceError = (int) now()->diffInDays($lastErrorAt);
        } else {
            $oldestIntegration = $integrations->min('created_at');
            $daysSinceError = $oldestIntegration ? (int) now()->diffInDays($oldestIntegration) : 0;
        }

        $uptimePercentage = $integrations->count() > 0
            ? round(($activeCount / $integrations->count()) * 100, 2)
            : 100;

        $existingProviders = $integrations->pluck('provider')->map(fn ($p) => $p->value)->toArray();
        $availableProviders = collect(IntegrationProvider::cases())
            ->filter(fn ($p) => ! in_array($p->value, $existingProviders))
            ->values()
            ->map(fn ($p) => ['value' => $p->value, 'label' => $p->name]);

        return Inertia::render('Integrations', [
            'integrations' => $integrations,
            'stats' => [
                'activeCount' => $activeCount,
                'totalCount' => $integrations->count(),
                'errorCount' => $errorCount,
                'uptimePercentage' => $uptimePercentage,
                'daysSinceError' => $daysSinceError,
            ],
            'availableProviders' => $availableProviders,
        ]);
    }

    public function store(StoreIntegrationRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        Integration::create([
            'clinic_id' => $clinic->id,
            'provider' => $request->validated('provider'),
            'name' => $request->validated('name'),
            'status' => IntegrationStatus::SetupRequired,
        ]);

        return redirect()->back()->with('success', 'Integration added successfully.');
    }

    public function update(Request $request, Integration $integration): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic || $integration->clinic_id !== $clinic->id) {
            abort(403);
        }

        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:connected,disconnected,error,setup_required'],
            'name' => ['sometimes', 'string', 'max:255'],
        ]);

        $integration->update($validated);

        if (($validated['status'] ?? null) === 'connected') {
            $integration->update(['last_synced_at' => now(), 'error_message' => null]);
        }

        return redirect()->back()->with('success', 'Integration updated successfully.');
    }

    public function sync(Integration $integration, IntegrationSyncService $syncService): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $integration->clinic_id !== $clinic->id) {
            abort(403);
        }

        $result = $syncService->sync($integration);

        if (! $result['ok']) {
            return redirect()->back()->withErrors(['sync' => $result['message']]);
        }

        return redirect()->back()->with('success', $result['message']);
    }

    public function destroy(Integration $integration): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $integration->clinic_id !== $clinic->id) {
            abort(403);
        }

        $integration->delete();

        return redirect()->back()->with('success', 'Integration removed successfully.');
    }
}
