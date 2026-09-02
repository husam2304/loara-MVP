# Loara / Hiro Project Overview

## 1. What this project does

This project is a multi-tenant healthcare SaaS for clinics. It provides an AI-powered front desk that can answer calls, manage appointments, look up patients, verify insurance, triage urgent cases, and route work through a clinic dashboard and platform admin panel.

The product is built around a clinic tenant model and a platform administrator model:

- Clinic panel: day-to-day operational workflows for staff and clinic owners
- Platform panel: SaaS operator workflows for clinic management, plan configuration, billing, and branding
- AI voice layer: Vapi-powered voice assistant that handles inbound and outbound calls
- Subscription layer: Stripe-based pricing and gating by plan features

This matches the documentation in the docs folder and the actual Laravel routing structure.

---

## 2. Core product vision

The project describes itself as a healthcare AI assistant for front-desk operations. In practice, the app aims to do the following:

- answer patient calls through a voice AI assistant
- identify patients safely using DOB verification and protected-tool checks
- check clinic schedule and provider availability
- book, reschedule, or cancel appointments
- create and update patient records
- run insurance eligibility checks and claim workflows
- escalate critical cases through triage and callbacks
- provide a clinic dashboard with operational analytics
- allow a SaaS operator to manage many clinics from one platform

The strongest feature set is the call-center + AI automation layer.

---

## 3. Where the app is implemented

### Backend and app structure

Primary implementation files:

- routes/web.php — main clinic and platform routes
- routes/api.php — Vapi and Stripe webhook endpoints
- bootstrap/app.php — middleware registration and aliases for roles, subscriptions, feature flags, and Inertia
- app/Http/Controllers — page controllers for dashboard, patients, billing, workflow, settings, platform, auth, etc.
- app/Services — business logic for Vapi, usage, subscriptions, insurance, integrations, and feature gates
- app/Models — domain models for Clinic, Patient, Appointment, Call, Workflow, Plan, etc.
- app/Enums — role and status definitions used across the app

### Frontend

The frontend is React + Inertia.js:

- resources/js/pages — page components for dashboard, patient management, billing, settings, workflow, platform, onboarding, etc.
- resources/js/components — shared UI components used by the page views
- resources/js/locales — translations for English and Arabic

### Documentation

The docs folder is the clearest source for intended product behavior:

- introduction.html — product summary
- architecture.html — architecture and request lifecycle
- roles-and-tenancy.html — roles and tenant isolation
- clinic-panel.html — clinic operations
- platform-admin.html — SaaS operator features
- ai-overview.html — AI call flow overview
- ai-tools.html — the call tools used by Vapi
- workflows.html — visual workflow builder
- billing.html — Stripe subscriptions and plan limits
- insurance.html — insurance verification and claims
- quickstart.html — demo accounts and setup

---

## 4. Main application flows and where they are implemented

### A. Installation and first-run setup

Flow:

- installer screens at /install
- user configures database and admin account
- app moves to a ready state

Implemented in:

- routes/web.php
- app/Http/Controllers/InstallController.php
- bootstrap/app.php (RedirectIfNotInstalled middleware)

Purpose:

- enforce first-run onboarding before normal app access

---

### B. Authentication and authorization

Flow:

- public login/register/password reset pages
- verified email requirement for app access
- role-based routing for clinic vs platform users
- clinic user isolation and SuperAdmin blocking

Implemented in:

