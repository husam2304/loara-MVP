<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\AiConfiguration;
use App\Models\Clinic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public clinic directory + detail API — no authentication required.
 *
 * This is deliberately separate from the internal clinic-settings/landing-page
 * controllers, which are session-scoped to the logged-in staff member's own
 * clinic. Nothing here should ever expose clinic-internal data (patients,
 * calls, staff, billing) — only what a prospective patient browsing the
 * directory or a clinic's public page should see.
 */
class PublicClinicController extends Controller
{
    /**
     * List publicly-listed, enabled clinics. Supports simple text search and
     * optional "near me" radius search when lat/lng are provided.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'radius_km' => ['nullable', 'integer', 'min:1', 'max:500'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Clinic::query()->publiclyVisible();

        if (! empty($validated['search'])) {
            $term = $validated['search'];
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('city', 'like', "%{$term}%");
            });
        }

        if (! empty($validated['city'])) {
            $query->where('city', 'like', "%{$validated['city']}%");
        }

        $hasGeoSearch = isset($validated['lat']) && isset($validated['lng']);

        if ($hasGeoSearch) {
            // Cast explicitly — Laravel's validation rules check the value's shape
            // but don't cast it; it stays a string from the query string. Binding an
            // uncast numeric string (or even a PHP float — PDO has no dedicated float
            // parameter type, so floats bind as PARAM_STR too) compares by SQLite's
            // storage-class ordering (REAL is always < TEXT) rather than numeric
            // value, silently matching every row regardless of the actual radius.
            // Casting to int gives PDO::PARAM_INT, which compares numerically on
            // every driver — and sub-km precision isn't meaningful for a search radius.
            $lat = (float) $validated['lat'];
            $lng = (float) $validated['lng'];
            $radiusKm = (int) ($validated['radius_km'] ?? 50);

            // Haversine distance in km. Repeated verbatim in both SELECT (for display)
            // and WHERE (for filtering) rather than filtering on the SELECT alias via
            // HAVING — HAVING-without-GROUP-BY on a computed alias is accepted by
            // MySQL/Postgres but rejected by SQLite ("HAVING clause on a non-aggregate
            // query"), and a plain WHERE can't reference a SELECT alias in standard
            // SQL on any of the three. Repeating the raw expression is the one form
            // that's portable across all of them.
            $haversine = "(6371 * acos(cos(radians({$lat})) * cos(radians(latitude)) *
                cos(radians(longitude) - radians({$lng})) + sin(radians({$lat})) * sin(radians(latitude))))";

            $query->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->select('*')
                ->selectRaw("{$haversine} as distance_km")
                ->whereRaw("{$haversine} <= ?", [$radiusKm])
                ->orderBy('distance_km');
        } else {
            $query->orderBy('name');
        }

        $clinics = $query->paginate($validated['per_page'] ?? 20);

        $clinics->getCollection()->transform(fn (Clinic $clinic) => $this->summarize($clinic, $hasGeoSearch));

        return response()->json($clinics);
    }

    /**
     * Full public profile for a single clinic, by slug — includes landing
     * page content and enough AI-config info for a mobile app to start a
     * voice or chat session (public identifiers only, never secrets).
     */
    public function show(string $slug): JsonResponse
    {
        $clinic = Clinic::query()
            ->publiclyVisible()
            ->where('slug', $slug)
            ->with(['landingPageContent', 'operatingHours'])
            ->firstOrFail();

        $aiConfig = AiConfiguration::where('clinic_id', $clinic->id)->first();

        return response()->json([
            ...$this->summarize($clinic, false),
            'address' => $clinic->address,
            'website' => $clinic->website,
            'operating_hours' => $clinic->operatingHours->map(fn ($h) => [
                'day_of_week' => $h->day_of_week,
                'open_time' => $h->open_time,
                'close_time' => $h->close_time,
                'is_closed' => $h->is_closed,
            ]),
            'landing_page' => $clinic->landingPageContent?->getResolvedContent(),
            // Public identifiers only — never the Vapi private key, never anything
            // that would let a client act on the account. A missing assistant/phone
            // means this clinic hasn't finished AI setup yet; the mobile app should
            // hide call/chat entry points in that case.
            'voice' => [
                'available' => (bool) ($aiConfig?->vapi_assistant_id),
                'vapi_assistant_id' => $aiConfig?->vapi_assistant_id,
                'vapi_public_key' => config('vapi.public_key'),
            ],
            'chat' => [
                // Chat is proxied through our own backend (see PatientChatController),
                // never called directly from the client — no Vapi identifiers needed here.
                'available' => (bool) ($aiConfig?->vapi_assistant_id),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function summarize(Clinic $clinic, bool $includeDistance): array
    {
        return [
            'id' => $clinic->id,
            'slug' => $clinic->slug,
            'name' => $clinic->name,
            'city' => $clinic->city,
            'state' => $clinic->state,
            'phone' => $clinic->phone,
            'logo_url' => $clinic->logo_url,
            'latitude' => $clinic->latitude,
            'longitude' => $clinic->longitude,
            'after_hours_ai_enabled' => $clinic->after_hours_ai_enabled,
            ...($includeDistance && isset($clinic->distance_km)
                ? ['distance_km' => round((float) $clinic->distance_km, 1)]
                : []),
        ];
    }
}
