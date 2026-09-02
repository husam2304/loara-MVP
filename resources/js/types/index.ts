export interface Clinic {
    id: number;
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    timezone: string;
    logo_url: string | null;
    favicon_url: string | null;
    website: string | null;
    after_hours_ai_enabled: boolean;
    updated_at: string;
    operating_hours: ClinicOperatingHour[];
}

export interface ClinicOperatingHour {
    id: number;
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'super_admin' | 'clinic_owner' | 'provider' | 'staff' | 'billing' | 'customer';
    phone: string | null;
    avatar_url: string | null;
    title: string | null;
    is_active: boolean;
    email_verified: boolean;
    last_active_at: string | null;
    two_factor_enabled: boolean;
    session_timeout_minutes: number;
}

export interface Provider {
    id: number;
    user_id: number | null;
    first_name: string;
    last_name: string;
    full_name: string;
    title: string;
    specialty: string;
    npi_number: string | null;
    color: string;
    is_active: boolean;
    schedules?: ProviderSchedule[];
    block_times?: ProviderBlockTime[];
    appointments?: Appointment[];
}

export interface ProviderSchedule {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
}

export interface ProviderBlockTime {
    id: number;
    start_at: string;
    end_at: string;
    reason: string | null;
}

export interface Patient {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    phone: string;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    preferred_language: string;
    status: 'active' | 'inactive' | 'deceased';
    source: 'walk_in' | 'referral' | 'ai_call' | 'website' | 'phone';
    avatar_color: string | null;
    notes: string | null;
    // Relationships (optional, loaded when needed)
    insurance_policies?: PatientInsurance[];
    allergies?: PatientAllergy[];
    medications?: PatientMedication[];
    vitals?: PatientVital[];
    appointments?: Appointment[];
    // Computed
    latest_insurance_name?: string | null;
    last_visit_date?: string | null;
}

export interface PatientAllergy {
    id: number;
    allergen: string;
    severity: 'mild' | 'moderate' | 'severe';
    reaction: string | null;
}

export interface PatientMedication {
    id: number;
    medication_name: string;
    dosage: string;
    frequency: string;
    start_date: string;
    end_date: string | null;
    refill_date: string | null;
    is_active: boolean;
    prescribing_provider?: Provider | null;
}

export interface PatientVital {
    id: number;
    heart_rate: number | null;
    blood_pressure_systolic: number | null;
    blood_pressure_diastolic: number | null;
    temperature: number | null;
    weight: number | null;
    height: number | null;
    oxygen_saturation: number | null;
    respiratory_rate: number | null;
    recorded_at: string;
}

export interface PatientInsurance {
    id: number;
    member_id: string;
    group_number: string | null;
    plan_type: string;
    copay_amount: number | null;
    is_primary: boolean;
    effective_date: string;
    expiration_date: string | null;
    insurance_provider?: InsuranceProvider;
}

export interface InsuranceProvider {
    id: number;
    name: string;
    payer_id: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    is_accepted: boolean;
    plan_types: string[];
}

export interface AppointmentType {
    id: number;
    name: string;
    duration_minutes: number;
    color: string;
    is_active: boolean;
    sort_order: number;
}

export interface Appointment {
    id: number;
    patient_id: number;
    provider_id: number;
    appointment_type_id: number;
    scheduled_at: string;
    ends_at: string;
    status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
    room: string | null;
    reason: string | null;
    notes: string | null;
    source: 'phone' | 'ai' | 'online' | 'walk_in';
    confirmation_sent_at: string | null;
    reminder_sent_at: string | null;
    call_id: number | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    // Relationships
    patient?: Patient;
    provider?: Provider;
    appointment_type?: AppointmentType;
}

export interface WaitlistEntry {
    id: number;
    patient_id: number;
    appointment_type_id: number | null;
    preferred_provider_id: number | null;
    preferred_date_start: string | null;
    preferred_date_end: string | null;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'waiting' | 'offered' | 'booked' | 'expired' | 'cancelled';
    notes: string | null;
    created_at: string;
    // Relationships
    patient?: Patient;
    appointment_type?: AppointmentType;
    preferred_provider?: Provider;
}