- routes/web.php
- app/Http/Controllers/Auth/*
- app/Enums/UserRole.php
- app/Http/Middleware/CheckRole.php
- app/Http/Middleware/RedirectSuperAdmin.php
- app/Http/Middleware/EnsureActiveSubscription.php
- app/Http/Middleware/EnsureClinicEnabled.php

Purpose:

- keep platform and clinic access separated
- enforce tenant permissions and subscription gates

---

### C. Multi-tenant clinic setup and onboarding

Flow:

- clinic signs up or is provisioned after registration
- system creates default AI configuration, operating hours, reminders, etc.
- clinic gets an initial subscription and tenant baseline

Implemented in:

- app/Services/ClinicProvisioner.php
- app/Http/Controllers/Auth/RegisterController.php
- app/Models/Clinic.php
- app/Models/AiConfiguration.php

Purpose:

- create a usable clinic immediately after signup

---

### D. Platform admin panel

Flow:

- SuperAdmin manages clinics, pricing, users, settings, and payment gateways
- can enable/disable clinics and impersonate users for support

Implemented in:

- routes/web.php under /platform
- app/Http/Controllers/Platform/*
- app/Http/Controllers/Admin/*
- resources/js/pages/Platform/*

Purpose:

- run the SaaS business from a separate admin surface

---

### E. Clinic dashboard and operations

Flow:

- clinic user lands on /dashboard
- can access call center, appointments, patients, providers, analytics, settings, and team management
- some modules are gated by plan feature flags

Implemented in:

- routes/web.php
- app/Http/Controllers/DashboardController.php
- app/Http/Controllers/CallController.php
- app/Http/Controllers/AppointmentController.php
- app/Http/Controllers/PatientController.php
- app/Http/Controllers/ProviderController.php
- app/Http/Controllers/AnalyticsController.php
- app/Http/Controllers/SettingController.php
- resources/js/pages/*.tsx

Purpose:

- run daily clinic operations from a single workspace

---

### F. Subscription, billing, and plan enforcement

Flow:

- clinic chooses plan
- Stripe checkout is created
- webhook updates local subscription status
- plan limits are enforced across AI usage, users, and module access

Implemented in:

- app/Services/SubscriptionService.php
- app/Services/UsageService.php
- app/Services/FeatureGateService.php
- app/Http/Controllers/BillingController.php
- app/Http/Controllers/Api/StripeWebhookController.php
- config/subscriptions.php
- resources/js/pages/Billing.tsx

Purpose:

- model SaaS billing and limit enforcement

---

### G. AI voice call flow with Vapi

This is the central product flow.

Flow:

- call is received or initiated
- Vapi calls Hiro webhook
- webhook resolves clinic and call context
- Vapi tool dispatcher executes server-side tools
- tool result is returned to the AI assistant
- transcript, summaries, and recording data are stored in the database
- usage minutes are recorded

Implemented in:

- routes/api.php
- app/Http/Controllers/Api/VapiWebhookController.php
- app/Services/VapiService.php
- app/Services/VapiToolDispatcher.php
- app/Models/Call.php and related call models
- app/Services/UsageService.php
- resources/js/pages/CallCenter.tsx
- resources/js/pages/Settings.tsx

This is the main real-world execution layer of the product.

---

### H. AI tools / server-side actions

The AI is not just a generic LLM; it is wired to clinic-specific tools. Examples from VapiToolDispatcher include:

- lookup_patient
- create_patient_lead
- verify_identity
- check_schedule
- check_appointment_types
- list_upcoming_appointments
- book_appointment
- reschedule_appointment
- cancel_appointment
- verify_insurance
- assess_urgency
- create_callback_task
- transfer_call
- send_sms
- check_clinic_hours

This shows the project is doing real business automation, not just a generic chatbot.

---

### I. Workflow builder / squad mode

Flow:

- clinic creates a workflow with assistant nodes and transitions
- nodes represent specialized AI assistants
- one node is the entry point
- workflow is validated and deployed to Vapi as a squad
- inbound calls are routed through the configured workflow

Implemented in:

- app/Http/Controllers/WorkflowController.php
- app/Models/SquadWorkflow.php
- app/Models/WorkflowNode.php
- app/Models/WorkflowEdge.php
- app/Services/VapiService.php
- resources/js/pages/Workflow.tsx

This is a more advanced orchestration layer beyond a single assistant.

---

### J. Insurance verification and claims

Flow:

- clinic selects patient and insurance
- verification request is sent through insurance gateway
- coverage and plan details are stored
- claims can be submitted and tracked

Implemented in:

- app/Http/Controllers/InsuranceController.php
- app/Services/InsuranceVerificationManager.php
- app/Services/Gateways/*
- app/Models/InsuranceClaim.php
- app/Models/EligibilityVerification.php
- resources/js/pages/Insurance.tsx

This feature is real in the codebase and UI, but the route is partly commented out in routes/web.php.

---

### K. Integrations and third-party syncs

Flow:

- registered integrations are created and connected
- sync is triggered to update external records
- sync logs are kept for audit/history

Implemented in:

- app/Http/Controllers/IntegrationController.php
- app/Services/IntegrationSyncService.php
- app/Models/Integration.php
- app/Models/IntegrationSyncLog.php
- resources/js/pages/Integrations.tsx

---

### L. Triage rules and urgency handling

Flow:

- clinic defines rules mapped to urgency levels
- those rules inform AI urgency assessment and escalations

Implemented in:

- app/Http/Controllers/TriageRuleController.php
- app/Models/TriageRule.php
- app/Services/VapiToolDispatcher.php
- resources/js/pages/TriageRules.tsx

---

### M. Public-facing marketing and patient directory

Flow:

- public landing page shows clinic directory and product information
- customer-facing clinic details can be read through public APIs

Implemented in:

- routes/web.php public landing page
- routes/api.php public clinic endpoints
- app/Http/Controllers/Api/Public/PublicClinicController.php
- resources/js/pages/Welcome.tsx

---

## 5. What is already implemented well

The project is not a mockup. It has substantial implementation in the following areas:

- tenant-aware routing and access control
- clinic and platform split
- role-based authorization
- subscription and feature gating
- Vapi webhook handling and tool execution
- patient lookup and identity verification logic
- appointment booking and scheduling logic
- call tracking with status, transcript, recording, and usage accounting
- workflow/squad builder for multi-assistant orchestration
- Stripe billing integration and plan enforcement
- platform administration and SaaS management features
- React UI pages for most major clinic operations

This is the strongest part of the project: the operational clinic system and AI call logic are substantially built.

---

## 6. What is missing or incomplete

These are the main gaps that stand out after reviewing the docs and code:

### 1. No visible automated test suite

There is no tests directory in the workspace snapshot. Given the size and complexity of the app, this is a major risk area. The project appears to be feature-heavy but not strongly verified by tests.

### 2. Insurance routes are partially disabled

In routes/web.php, the insurance routes are commented out:

- /insurance
- /insurance/verify
- /insurance/submit
- /insurance/status

The InsuranceController exists and the UI page exists, but the active route set does not clearly expose the feature in normal navigation. This suggests the feature is partially wired or intentionally deferred.

### 3. Some "advanced" flows are redirected or not fully distinct

The docs describe a full analytics experience, but the code contains an enhanced analytics route that redirects to the real analytics page rather than serving a separate implementation. This suggests the marketing documentation is ahead of the actual implementation in a few places.

### 4. Feature completeness is uneven

The project reads like a broad SaaS product with strong core flows and some modules that are polished, but not all modules are equally mature. The codebase clearly supports the big flows, while a few secondary modules look more like scaffolding or partially finished features.

### 5. External service dependency uncertainty

Many features rely on live credentials and live external services:

- Vapi for voice calls
- Stripe for billing
- Claim.MD/Stedi for insurance
- SMTP for mail

The app can open and run, but many business flows cannot be fully validated without those services configured.

### 6. Demo/product readiness depends on environment configuration

The SetupDemo command shows that features are expected to be activated with proper Vapi and Stripe configuration. Without those keys and webhooks, the app can run but the main AI and billing flows will not be fully functional.

---

## 7. Overall status

### Status: strong core product, partial completion in secondary features

This project is not a simple starter app. It is a substantial healthcare SaaS platform with a real operational model and AI voice automation layer.

The strongest completed areas are:

- multi-tenant structure
- role/feature gating
- AI call workflow integration
- patient and appointment handling
- workflow orchestration
- subscriptions and billing
- platform management

The less complete areas are:

- automated test coverage
- some feature-route activation
- selective modules that still read as partial or redirect-based
- dependency on live third-party services for full verification

---

## 8. Bottom line

This is a serious healthcare AI operations platform that is largely implemented in the backend and UI, especially around clinic operations and Vapi-driven assistant automation. The architecture is solid, the product vision is clear, and the main product is built around real clinic workflows rather than a demo-only shell.

The biggest remaining concern is not the idea or architecture; it is completion quality and operational verification across the remaining modules and live integrations.
