<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateLandingPageCtaRequest;
use App\Http\Requests\UpdateLandingPageFaqRequest;
use App\Http\Requests\UpdateLandingPageFeaturesRequest;
use App\Http\Requests\UpdateLandingPageFooterRequest;
use App\Http\Requests\UpdateLandingPageHeroRequest;
use App\Http\Requests\UpdateLandingPageHowItWorksRequest;
use App\Http\Requests\UpdateLandingPagePricingRequest;
use App\Http\Requests\UpdateLandingPageSecurityRequest;
use App\Http\Requests\UpdateLandingPageShowcaseRequest;
use App\Http\Requests\UpdateLandingPageStatsRequest;
use App\Http\Requests\UpdateLandingPageTestimonialsRequest;
use App\Http\Requests\UpdateLandingPageWorkflowsRequest;
use App\Models\LandingPageContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class LandingPageController extends Controller
{
    public function index(): Response
    {
        Log::info('LandingPageController@index START', [
            'user_id' => auth()->id(),
            'user' => auth()->user()?->only([
                'id',
                'name',
                'email',
            ]),
            'is_authenticated' => auth()->check(),
        ]);

        try {
            $user = auth()->user();

            Log::debug('Landing page index - authenticated user', [
                'user_id' => $user?->id,
                'user_class' => $user ? get_class($user) : null,
            ]);

            $clinic = $user?->clinic;

            Log::info('Landing page index - clinic resolved', [
                'user_id' => $user?->id,
                'clinic_id' => $clinic?->id,
                'clinic' => $clinic?->toArray(),
                'has_clinic' => (bool) $clinic,
            ]);

            if (! $clinic) {
                $defaultContent = LandingPageContent::defaultContent();

                Log::warning('Landing page index - no clinic found, using default content', [
                    'user_id' => $user?->id,
                    'default_content' => $defaultContent,
                ]);

                return Inertia::render('LandingPage', [
                    'content' => $defaultContent,
                ]);
            }

            Log::debug('Landing page index - searching landing page content', [
                'clinic_id' => $clinic->id,
            ]);

            $landingContent = LandingPageContent::where(
                'clinic_id',
                $clinic->id
            )->first();

            Log::info('Landing page content query completed', [
                'clinic_id' => $clinic->id,
                'landing_content_id' => $landingContent?->id,
                'found' => (bool) $landingContent,
                'raw_content' => $landingContent?->content,
            ]);

            $content = $landingContent
                ? $landingContent->getResolvedContent()
                : LandingPageContent::defaultContent();

            Log::debug('Landing page resolved content', [
                'clinic_id' => $clinic->id,
                'content' => $content,
            ]);

            Log::info('LandingPageController@index END', [
                'user_id' => $user?->id,
                'clinic_id' => $clinic->id,
                'landing_content_id' => $landingContent?->id,
            ]);

            return Inertia::render('LandingPage', [
                'content' => $content,
            ]);
        } catch (Throwable $e) {
            Log::error('LandingPageController@index ERROR', [
                'user_id' => auth()->id(),
                'exception_class' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    public function updateHero(UpdateLandingPageHeroRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updateHero START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('hero', $request->validated());

        Log::info('LandingPageController@updateHero END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'Hero section updated.');
    }

    public function updateFeatures(UpdateLandingPageFeaturesRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updateFeatures START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('features', $request->validated());

        Log::info('LandingPageController@updateFeatures END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'Features section updated.');
    }

    public function updateHowItWorks(UpdateLandingPageHowItWorksRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updateHowItWorks START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('how_it_works', $request->validated());

        Log::info('LandingPageController@updateHowItWorks END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'How It Works section updated.');
    }

    public function updateStats(UpdateLandingPageStatsRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updateStats START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('stats', $request->validated());

        Log::info('LandingPageController@updateStats END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'Stats section updated.');
    }

    public function updatePricing(UpdateLandingPagePricingRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updatePricing START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('pricing', $request->validated());

        Log::info('LandingPageController@updatePricing END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'Pricing section updated.');
    }

    public function updateCta(UpdateLandingPageCtaRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updateCta START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('cta', $request->validated());

        Log::info('LandingPageController@updateCta END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'CTA section updated.');
    }

    public function updateFooter(UpdateLandingPageFooterRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updateFooter START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('footer', $request->validated());

        Log::info('LandingPageController@updateFooter END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'Footer section updated.');
    }

    public function updateWorkflows(UpdateLandingPageWorkflowsRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updateWorkflows START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('workflows', $request->validated());

        Log::info('LandingPageController@updateWorkflows END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'Workflow cards updated.');
    }

    public function updateShowcase(UpdateLandingPageShowcaseRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updateShowcase START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('showcase', $request->validated());

        Log::info('LandingPageController@updateShowcase END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'Showcase section updated.');
    }

    public function updateSecurity(UpdateLandingPageSecurityRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updateSecurity START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('security', $request->validated());

        Log::info('LandingPageController@updateSecurity END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'Security section updated.');
    }

    public function updateTestimonials(UpdateLandingPageTestimonialsRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updateTestimonials START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('testimonials', $request->validated());

        Log::info('LandingPageController@updateTestimonials END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'Testimonials section updated.');
    }

    public function updateFaq(UpdateLandingPageFaqRequest $request): RedirectResponse
    {
        Log::info('LandingPageController@updateFaq START', [
            'user_id' => auth()->id(),
            'request_all' => $request->all(),
            'validated' => $request->validated(),
        ]);

        $this->updateSection('faq', $request->validated());

        Log::info('LandingPageController@updateFaq END', [
            'user_id' => auth()->id(),
        ]);

        return back()->with('success', 'FAQ section updated.');
    }

    /**
     * Update a single section within the JSON content column.
     *
     * @param  array<string, mixed>  $data
     */
    private function updateSection(string $section, array $data): void
    {
        Log::info('LandingPageController@updateSection START', [
            'section' => $section,
            'user_id' => auth()->id(),
            'data' => $data,
            "lang" => app()->getLocale()
        ]);

        try {
            $user = auth()->user();

            Log::debug('updateSection - authenticated user', [
                'user_id' => $user?->id,
                'user' => $user?->only([
                    'id',
                    'name',
                    'email',
                ]),
            ]);

            $clinic = $user?->clinic;

            Log::info('updateSection - clinic resolved', [
                'user_id' => $user?->id,
                'clinic_id' => $clinic?->id,
                'clinic' => $clinic?->toArray(),
            ]);

            if (! $clinic) {
                Log::error('updateSection - NO CLINIC FOUND', [
                    'user_id' => $user?->id,
                    'section' => $section,
                    'data' => $data,
                    "lang" => app()->getLocale()
                ]);

                throw new \RuntimeException(
                    'Cannot update landing page because the authenticated user has no clinic.'
                );
            }

            Log::debug('updateSection - creating/finding LandingPageContent', [
                'clinic_id' => $clinic->id,
                'section' => $section,
            ]);

            $landingContent = LandingPageContent::firstOrNew([
                'clinic_id' => $clinic->id,
            ]);

            Log::info('updateSection - LandingPageContent resolved', [
                'clinic_id' => $clinic->id,
                'landing_content_id' => $landingContent->id,
                'exists' => $landingContent->exists,
                'attributes_before_update' => $landingContent->toArray(),
            ]);

            $existingContent = $landingContent->content
                ?? LandingPageContent::defaultContent();

            Log::debug('updateSection - existing content', [
                'clinic_id' => $clinic->id,
                'section' => $section,
                'existing_content' => $existingContent,
                'lang' => app()->getLocale(),
                'existing_section' => $existingContent[app()->getLocale()][$section] ?? null,
            ]);

            $existingContent[app()->getLocale()][$section] = $data;

            Log::info('updateSection - content after section replacement', [
                'clinic_id' => $clinic->id,
                'section' => $section,
                'new_section_data' => $data,
                'final_content' => $existingContent,
            ]);

            $landingContent->content = $existingContent;

            Log::debug('updateSection - model before save', [
                'clinic_id' => $clinic->id,
                'landing_content_id' => $landingContent->id,
                'dirty_attributes' => $landingContent->getDirty(),
                'content' => $landingContent->content,
            ]);

            $landingContent->save();

            Log::info('updateSection - LandingPageContent SAVED SUCCESSFULLY', [
                'clinic_id' => $clinic->id,
                'landing_content_id' => $landingContent->id,
                'section' => $section,
                'was_recently_created' => $landingContent->wasRecentlyCreated,
                'changes' => $landingContent->getChanges(),
                'saved_content' => $landingContent->content,
            ]);

            Log::info('LandingPageController@updateSection END', [
                'section' => $section,
                'clinic_id' => $clinic->id,
                'landing_content_id' => $landingContent->id,
            ]);
        } catch (Throwable $e) {
            Log::error('LandingPageController@updateSection ERROR', [
                'section' => $section,
                'data' => $data,
                'user_id' => auth()->id(),
                'exception_class' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }
}