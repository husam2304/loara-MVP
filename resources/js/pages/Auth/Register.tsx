import { Head, router } from '@inertiajs/react';
import { Headphones, ArrowLeft, ArrowRight, Check, Building2, User, CreditCard, Eye } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PlanOption {
    slug: string;
    name: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    minutes_limit: number;
    concurrent_limit: number;
    team_member_limit: number;
    features: string[];
}

interface RegisterFormData {
    name: string;
    email: string;
    clinic_name: string;
    phone: string;
    address: string;
    timezone: string;
    plan: string;
    billing_cycle: string;
}

interface RegisterProps {
    step: number;
    formData: RegisterFormData;
    plans: PlanOption[];
    trialDays: number;
    errors: Record<string, string>;
}

const commonTimezones = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto',
    'America/Vancouver', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Australia/Sydney',
];

export default function Register({ step, formData, plans, trialDays, errors }: RegisterProps) {
    const { t } = useTranslation('auth');

    const featureLabels: Record<string, string> = {
        ai_calls: t('register.features.ai_calls'),
        appointment_booking: t('register.features.appointment_booking'),
        basic_analytics: t('register.features.basic_analytics'),
        advanced_analytics: t('register.features.advanced_analytics'),
        sms: t('register.features.sms'),
        integrations: t('register.features.integrations'),
        triage: t('register.features.triage'),
        campaigns: t('register.features.campaigns'),
        custom_workflows: t('register.features.custom_workflows'),
        priority_support: t('register.features.priority_support'),
    };

    const steps = [
        { num: 1, label: t('register.steps.account'), icon: User },
        { num: 2, label: t('register.steps.clinic'), icon: Building2 },
        // { num: 3, label: t('register.steps.plan'), icon: CreditCard },
        // { num: 4, label: t('register.steps.review'), icon: Eye },
    ];

    const [form, setForm] = useState({
        name: formData.name,
        email: formData.email,
        password: '',
        password_confirmation: '',
        clinic_name: formData.clinic_name,
        phone: formData.phone,
        address: formData.address,
        timezone: formData.timezone || 'America/New_York',
        plan: formData.plan,
        billing_cycle: formData.billing_cycle || 'monthly',
    });
    const [processing, setProcessing] = useState(false);

    function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function submitStep(e: FormEvent) {
        e.preventDefault();
        setProcessing(true);

        const stepData: Record<number, Record<string, string>> = {
            1: { name: form.name, email: form.email, password: form.password, password_confirmation: form.password_confirmation },
            // 2: { clinic_name: form.clinic_name, phone: form.phone, address: form.address, timezone: form.timezone },
            // 3: { plan: 'enterprise' , billing_cycle: 'monthly'/*form.billing_cycle*/ },
        };

        router.post(`/register/step/${step}`, stepData[step] ?? {}, {
            onFinish: () => setProcessing(false),
        });
    }

    function completeRegistration() {
        setProcessing(true);
        const step2data = { clinic_name: form.clinic_name, phone: form.phone, address: form.address, timezone: form.timezone };

        router.post('/register/step/2', step2data, {
            onFinish: () => {
                const step3data = { plan: 'enterprise', billing_cycle: 'monthly'/*form.billing_cycle*/ };
                router.post('/register/step/3', step3data, {
                    onFinish: () => router.post('/register/complete', {}, {
                        onFinish: () => setProcessing(false),
                    }),
                });
            },
        });

    }

    function goBack() {
        router.post(`/register/back/${step - 1}`);
    }

    const selectedPlan = plans.find((p) => p.slug === form.plan);
    const price = form.billing_cycle === 'yearly' && selectedPlan
        ? (selectedPlan.price_yearly / 12).toFixed(0)
        : selectedPlan?.price_monthly.toFixed(0) ?? '0';

    return (
        <>
            <Head title={`Register — Step ${step}`} />
            <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8">
                <div className="w-full max-w-[520px]">
                    {/* Logo */}
                    <div className="mb-6 flex flex-col items-center gap-3" >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]" onClick={(e) => window.location.href = '/'}>
                            <Headphones size={24} className="text-[var(--primary-foreground)]" />
                        </div>
                        <h1 className="font-mono text-xl font-bold text-[var(--foreground)]">{t('register.createAccount')}</h1>
                    </div>

                    {/* Step indicator */}
                    <div className="mb-6 flex items-center justify-center gap-2">
                        {steps.map((s) => {
                            const Icon = s.icon;
                            const isActive = s.num === step;
                            const isCompleted = s.num < step;
                            return (
                                <div key={s.num} className="flex items-center gap-2">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${isCompleted
                                            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                            : isActive
                                                ? 'border-2 border-[var(--primary)] text-[var(--primary)]'
                                                : 'border border-[var(--border)] text-[var(--muted-foreground)]'
                                            }`}
                                    >
                                        {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                                    </div>
                                    <span className={`hidden font-mono text-[11px] font-medium sm:inline ${isActive ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                                        {s.label}
                                    </span>
                                    {s.num < 4 && <div className="hidden h-px w-6 bg-[var(--border)] sm:block" />}
                                </div>
                            );
                        })}
                    </div>

                    {/* Card */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
                        {/* Step 1: Account Details */}
                        {step === 1 && (
                            <form onSubmit={submitStep} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="name" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('register.fields.fullName')}</label>
                                    <input id="name" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus
                                        className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                        placeholder={t('register.fields.fullNamePlaceholder')} />
                                    {errors.name && <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.name}</span>}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="email" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('register.fields.email')}</label>
                                    <input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                                        className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                        placeholder={t('register.fields.emailPlaceholder')} />
                                    {errors.email && <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.email}</span>}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="password" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('register.fields.password')}</label>
                                    <input id="password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
                                        className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                        placeholder={t('register.fields.passwordPlaceholder')} />
                                    {errors.password && <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.password}</span>}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="password_confirmation" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('register.fields.confirmPassword')}</label>
                                    <input id="password_confirmation" type="password" value={form.password_confirmation} onChange={(e) => set('password_confirmation', e.target.value)}
                                        className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                        placeholder={t('register.fields.confirmPasswordPlaceholder')} />
                                </div>
                                <button type="submit" disabled={processing}
                                    className="mt-2 flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] font-primary text-[13px] font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50">
                                    {processing ? t('register.actions.processing') : t('register.actions.continue')} {!processing && <ArrowRight size={14} className="rtl:rotate-180" />}
                                </button>
                            </form>
                        )}

                        {/* Step 2: Clinic Info */}
                        {step === 2 && (
                            <form onSubmit={submitStep} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="clinic_name" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('register.fields.clinicName')}</label>
                                    <input id="clinic_name" type="text" value={form.clinic_name} onChange={(e) => set('clinic_name', e.target.value)} autoFocus
                                        className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                        placeholder={t('register.fields.clinicNamePlaceholder')} />
                                    {errors.clinic_name && <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.clinic_name}</span>}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="phone" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('register.fields.phone')}</label>
                                    <input id="phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                                        className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                        placeholder={t('register.fields.phonePlaceholder')} />
                                    {errors.phone && <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.phone}</span>}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="address" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('register.fields.address')}</label>
                                    <input id="address" type="text" value={form.address} onChange={(e) => set('address', e.target.value)}
                                        className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                        placeholder={t('register.fields.addressPlaceholder')} />
                                    {errors.address && <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.address}</span>}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="timezone" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('register.fields.timezone')}</label>
                                    <select id="timezone" value={form.timezone} onChange={(e) => set('timezone', e.target.value)}
                                        className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]">
                                        {commonTimezones.map((tz) => (
                                            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                                        ))}
                                    </select>
                                    {errors.timezone && <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.timezone}</span>}
                                </div>
                                <div className="mt-2 flex gap-3">
                                    <button type="button" onClick={goBack}
                                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] font-primary text-[13px] text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]">
                                        <ArrowLeft size={14} className="rtl:rotate-180" /> {t('register.actions.back')}
                                    </button>
                                    <button type="button" onClick={completeRegistration} disabled={processing}
                                        className="flex h-10 flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] font-primary text-[13px] font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50">
                                        {processing ? t('register.actions.creatingAccount') : t('register.actions.startTrial', { days: trialDays })}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 3: Plan Selection */}
                        {step === 3 && (
                            <form onSubmit={submitStep} className="flex flex-col gap-4">
                                {/* Billing toggle */}
                                <div className="flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--secondary)] p-1">
                                    <button type="button" onClick={() => set('billing_cycle', 'monthly')}
                                        className={`rounded-full px-4 py-1.5 font-mono text-[12px] font-medium transition-all ${form.billing_cycle === 'monthly' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                                        {t('register.billing.monthly')}
                                    </button>
                                    <button type="button" onClick={() => set('billing_cycle', 'yearly')}
                                        className={`rounded-full px-4 py-1.5 font-mono text-[12px] font-medium transition-all ${form.billing_cycle === 'yearly' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                                        {t('register.billing.yearly')} <span className="ms-1 text-[10px] text-[var(--success)]">{t('register.billing.save20')}</span>
                                    </button>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    {plans.map((plan) => {
                                        const isSelected = form.plan === plan.slug;
                                        const displayPrice = form.billing_cycle === 'yearly'
                                            ? (plan.price_yearly / 12).toFixed(0)
                                            : plan.price_monthly.toFixed(0);
                                        return (
                                            <button key={plan.slug} type="button" onClick={() => set('plan', plan.slug)}
                                                className={`flex flex-col rounded-xl border p-4 text-start transition-all ${isSelected ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] hover:border-[var(--primary)]/30'}`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-[13px] font-bold text-[var(--foreground)]">{plan.name}</span>
                                                    {isSelected && <Check size={16} className="text-[var(--primary)]" />}
                                                </div>
                                                <div className="mt-1 flex items-baseline gap-0.5">
                                                    <span className="font-mono text-2xl font-bold text-[var(--foreground)]">${displayPrice}</span>
                                                    <span className="text-[11px] text-[var(--muted-foreground)]">{t('register.billing.perMonth')}</span>
                                                </div>
                                                <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                                                    {plan.minutes_limit === -1 ? t('register.billing.unlimited') : plan.minutes_limit.toLocaleString()} {t('register.billing.minSuffix')} &bull; {plan.team_member_limit === -1 ? t('register.billing.unlimited') : plan.team_member_limit} {t('register.billing.membersSuffix')}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.plan && <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.plan}</span>}

                                <div className="mt-2 flex gap-3">
                                    <button type="button" onClick={goBack}
                                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] font-primary text-[13px] text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]">
                                        <ArrowLeft size={14} className="rtl:rotate-180" /> {t('register.actions.back')}
                                    </button>
                                    <button type="submit" disabled={processing || !form.plan}
                                        className="flex h-10 flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] font-primary text-[13px] font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50">
                                        {processing ? t('register.actions.processing') : t('register.actions.continue')} {!processing && <ArrowRight size={14} className="rtl:rotate-180" />}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 4: Review & Confirm */}
                        {step === 4 && (
                            <div className="flex flex-col gap-5">
                                <div className="space-y-4">
                                    <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4">
                                        <h3 className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('register.review.account')}</h3>
                                        <p className="mt-1 font-primary text-[13px] text-[var(--foreground)]">{formData.name}</p>
                                        <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{formData.email}</p>
                                    </div>
                                    <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4">
                                        <h3 className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('register.review.clinic')}</h3>
                                        <p className="mt-1 font-primary text-[13px] text-[var(--foreground)]">{formData.clinic_name}</p>
                                        {formData.phone && <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{formData.phone}</p>}
                                        <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{formData.timezone.replace(/_/g, ' ')}</p>
                                    </div>
                                    <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4">
                                        <h3 className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('register.review.plan')}</h3>
                                        <div className="mt-1 flex items-baseline justify-between">
                                            <span className="font-primary text-[13px] font-semibold text-[var(--foreground)]">{selectedPlan?.name ?? formData.plan}</span>
                                            <span className="font-mono text-[13px] text-[var(--foreground)]">${price}{t('register.billing.perMonth')}</span>
                                        </div>
                                        <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('register.billing.billedPrefix', { cycle: formData.billing_cycle })}</p>
                                        {selectedPlan && (
                                            <div className="mt-2 space-y-1">
                                                {selectedPlan.features.map((f) => (
                                                    <div key={f} className="flex items-center gap-1.5">
                                                        <Check size={12} className="text-[var(--primary)]" />
                                                        <span className="text-[11px] text-[var(--muted-foreground)]">{featureLabels[f] ?? f}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-3 text-center">
                                    <p className="font-primary text-[13px] font-medium text-[var(--primary)]">
                                        {t('register.trial.notice', { days: trialDays })}
                                    </p>
                                    <p className="mt-0.5 font-primary text-[11px] text-[var(--muted-foreground)]">
                                        {t('register.trial.subNotice')}
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button type="button" onClick={goBack}
                                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] font-primary text-[13px] text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]">
                                        <ArrowLeft size={14} className="rtl:rotate-180" /> {t('register.actions.back')}
                                    </button>
                                    <button type="button" onClick={completeRegistration} disabled={processing}
                                        className="flex h-10 flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] font-primary text-[13px] font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50">
                                        {processing ? t('register.actions.creatingAccount') : t('register.actions.startTrial', { days: trialDays })}
                                    </button>
                                </div>

                                <p className="text-center font-primary text-[11px] text-[var(--muted-foreground)]">
                                    {t('register.alreadyHaveAccount')}{' '}
                                    <a href="/login" className="text-[var(--primary)] hover:underline">{t('register.signIn')}</a>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sign in link (steps 1-3) */}
                    {step < 4 && (
                        <p className="mt-4 text-center font-primary text-[12px] text-[var(--muted-foreground)]">
                            {t('register.alreadyHaveAccount')}{' '}
                            <a href="/login" className="text-[var(--primary)] hover:underline">{t('register.signIn')}</a>
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
