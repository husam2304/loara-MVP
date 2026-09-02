<?php

use App\Http\Controllers\Admin\ImpersonationController;
use App\Http\Controllers\Admin\PaymentGatewayController;
use App\Http\Controllers\Admin\PricingController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\CallController;
use App\Http\Controllers\CallRecordingController;
use App\Http\Controllers\EscalationPathController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InstallController;
use App\Http\Controllers\InsuranceController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\LandingPageController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\Platform\PlatformClinicController;
use App\Http\Controllers\Platform\PlatformDashboardController;
use App\Http\Controllers\Platform\PlatformSettingController;
use App\Http\Controllers\Platform\PlatformUserController;
use App\Http\Controllers\ProviderController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\TriageRuleController;
use App\Http\Controllers\WorkflowController;
use App\Models\Clinic;
use App\Models\LandingPageContent;
use App\Models\PlanConfiguration;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ============================================================
// Web installer (first-run setup wizard)
// ============================================================

Route::prefix('install')->name('install.')->group(function () {
    Route::get('/', [InstallController::class, 'requirements'])->name('requirements');
    Route::get('/database', [InstallController::class, 'database'])->name('database');
    Route::post('/database', [InstallController::class, 'saveDatabase'])->name('database.save');
    Route::get('/admin', [InstallController::class, 'admin'])->name('admin');
    Route::post('/admin', [InstallController::class, 'saveAdmin'])->name('admin.save');
    Route::get('/complete', [InstallController::class, 'complete'])->name('complete');
});

Route::post('/locale', [PlatformSettingController::class, 'updateLocale'])
    ->name('locale.update');
// ============================================================
// Public routes
// ============================================================

Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [LoginController::class, 'login']);

    Route::get('/register', [RegisterController::class, 'showStep'])->name('register');
    Route::get('/register/step/{step}', [RegisterController::class, 'showStep'])->name('register.step')->whereNumber('step');
    Route::post('/register/step/1', [RegisterController::class, 'processStep1'])->name('register.step1');
    Route::post('/register/step/2', [RegisterController::class, 'processStep2'])->name('register.step2');
    Route::post('/register/step/3', [RegisterController::class, 'processStep3'])->name('register.step3');
    Route::post('/register/complete', [RegisterController::class, 'complete'])->middleware('throttle:6,1')->name('register.complete');
    Route::post('/register/back/{step}', [RegisterController::class, 'back'])->name('register.back')->whereNumber('step');

    // Password reset
    Route::get('/forgot-password', [PasswordResetController::class, 'showLinkRequestForm'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink'])->middleware('throttle:6,1')->name('password.email');
    Route::get('/reset-password/{token}', [PasswordResetController::class, 'showResetForm'])->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:6,1')->name('password.update');
});

Route::post('/logout', [LoginController::class, 'logout'])->name('logout')->middleware('auth');

Route::get('/', function () {
    $clinic = Clinic::with('aiConfiguration')->first();
    $landingContent = $clinic
        ? LandingPageContent::where('clinic_id', $clinic->id)->first()
        : null;

    $content = $landingContent
        ? $landingContent->getResolvedContent()
        : LandingPageContent::defaultContent();

    $plans = PlanConfiguration::query()
        ->active()
        ->ordered()
        ->get(['name', 'slug', 'description', 'price_monthly', 'price_yearly', 'minutes_limit', 'concurrent_limit', 'team_member_limit', 'features']);

    return Inertia::render('Welcome', [
        'content' => $content,
        'plans' => $plans,
        // Live in-browser AI demo: the public key is safe to expose; the demo
        // calls the showcased clinic's assistant when one is provisioned.
        'vapiPublicKey' => config('vapi.public_key'),
        'demoAssistantId' => $clinic?->aiConfiguration?->vapi_assistant_id,
    ]);
})->name('home');

// ============================================================
// Email verification — auth required, no verified/subscribed
// ============================================================