export interface Call {
    id: number;
    vapi_call_id: string | null;
    direction: 'inbound' | 'outbound' | 'web';
    caller_phone: string;
    caller_name: string | null;
    patient_id: number | null;
    type: 'appointment' | 'insurance' | 'billing' | 'prescription' | 'triage' | 'general' | 'follow_up' | 'reminder';
    status: 'queued' | 'ringing' | 'in_progress' | 'completed' | 'missed' | 'failed' | 'transferred' | 'voicemail' | 'ended';
    end_reason: string | null;
    duration_seconds: number | null;
    started_at: string;
    ended_at: string | null;
    answered_at: string | null;
    ai_handled: boolean;
    ai_confidence_score: number | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    language: string;
    resolution: 'resolved' | 'escalated' | 'callback_needed' | 'voicemail' | null;
    summary: string | null;
    cost: number | null;
    // Relationships
    patient?: Patient | null;
    transcripts?: CallTranscript[];
    recording?: CallRecording | null;
}

export interface CallTranscript {
    id: number;
    speaker: 'ai' | 'patient' | 'staff';
    content: string;
    timestamp_ms: number;
    confidence: number | null;
}

export interface CallRecording {
    id: number;
    file_url: string | null;
    duration_seconds: number;
    is_redacted: boolean;
}

export interface InsuranceClaim {
    id: number;
    patient_id: number;
    appointment_id: number | null;
    insurance_provider_id: number;
    claim_number: string;
    amount: number;
    approved_amount: number | null;
    status: 'submitted' | 'pending' | 'in_review' | 'approved' | 'denied' | 'appealed';
    submitted_at: string;
    resolved_at: string | null;
    denial_reason: string | null;
    notes: string | null;
    claim_md_id: string | null;
    payer_claim_id: string | null;
    claim_md_status: string | null;
    paid_amount: number | null;
    submitted_to_payer_at: string | null;
    // Relationships
    patient?: Patient;
    insurance_provider?: InsuranceProvider;
}

export interface PriorAuthorization {
    id: number;
    patient_id: number;
    insurance_provider_id: number;
    authorization_number: string;
    procedure_name: string;
    procedure_code: string | null;
    status: 'pending' | 'approved' | 'denied' | 'expired';
    requested_at: string;
    decided_at: string | null;
    expires_at: string | null;
    notes: string | null;
    // Relationships
    patient?: Patient;
    insurance_provider?: InsuranceProvider;
}

export interface EligibilityVerification {
    id: number;
    patient_id: number;
    patient_insurance_id: number;
    insurance_provider_id: number;
    provider_id: number | null;
    status: 'active' | 'inactive' | 'error' | 'unknown';
    payer_id: string;
    member_id: string;
    service_date: string;
    service_type_codes: string[] | null;
    plan_details: Record<string, string> | null;
    coverages: Record<string, string | number> | null;
    error_message: string | null;
    created_at: string;
    // Relationships
    patient?: Patient;
    insurance_provider?: InsuranceProvider;
}

export interface TriageRule {
    id: number;
    name: string;
    description: string | null;
    priority: 'critical' | 'high' | 'medium' | 'low';
    conditions: Record<string, unknown>;
    action: 'transfer_immediately' | 'transfer_nurse' | 'queue_callback' | 'send_alert' | 'route_to_voicemail';
    target_role: string | null;
    target_user_id: number | null;
    is_active: boolean;
    sort_order: number;
    keywords?: TriageKeyword[];
}

export interface TriageKeyword {
    id: number;
    keyword: string;
    category: 'emergency' | 'clinical' | 'billing' | 'general';
}

export interface EscalationPath {
    id: number;
    level: number;
    name: string;
    description: string | null;
    target_role: string;
    timeout_seconds: number;
    is_active: boolean;
}

export interface TriageStaffMember {
    id: number;
    name: string;
    role: string;
}

export interface Integration {
    id: number;
    provider: string;
    name: string;
    status: 'connected' | 'disconnected' | 'error' | 'setup_required';
    last_synced_at: string | null;
    error_message: string | null;
}

