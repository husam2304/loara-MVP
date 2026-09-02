import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CreditCard,
    Crown,
    Zap,
    Rocket,
    Building2,
    Check,
    ArrowUpRight,
    Clock,
    FileText,
    Download,
    AlertTriangle,
    TrendingUp,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { UsageProgress } from '@/components/UsageProgress';
import type { ClinicSubscription, Invoice, SubscriptionPlanConfig, BillingUsage } from '@/types';

interface BillingProps {
    subscription: ClinicSubscription | null;
    plans: SubscriptionPlanConfig[];
    usage: BillingUsage;
    invoices: Invoice[];
    trialDays: number;
    checkoutProcessing?: boolean;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

const planIcons: Record<string, typeof Crown> = {
    starter: Zap,
    growth: Rocket,
    professional: Crown,
    enterprise: Building2,
};

const planColors: Record<string, { bg: string; text: string; border: string }> = {
    starter: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    growth: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    professional: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    enterprise: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
};

const getStatusBadge = (t: any): Record<string, { variant: 'success' | 'warning' | 'error' | 'default'; label: string }> => ({
    active: { variant: 'success', label: t('status.active') },
    trialing: { variant: 'default', label: t('status.trialing') },
    past_due: { variant: 'warning', label: t('status.past_due') },
    cancelled: { variant: 'error', label: t('status.cancelled') },
});

const getFeatureLabels = (t: any): Record<string, string> => ({
    ai_calls: t('features.ai_calls'),
    appointment_booking: t('features.appointment_booking'),
    basic_analytics: t('features.basic_analytics'),
    advanced_analytics: t('features.advanced_analytics'),
    sms: t('features.sms'),
    integrations: t('features.integrations'),
    triage: t('features.triage'),
    campaigns: t('features.campaigns'),
    custom_workflows: t('features.custom_workflows'),
    priority_support: t('features.priority_support'),
});

export default function Billing({ subscription, plans, usage, invoices, trialDays, checkoutProcessing = false }: BillingProps) {
    const { t } = useTranslation('billing');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [processing, setProcessing] = useState(false);

    // After returning from Stripe checkout the subscription is created by the
    // webhook asynchronously. Poll the page until it appears so the buyer never
    // sees a stale "subscribe" prompt for a plan they just paid for.
    useEffect(() => {
        if (!checkoutProcessing) return;
        const timer = setTimeout(() => {
            router.reload({ only: ['subscription', 'usage', 'invoices', 'checkoutProcessing'] });
        }, 3000);
        return () => clearTimeout(timer);
    }, [checkoutProcessing]);

    const handleCheckout = (planKey: string) => {
        setProcessing(true);
        router.post('/billing/checkout', {
            plan: planKey,
            billing_cycle: billingCycle,
        }, {
            onFinish: () => setProcessing(false),
        });
    };

    const handleCancel = () => {
        if (!confirm(t('currentPlan.cancelConfirm'))) return;
        setProcessing(true);
        router.post('/billing/cancel', {}, {
            onFinish: () => setProcessing(false),
        });
    };

    const handleResume = () => {
        setProcessing(true);
        router.post('/billing/resume', {}, {
            onFinish: () => setProcessing(false),
        });
    };

    const handleSwap = (planKey: string) => {
        setProcessing(true);
        router.post('/billing/swap', {
            plan: planKey,
            billing_cycle: billingCycle,
        }, {
            onFinish: () => setProcessing(false),
        });
    };

    const handlePortal = () => {
        router.get('/billing/portal');
    };

    const currentPlan = subscription?.plan;
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
    const isCancelled = !!subscription?.cancelled_at;

    return (
        <DashboardLayout title={t('title')} subtitle={t('subtitle')}>
            <Head title={t('title')} />
            <div className="mx-auto max-w-6xl space-y-8">
                {checkoutProcessing && (
                    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                        <Clock className="h-4 w-4 animate-spin" />
                        <span>{t('finalizing')}</span>
                    </div>
                )}

                {/* Current Plan Section */}
                <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('currentPlan.title')}</h2>
                        {subscription && (
                            <Badge variant={getStatusBadge(t)[subscription.status]?.variant ?? 'default'}>
                                {getStatusBadge(t)[subscription.status]?.label ?? subscription.status}
                            </Badge>
                        )}
                    </div>

                    {subscription ? (
                        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-start gap-4">
                                {(() => {
                                    const PlanIcon = planIcons[subscription.plan] || CreditCard;
                                    const colors = planColors[subscription.plan] || planColors.starter;
                                    return (
                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}>
                                            <PlanIcon size={22} className={colors.text} />
                                        </div>
                                    );
                                })()}
                                <div>
                                    <h3 className="text-xl font-bold capitalize text-[var(--foreground)]">
                                        {subscription.plan} Plan
                                    </h3>
                                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                                        {formatCurrency(subscription.price_monthly)}/month
                                        {subscription.billing_cycle === 'yearly' && ' (billed annually)'}
                                    </p>
                                    <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                                        {t('currentPlan.currentPeriod')} {formatDate(subscription.current_period_start)} — {formatDate(subscription.current_period_end)}
                                    </p>
                                    {subscription.trial_ends_at && subscription.status === 'trialing' && (
                                        <p className="mt-1 text-[12px] text-[var(--primary)]">
                                            {t('currentPlan.trialEnds')} {formatDate(subscription.trial_ends_at)}
                                        </p>
                                    )}
                                    {isCancelled && (
                                        <p className="mt-1 text-[12px] text-[var(--destructive)]">
                                            {t('currentPlan.cancelsAtEnd')} ({formatDate(subscription.current_period_end)})
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {isCancelled ? (
                                    <Button onClick={handleResume} disabled={processing}>
                                        Resume Subscription
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="outline" onClick={handlePortal}>
                                            <CreditCard size={14} className="me-1.5" />
                                            Manage Payment
                                        </Button>
                                        <Button variant="outline" onClick={handleCancel} disabled={processing}
                                            className="text-[var(--destructive)] hover:text-[var(--destructive)]"
                                        >
                                            Cancel Plan
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-[var(--border)] py-10">
                            <CreditCard size={36} className="text-[var(--muted-foreground)]" />
                            <div className="text-center">
                                <p className="font-medium text-[var(--foreground)]">{t('currentPlan.noSubscription')}</p>
                                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                                    {t('currentPlan.choosePlanPrompt').replace('{{days}}', trialDays.toString())}
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                {/* Usage Dashboard */}
                <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <TrendingUp size={18} className="text-[var(--primary)]" />
                        <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('usage.title')}</h2>
                    </div>

                    <UsageProgress
                        label={t('usage.aiCallMinutes')}
                        used={usage.minutes_used}
                        limit={usage.minutes_limit}
                        percentage={usage.minutes_percentage}
                    />

                    {usage.daily_usage.length > 0 && (
                        <div className="mt-6">
                            <h3 className="mb-3 text-[13px] font-medium text-[var(--muted-foreground)]">
                                Daily Usage (last 30 days)
                            </h3>
                            <div className="flex h-24 items-end gap-[3px]">
                                {usage.daily_usage.map((day) => {
                                    const maxVal = Math.max(...usage.daily_usage.map((d) => d.quantity), 1);
                                    const height = Math.max(2, (day.quantity / maxVal) * 100);
                                    return (
                                        <div
                                            key={day.date}
                                            className="group relative flex-1 rounded-t bg-[var(--primary)] opacity-80 transition-opacity hover:opacity-100"
                                            style={{ height: `${height}%` }}
                                            title={`${day.date}: ${Math.round(day.quantity)} min`}
                                        />
                                    );
                                })}
                            </div>
                            <div className="mt-1 flex justify-between text-[10px] text-[var(--muted-foreground)]">
                                <span>{usage.daily_usage.length > 0 ? usage.daily_usage[0].date : ''}</span>
                                <span>{usage.daily_usage.length > 0 ? usage.daily_usage[usage.daily_usage.length - 1].date : ''}</span>
                            </div>
                        </div>
                    )}
                </section>

                {/* Plan Comparison */}
                <section>
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('plans.title')}</h2>
                        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] p-1">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-all ${billingCycle === 'monthly'
                                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-all ${billingCycle === 'yearly'
                                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                Yearly
                                <span className="ms-1 text-[10px] opacity-75">{t('plans.save20')}</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {plans.map((plan) => {
                            const isCurrent = currentPlan === plan.key;
                            const PlanIcon = planIcons[plan.key] || CreditCard;
                            const colors = planColors[plan.key] || planColors.starter;
                            const price = billingCycle === 'yearly'
                                ? Math.round(plan.price_yearly / 12)
                                : plan.price_monthly;

                            return (
                                <div
                                    key={plan.key}
                                    className={`relative flex flex-col rounded-[var(--radius-lg)] border p-5 transition-all ${isCurrent
                                        ? `${colors.border} bg-[var(--card)] ring-1 ring-[var(--primary)]/20`
                                        : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/30'
                                        }`}
                                >
                                    {isCurrent && (
                                        <div className="absolute -top-3 end-4 rounded-full bg-[var(--primary)] px-3 py-0.5 text-[10px] font-semibold text-[var(--primary-foreground)]">
                                            Current
                                        </div>
                                    )}

                                    <div className="mb-4 flex items-center gap-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}>
                                            <PlanIcon size={18} className={colors.text} />
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-bold capitalize text-[var(--foreground)]">
                                                {plan.name}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <span className="font-mono text-3xl font-bold text-[var(--foreground)]">
                                            {formatCurrency(price)}
                                        </span>
                                        <span className="text-sm text-[var(--muted-foreground)]">{t('plans.perMo')}</span>
                                        {billingCycle === 'yearly' && (
                                            <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                                                {formatCurrency(plan.price_yearly)} billed yearly
                                            </p>
                                        )}
                                    </div>

                                    <div className="mb-4 space-y-1.5 text-sm">
                                        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                            <Clock size={13} />
                                            <span>
                                                {plan.minutes_limit === -1 ? 'Unlimited' : plan.minutes_limit.toLocaleString()} {t('plans.minutesMo')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-5 flex-1 space-y-2">
                                        {plan.features.map((feature) => (
                                            <div key={feature} className="flex items-start gap-2">
                                                <Check size={14} className={`mt-0.5 shrink-0 ${colors.text}`} />
                                                <span className="text-[12px] text-[var(--muted-foreground)]">{getFeatureLabels(t)[feature] ?? feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {isCurrent ? (
                                        <Button variant="outline" disabled className="w-full">
                                            Current Plan
                                        </Button>
                                    ) : isActive ? (
                                        <Button onClick={() => handleSwap(plan.key)} disabled={processing} className="w-full">
                                            Switch to {plan.name}
                                            <ArrowUpRight size={14} className="ms-1" />
                                        </Button>
                                    ) : (
                                        <Button onClick={() => handleCheckout(plan.key)} disabled={processing} className="w-full">
                                            Get Started
                                            <ArrowUpRight size={14} className="ms-1" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Invoice History */}
                <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <FileText size={18} className="text-[var(--primary)]" />
                        <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('invoices.title')}</h2>
                    </div>

                    {invoices.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--border)]">
                                        <th className="pb-3 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                                            Invoice
                                        </th>
                                        <th className="pb-3 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                                            Date
                                        </th>
                                        <th className="pb-3 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                                            Amount
                                        </th>
                                        <th className="pb-3 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                                            Status
                                        </th>
                                        <th className="pb-3 text-end text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                                            PDF
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id} className="group">
                                            <td className="py-3 text-sm font-medium text-[var(--foreground)]">
                                                {invoice.number}
                                            </td>
                                            <td className="py-3 text-sm text-[var(--muted-foreground)]">
                                                {invoice.paid_at ? formatDate(invoice.paid_at) : formatDate(invoice.due_at)}
                                            </td>
                                            <td className="py-3 font-mono text-sm text-[var(--foreground)]">
                                                {formatCurrency(invoice.total)}
                                            </td>
                                            <td className="py-3">
                                                <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'failed' ? 'error' : 'warning'}>
                                                    {invoice.status}
                                                </Badge>
                                            </td>
                                            <td className="py-3 text-end">
                                                {invoice.pdf_url && (
                                                    <a
                                                        href={invoice.pdf_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[12px] text-[var(--primary)] hover:underline"
                                                    >
                                                        <Download size={13} />
                                                        PDF
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            <FileText size={28} className="text-[var(--muted-foreground)]" />
                            <p className="text-sm text-[var(--muted-foreground)]">{t('invoices.noInvoices')}</p>
                        </div>
                    )}
                </section>
            </div>
        </DashboardLayout>
    );
}