Route::middleware('auth')->group(function () {
    Route::get('/email/verify', [EmailVerificationController::class, 'notice'])->name('verification.notice');
    Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])->middleware('signed')->name('verification.verify');
    Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])->middleware('throttle:6,1')->name('verification.send');
});

// ============================================================
// Platform panel — SuperAdmin only, isolated from clinic data
// ============================================================

Route::middleware(['auth', 'verified', 'role:super_admin'])->prefix('platform')->group(function () {
    Route::get('/dashboard', [PlatformDashboardController::class, 'index'])->name('platform.dashboard');

    // Clinic management
    Route::get('/clinics', [PlatformClinicController::class, 'index'])->name('platform.clinics');
    Route::get('/clinics/{clinic}', [PlatformClinicController::class, 'show'])->name('platform.clinics.show');
    Route::patch('/clinics/{clinic}/toggle', [PlatformClinicController::class, 'toggleEnabled'])->name('platform.clinics.toggle');
    Route::post('/clinics/{clinic}/users/{user}/impersonate', [PlatformClinicController::class, 'impersonate'])->name('platform.clinics.impersonate');

    // Platform users
    Route::get('/users', [PlatformUserController::class, 'index'])->name('platform.users');

    // Pricing
    Route::get('/pricing', [PricingController::class, 'index'])->name('platform.pricing');
    Route::post('/pricing', [PricingController::class, 'store'])->name('platform.pricing.store');
    Route::patch('/pricing/{plan}', [PricingController::class, 'update'])->name('platform.pricing.update');
    Route::delete('/pricing/{plan}', [PricingController::class, 'destroy'])->name('platform.pricing.destroy');
    Route::post('/pricing/{plan}/sync-stripe', [PricingController::class, 'syncToStripe'])->name('platform.pricing.sync-stripe');

    // Payment gateways
    Route::get('/payment-gateways', [PaymentGatewayController::class, 'index'])->name('platform.payment-gateways');
    Route::put('/payment-gateways', [PaymentGatewayController::class, 'update'])->name('platform.payment-gateways.update');
    Route::post('/payment-gateways/test', [PaymentGatewayController::class, 'testConnection'])->name('platform.payment-gateways.test');
    Route::delete('/payment-gateways/{gatewayConfiguration}', [PaymentGatewayController::class, 'destroy'])->name('platform.payment-gateways.destroy');

    // Platform settings (SMTP, Claim.MD, Branding)
    Route::get('/settings', [PlatformSettingController::class, 'index'])->name('platform.settings');
    Route::put('/settings/smtp', [PlatformSettingController::class, 'updateSmtp'])->name('platform.settings.smtp.update');
    Route::post('/settings/smtp/test', [PlatformSettingController::class, 'testSmtp'])->name('platform.settings.smtp.test');
    Route::put('/settings/app-name', [PlatformSettingController::class, 'updateAppName'])->name('platform.settings.app-name.update');
    Route::put('/settings/claim-md', [PlatformSettingController::class, 'updateClaimMd'])->name('platform.settings.claim-md.update');
    Route::post('/settings/claim-md/test', [PlatformSettingController::class, 'testClaimMd'])->name('platform.settings.claim-md.test');
    Route::put('/settings/vapi', [PlatformSettingController::class, 'updateVapi'])->name('platform.settings.vapi.update');
    Route::post('/settings/vapi/test', [PlatformSettingController::class, 'testVapi'])->name('platform.settings.vapi.test');
});

// ============================================================
// Clinic panel — all clinic roles, SuperAdmin blocked
// ============================================================