export interface VapiConfiguration {
    id: number;
    model_provider: string;
    model: string;
    temperature: number;
    confidence_threshold: number;
    max_response_time_ms: number;
    voice_provider: string;
    voice_id: string | null;
    voice_name: string;
    speaking_rate: number;
    language: string;
    transcriber_provider: string;
    transcriber_model: string | null;
    greeting_message: string | null;
    greeting_message_ar: string | null;
    after_hours_message: string | null;
    after_hours_message_ar: string | null;
    system_prompt: string | null;
    system_prompt_ar: string | null;
    sentiment_analysis_enabled: boolean;
    auto_escalation_enabled: boolean;
    multi_language_enabled: boolean;
    continuous_learning_enabled: boolean;
    vapi_assistant_id: string | null;
    vapi_phone_number_id: string | null;
    vapi_phone_number: string | null;
    vapi_phone_number_status: 'active' | 'activating' | 'blocked' | null;
    vapi_phone_number_sip_uri: string | null;
    vapi_phone_number_provider: 'vapi' | 'twilio' | 'vonage' | 'telnyx' | 'byo-phone-number' | null;
    vapi_knowledge_base_tool_id: string | null;
    max_call_duration_seconds: number;
    silence_timeout_seconds: number;
    end_call_message: string | null;
    end_call_message_ar: string | null;
    first_message_mode: string;
    hipaa_enabled: boolean;
    interruptions_enabled: boolean;
    backchanneling_enabled: boolean;
    background_sound: string;
    enable_recording: boolean;
    voicemail_detection_enabled: boolean;
    vapi_function_tool_ids: string[] | null;
    updated_at: string | null;
}

export interface ClinicSubscription {
    id: number;
    plan: 'starter' | 'growth' | 'professional' | 'enterprise';
    billing_cycle: 'monthly' | 'yearly';
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    price_monthly: number;
    call_limit: number;
    minutes_limit: number;
    concurrent_limit: number;
    team_member_limit: number;
    current_period_start: string;
    current_period_end: string;
    cancelled_at: string | null;
    trial_ends_at: string | null;
    gateway: string;
}

export interface SubscriptionPlanConfig {
    key: string;
    name: string;
    description?: string | null;
    price_monthly: number;
    price_yearly: number;
    minutes_limit: number;
    concurrent_limit: number;
    team_member_limit: number;
    features: string[];
}

export interface PlanConfiguration {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    minutes_limit: number;
    concurrent_limit: number;
    team_member_limit: number;
    features: string[];
    stripe_price_monthly: string | null;
    stripe_price_yearly: string | null;
    is_active: boolean;
    sort_order: number;
    subscriber_count?: number;
}

export interface GatewayConfiguration {
    id: number;
    gateway: 'stripe' | 'stedi' | 'claim_md';
    is_active: boolean;
    status: 'not_configured' | 'connected' | 'error';
    error_message: string | null;
    last_tested_at: string | null;
    has_credentials: boolean;
    publishable_key_last4: string | null;
    secret_key_last4: string | null;
    webhook_secret_last4: string | null;
}

export interface BillingUsage {
    minutes_used: number;
    minutes_limit: number;
    minutes_percentage: number;
    remaining_minutes: number;
    daily_usage: { date: string; quantity: number }[];
}

export interface Invoice {
    id: number;
    number: string;
    amount: number;
    tax: number;
    total: number;
    status: 'paid' | 'pending' | 'overdue' | 'failed';
    period_start: string;
    period_end: string;
    paid_at: string | null;
    due_at: string;
    pdf_url: string | null;
}

export interface UsageRecord {
    id: number;
    type: 'ai_call_minutes' | 'concurrent_calls' | 'sms_sent' | 'api_calls';
    quantity: number;
    recorded_date: string;
}

export interface AuditLog {
    id: number;
    user_id: number | null;
    action: string;
    description: string | null;
    status: 'success' | 'failed' | 'warning';
    created_at: string;
    user?: User | null;
}

export interface KnowledgeBaseFile {
    id: number;
    clinic_id: number;
    original_name: string;
    file_size: number;
    mime_type: string;
    vapi_file_id: string;
    created_at: string;
    updated_at: string;
}

export interface NotificationSetting {
    id: number;
    email_enabled: boolean;
    sms_enabled: boolean;
    push_enabled: boolean;
    missed_call_alerts: boolean;
    escalation_alerts: boolean;
    daily_digest: boolean;
    appointment_change_alerts: boolean;
    system_alerts: boolean;
    quiet_hours_enabled: boolean;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
}

export interface Task {
    id: number;
    title: string;
    description: string | null;
    type: 'callback' | 'follow_up' | 'review' | 'insurance' | 'prescription' | 'general';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    due_at: string | null;
    completed_at: string | null;
    patient?: Patient | null;
    assigned_user?: User | null;
}

// Pagination wrapper from Laravel
export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface OutboundCallInfo {
    id: number;
    phone: string;
    name: string | null;
    status: string;
}

