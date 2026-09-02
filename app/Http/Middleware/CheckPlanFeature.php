<?php

namespace App\Http\Middleware;

use App\Models\Clinic;
use App\Services\FeatureGateService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPlanFeature
{
    public function __construct(private FeatureGateService $featureGate) {}

    /**
     * Check that the clinic's subscription plan includes the required feature(s).
     *
     * Usage: Route::middleware('feature:integrations')
     *        Route::middleware('feature:sms,campaigns')  // requires ANY of these
     */
    public function handle(Request $request, Closure $next, string ...$features): Response
    {
        $clinic = $request->user()?->clinic;

        if (! $clinic || ! $this->featureGate->clinicHasAnyFeature($clinic, $features)) {
            if ($request->expectsJson()) {
                abort(403, 'Your current plan does not include this feature. Please upgrade your plan.');
            }

            return redirect('/billing')
                ->with('error', 'Your current plan does not include this feature. Please upgrade your plan.');
        }

        return $next($request);
    }
}