Route::middleware(['auth', 'verified', 'redirect_super_admin', 'clinic_enabled'])->group(function () {

    // Dashboard — accessible to all clinic users
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Impersonation stop — accessible to impersonated user
    Route::post('/admin/impersonate/stop', [ImpersonationController::class, 'stop'])->name('admin.impersonate.stop');

    // Billing — clinic_owner, billing and customer roles
    Route::middleware('role:clinic_owner,billing,customer')->group(function () {
        Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
        Route::post('/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
        Route::get('/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');
        Route::post('/billing/cancel', [BillingController::class, 'cancel'])->name('billing.cancel');
        Route::post('/billing/resume', [BillingController::class, 'resume'])->name('billing.resume');
        Route::post('/billing/swap', [BillingController::class, 'swap'])->name('billing.swap');
    });

    // Operational routes — all clinic roles with active subscription
    // Clinical/operational area — clinic staff only. The patient-facing `customer`
    // role is intentionally excluded so it cannot read other patients' PHI; it
    // keeps dashboard + billing access only.
    Route::middleware(['role:clinic_owner,provider,staff,billing', 'subscribed'])->group(function () {
        Route::get('/call-center', [CallController::class, 'index'])->name('call-center');
        Route::post('/call-center', [CallController::class, 'store'])->name('call-center.store');
        Route::get('/call-center/calls/{call}/status', [CallController::class, 'callStatus'])->name('call-center.call-status');
        Route::get('/call-center/calls/{call}', [CallController::class, 'show'])->name('call-center.call-detail');
        Route::get('/call-center/calls/{call}/recording', CallRecordingController::class)->name('call-center.call-recording');

        Route::get('/appointments', [AppointmentController::class, 'index'])->name('appointments');
        Route::post('/appointments', [AppointmentController::class, 'store'])->name('appointments.store');
        Route::patch('/appointments/{appointment}/check-in', [AppointmentController::class, 'checkIn'])->name('appointments.check-in');
        Route::patch('/appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule'])->name('appointments.reschedule');
        Route::patch('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel'])->name('appointments.cancel');

        Route::get('/patients', [PatientController::class, 'index'])->name('patients');
        Route::get('/patients/search', [PatientController::class, 'search'])->name('patients.search');
        Route::post('/patients', [PatientController::class, 'store'])->name('patients.store');
        Route::get('/patients/{patient}', [PatientController::class, 'show'])->name('patients.show');
        Route::patch('/patients/{patient}', [PatientController::class, 'update'])->name('patients.update');

        Route::get('/providers', [ProviderController::class, 'index'])->name('providers');
        Route::post('/providers', [ProviderController::class, 'store'])->name('providers.store');
        Route::patch('/providers/{provider}', [ProviderController::class, 'update'])->name('providers.update');
        Route::delete('/providers/{provider}', [ProviderController::class, 'destroy'])->name('providers.destroy');

        /* Route::get('/insurance', [InsuranceController::class, 'index'])->name('insurance');
        Route::post('/insurance', [InsuranceController::class, 'store'])->name('insurance.store');
        Route::post('/insurance/verify', [InsuranceController::class, 'verify'])->name('insurance.verify');
        Route::post('/insurance/{claim}/submit', [InsuranceController::class, 'submitClaim'])->name('insurance.submit');
        Route::get('/insurance/{claim}/status', [InsuranceController::class, 'checkClaimStatus'])->name('insurance.status');
        Route::get('/insurance/payers', [InsuranceController::class, 'payerList'])->name('insurance.payers'); */

        Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics');

        // Advanced analytics currently surfaces through the data-backed analytics
        // dashboard. The standalone enhanced view was a static mockup, so the gated
        // route redirects to the real page rather than show placeholder data.
        Route::get('/analytics/enhanced', function () {
            return redirect()->route('analytics');
        })->middleware('feature:advanced_analytics')->name('analytics.enhanced');

        Route::get('/search', SearchController::class)->name('search');

        Route::get('/onboarding', function () {
            return Inertia::render('Onboarding');
        })->name('onboarding');
    });

    // Clinic admin routes — clinic_owner only with active subscription
    Route::middleware(['role:clinic_owner', 'subscribed'])->group(function () {
        // Impersonation within own clinic
        Route::post('/admin/impersonate/{user}', [ImpersonationController::class, 'start'])->name('admin.impersonate.start');

        // Admin panel
        Route::get('/admin/users', [UserManagementController::class, 'index'])->name('admin.users');
        Route::post('/admin/users', [UserManagementController::class, 'store'])->name('admin.users.store');
        Route::patch('/admin/users/{user}', [UserManagementController::class, 'update'])->name('admin.users.update');
        Route::delete('/admin/users/{user}', [UserManagementController::class, 'destroy'])->name('admin.users.destroy');

        // Feature-gated: triage
        Route::middleware('feature:triage')->group(function () {
            Route::get('/triage-rules', [TriageRuleController::class, 'index'])->name('triage-rules');
            Route::post('/triage-rules', [TriageRuleController::class, 'store'])->name('triage-rules.store');
            Route::patch('/triage-rules/{triageRule}', [TriageRuleController::class, 'update'])->name('triage-rules.update');
            Route::patch('/triage-rules/{triageRule}/toggle', [TriageRuleController::class, 'toggle'])->name('triage-rules.toggle');
            Route::delete('/triage-rules/{triageRule}', [TriageRuleController::class, 'destroy'])->name('triage-rules.destroy');
        
            Route::post('/escalation-paths', [EscalationPathController::class, 'store'])->name('escalation-paths.store');
            Route::patch('/escalation-paths/{escalationPath}', [EscalationPathController::class, 'update'])->name('escalation-paths.update');
            Route::patch('/escalation-paths/{escalationPath}/toggle', [EscalationPathController::class, 'toggle'])->name('escalation-paths.toggle');
            Route::delete('/escalation-paths/{escalationPath}', [EscalationPathController::class, 'destroy'])->name('escalation-paths.destroy');
            });

        // Feature-gated: integrations
        Route::middleware('feature:integrations')->group(function () {
            Route::get('/integrations', [IntegrationController::class, 'index'])->name('integrations');
            Route::post('/integrations', [IntegrationController::class, 'store'])->name('integrations.store');
            Route::patch('/integrations/{integration}', [IntegrationController::class, 'update'])->name('integrations.update');
            Route::post('/integrations/{integration}/sync', [IntegrationController::class, 'sync'])->name('integrations.sync');
            Route::delete('/integrations/{integration}', [IntegrationController::class, 'destroy'])->name('integrations.destroy');
        });

        // Feature-gated: custom workflows
        Route::middleware('feature:custom_workflows')->group(function () {
            Route::get('/workflow', [WorkflowController::class, 'index'])->name('workflow');
            Route::post('/workflow', [WorkflowController::class, 'store'])->name('workflow.store');
            Route::post('/workflow/nodes', [WorkflowController::class, 'storeNode'])->name('workflow.nodes.store');
            Route::patch('/workflow/nodes/{workflowNode}', [WorkflowController::class, 'updateNode'])->name('workflow.nodes.update');
            Route::delete('/workflow/nodes/{workflowNode}', [WorkflowController::class, 'destroyNode'])->name('workflow.nodes.destroy');
            Route::patch('/workflow/nodes/{workflowNode}/entry-point', [WorkflowController::class, 'setEntryPoint'])->name('workflow.nodes.entry-point');
            Route::post('/workflow/edges', [WorkflowController::class, 'storeEdge'])->name('workflow.edges.store');
            Route::patch('/workflow/edges/{workflowEdge}', [WorkflowController::class, 'updateEdge'])->name('workflow.edges.update');
            Route::delete('/workflow/edges/{workflowEdge}', [WorkflowController::class, 'destroyEdge'])->name('workflow.edges.destroy');
            Route::post('/workflow/deploy', [WorkflowController::class, 'deploy'])->name('workflow.deploy');
            Route::post('/workflow/undeploy', [WorkflowController::class, 'undeploy'])->name('workflow.undeploy');
        });

        Route::get('/landing-page', [LandingPageController::class, 'index'])->name('landing-page');
        Route::put('/landing-page/hero', [LandingPageController::class, 'updateHero'])->name('landing-page.hero.update');
        Route::put('/landing-page/features', [LandingPageController::class, 'updateFeatures'])->name('landing-page.features.update');
        Route::put('/landing-page/how-it-works', [LandingPageController::class, 'updateHowItWorks'])->name('landing-page.how-it-works.update');
        Route::put('/landing-page/stats', [LandingPageController::class, 'updateStats'])->name('landing-page.stats.update');
        Route::put('/landing-page/pricing', [LandingPageController::class, 'updatePricing'])->name('landing-page.pricing.update');
        Route::put('/landing-page/cta', [LandingPageController::class, 'updateCta'])->name('landing-page.cta.update');
        Route::put('/landing-page/footer', [LandingPageController::class, 'updateFooter'])->name('landing-page.footer.update');
        Route::put('/landing-page/workflows', [LandingPageController::class, 'updateWorkflows'])->name('landing-page.workflows.update');
        Route::put('/landing-page/showcase', [LandingPageController::class, 'updateShowcase'])->name('landing-page.showcase.update');
        Route::put('/landing-page/security', [LandingPageController::class, 'updateSecurity'])->name('landing-page.security.update');
        Route::put('/landing-page/testimonials', [LandingPageController::class, 'updateTestimonials'])->name('landing-page.testimonials.update');
        Route::put('/landing-page/faq', [LandingPageController::class, 'updateFaq'])->name('landing-page.faq.update');

        Route::get('/settings', [SettingController::class, 'index'])->name('settings');
        Route::put('/settings/clinic', [SettingController::class, 'updateClinic'])->name('settings.clinic.update');
        Route::post('/settings/clinic/logo', [SettingController::class, 'uploadLogo'])->name('settings.clinic.logo');
        Route::delete('/settings/clinic/logo', [SettingController::class, 'removeLogo'])->name('settings.clinic.logo.remove');
        Route::post('/settings/clinic/favicon', [SettingController::class, 'uploadFavicon'])->name('settings.clinic.favicon');
        Route::delete('/settings/clinic/favicon', [SettingController::class, 'removeFavicon'])->name('settings.clinic.favicon.remove');
        Route::put('/settings/operating-hours', [SettingController::class, 'updateOperatingHours'])->name('settings.operating-hours.update');
        Route::put('/settings/vapi-configuration', [SettingController::class, 'updateVapiConfiguration'])->name('settings.vapi-configuration.update');
        Route::post('/settings/vapi/phone-number', [SettingController::class, 'provisionPhoneNumber'])->name('settings.vapi.phone-number.provision');
        Route::get('/settings/vapi/phone-number/status', [SettingController::class, 'checkPhoneNumberStatus'])->name('settings.vapi.phone-number.status');
        Route::delete('/settings/vapi/phone-number', [SettingController::class, 'releaseVapiPhoneNumber'])->name('settings.vapi.phone-number.release');
        Route::post('/settings/vapi/knowledge-base/files', [SettingController::class, 'uploadKnowledgeBaseFile'])->name('settings.vapi.knowledge-base.upload');
        Route::delete('/settings/vapi/knowledge-base/files/{knowledgeBaseFile}', [SettingController::class, 'deleteKnowledgeBaseFile'])->name('settings.vapi.knowledge-base.delete');
        Route::post('/settings/vapi/chat', [SettingController::class, 'chatWithAssistant'])->name('settings.vapi.chat');
        Route::put('/settings/notifications', [SettingController::class, 'updateNotifications'])->name('settings.notifications.update');
        Route::put('/settings/reminders', [SettingController::class, 'updateReminderSettings'])->name('settings.reminders.update');
        Route::post('/settings/users', [SettingController::class, 'storeUser'])->name('settings.users.store');
        Route::patch('/settings/users/{user}', [SettingController::class, 'updateUser'])->name('settings.users.update');
        Route::delete('/settings/users/{user}', [SettingController::class, 'destroyUser'])->name('settings.users.destroy');
        Route::get('/settings/audit-log/export', [SettingController::class, 'exportAuditLog'])->name('settings.audit-log.export');
    });
});