export interface CallStatusResponse {
    id: number;
    status: string;
    duration_seconds: number | null;
    ended_at: string | null;
    end_reason: string | null;
    transcript?: string | null;
}

export interface ClinicReminderSetting {
    id: number;
    clinic_id: number;
    reminders_enabled: boolean;
    reminder_hours: number[];
}

export interface HeaderNotification {
    id: string;
    type: 'missed_call' | 'cancelled_appointment' | 'upcoming_appointment';
    title: string;
    time: string;
    url: string;
}

// Landing Page CMS content types
export interface LandingPageTrustBadge {
    icon: string;
    text: string;
}

export interface LandingPageHero {
    badge_text: string;
    headline_line1: string;
    headline_line2: string;
    highlight_word: string;
    description: string;
    primary_cta_text: string;
    secondary_cta_text: string;
    voice_demo_enabled: boolean;
    voice_demo_text: string;
    trust_badges: LandingPageTrustBadge[];
}

export interface LandingPageFeatureItem {
    icon: string;
    title: string;
    description: string;
}

export interface LandingPageFeatures {
    label: string;
    heading: string;
    description: string;
    items: LandingPageFeatureItem[];
}

export interface LandingPageStep {
    number: string;
    icon: string;
    title: string;
    description: string;
}

export interface LandingPageHowItWorks {
    label: string;
    heading: string;
    steps: LandingPageStep[];
}

export interface LandingPageStatItem {
    value: string;
    label: string;
}

export interface LandingPageStats {
    items: LandingPageStatItem[];
}

export interface LandingPagePricing {
    label: string;
    heading: string;
    description: string;
}

export interface LandingPageCta {
    headline: string;
    description: string;
    primary_button_text: string;
    secondary_button_text: string;
}

export interface LandingPageSocialLink {
    platform: string;
    url: string;
}

export interface LandingPageFooter {
    copyright_text: string;
    social_links: LandingPageSocialLink[];
}

export interface LandingPageFlowCard {
    type: string;
    icon?: string;
    title?: string;
    content?: string;
    top_label?: string;
    text?: string;
    color?: string;
}

export interface LandingPageWorkflows {
    booking_flow: LandingPageFlowCard[];
    triage_flow: LandingPageFlowCard[];
}

export interface LandingPageShowcaseItem {
    title: string;
    description: string;
    image: string;
    bullets: string[];
}

export interface LandingPageShowcase {
    label: string;
    heading: string;
    description: string;
    items: LandingPageShowcaseItem[];
}

export interface LandingPageSecurityItem {
    icon: string;
    title: string;
    description: string;
}

export interface LandingPageSecurity {
    label: string;
    heading: string;
    description: string;
    items: LandingPageSecurityItem[];
}

export interface LandingPageTestimonialItem {
    quote: string;
    name: string;
    role: string;
}

export interface LandingPageTestimonials {
    label: string;
    heading: string;
    description: string;
    items: LandingPageTestimonialItem[];
}

export interface LandingPageFaqItem {
    question: string;
    answer: string;
}

export interface LandingPageFaq {
    label: string;
    heading: string;
    description: string;
    items: LandingPageFaqItem[];
}

export interface LandingPageContent {
    hero: LandingPageHero;
    features: LandingPageFeatures;
    how_it_works: LandingPageHowItWorks;
    stats: LandingPageStats;
    pricing: LandingPagePricing;
    cta: LandingPageCta;
    footer: LandingPageFooter;
    workflows: LandingPageWorkflows;
    showcase: LandingPageShowcase;
    security: LandingPageSecurity;
    testimonials: LandingPageTestimonials;
    faq: LandingPageFaq;
}

// Shared page props (available on all pages via HandleInertiaRequests)
export type PlanFeature =
    | 'ai_calls'
    | 'appointment_booking'
    | 'basic_analytics'
    | 'advanced_analytics'
    | 'sms'
    | 'integrations'
    | 'triage'
    | 'campaigns'
    | 'custom_workflows'
    | 'priority_support';

export interface Impersonating {
    admin_name: string;
    admin_id: number;
}

export interface SharedProps {
    [key: string]: unknown;
    appName: string;
    clinic: Clinic | null;
    auth: {
        user: User | null;
    };
    planFeatures: PlanFeature[];
    impersonating: Impersonating | null;
    flash: {
        success?: string;
        error?: string;
        outbound_calls?: OutboundCallInfo[];
        billing_warning?: string;
    };
    notifications: HeaderNotification[];
}
