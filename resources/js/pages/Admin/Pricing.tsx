import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    Users,
    Clock,
    Zap,
    X,
    Check,
    RefreshCw,
    ExternalLink,
    Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';

interface PlanConfiguration {
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
    stripe_product_id: string | null;
    stripe_price_monthly: string | null;
    stripe_price_yearly: string | null;
    is_active: boolean;
    sort_order: number;
    subscriber_count: number;
}

interface PricingProps {
    plans: PlanConfiguration[];
}

const allFeatureKeys = [
    'ai_calls', 'appointment_booking', 'basic_analytics', 'advanced_analytics',
    'sms', 'integrations', 'triage', 'campaigns', 'custom_workflows', 'priority_support',
];

const defaultPlanData = {
    slug: '',
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    minutes_limit: 500,
    concurrent_limit: 2,
    team_member_limit: 3,
    features: ['ai_calls', 'appointment_booking', 'basic_analytics'] as string[],
    stripe_price_monthly: '',
    stripe_price_yearly: '',
    is_active: true,
};

export default function Pricing({ plans }: PricingProps) {
    const { t } = useTranslation('admin');
    const tr = (key: string, opts?: Record<string, unknown>) => t(`pricing.${key}`, opts as never);
    const featureLabels: Record<string, string> = Object.fromEntries(
        allFeatureKeys.map((k) => [k, tr(`features.${k}`)])
    );

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<PlanConfiguration | null>(null);
    const [syncingPlanId, setSyncingPlanId] = useState<number | null>(null);

    const createForm = useForm({ ...defaultPlanData });
    const editForm = useForm({ ...defaultPlanData });

    const formatLimit = (value: number) => (value === -1 ? tr('unlimited') : value.toLocaleString());
    const formatPrice = (value: number) => `$${Number(value).toLocaleString()}`;

    const handleCreate = (e: FormEvent) => {
        e.preventDefault();
        createForm.post('/platform/pricing', {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            },
        });
    };

    const handleEdit = (plan: PlanConfiguration) => {
        setEditingPlan(plan);
        editForm.setData({
            slug: plan.slug,
            name: plan.name,
            description: plan.description ?? '',
            price_monthly: plan.price_monthly,
            price_yearly: plan.price_yearly,
            minutes_limit: plan.minutes_limit,
            concurrent_limit: plan.concurrent_limit,
            team_member_limit: plan.team_member_limit,
            features: plan.features,
            stripe_price_monthly: plan.stripe_price_monthly ?? '',
            stripe_price_yearly: plan.stripe_price_yearly ?? '',
            is_active: plan.is_active,
        });
    };

    const handleUpdate = (e: FormEvent) => {
        e.preventDefault();
        if (!editingPlan) return;
        editForm.patch(`/platform/pricing/${editingPlan.id}`, {
            onSuccess: () => setEditingPlan(null),
        });
    };

    const handleDelete = (plan: PlanConfiguration) => {
        if (plan.subscriber_count > 0) {
            alert(tr('actions.deleteBlocked', { count: plan.subscriber_count }));
            return;
        }
        if (confirm(tr('actions.deleteConfirm', { name: plan.name }))) {
            router.delete(`/platform/pricing/${plan.id}`);
        }
    };

    const handleSyncToStripe = (plan: PlanConfiguration) => {
        setSyncingPlanId(plan.id);
        router.post(`/platform/pricing/${plan.id}/sync-stripe`, {}, {
            preserveScroll: true,
            onFinish: () => setSyncingPlanId(null),
        });
    };

    const toggleFeature = (form: typeof createForm, feature: string) => {
        const current = form.data.features;
        if (current.includes(feature)) {
            form.setData('features', current.filter(f => f !== feature));
        } else {
            form.setData('features', [...current, feature]);
        }
    };

    const hasStripeSync = (plan: PlanConfiguration) =>
        plan.stripe_product_id && plan.stripe_price_monthly && plan.stripe_price_yearly;

    const renderPlanForm = (form: typeof createForm, onSubmit: (e: FormEvent) => void, submitLabel: string, onClose: () => void) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{submitLabel}</h3>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pe-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('form.name')}</label>
                            <input
                                type="text"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                            />
                            {form.errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{form.errors.name}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('form.slug')}</label>
                            <input
                                type="text"
                                value={form.data.slug}
                                onChange={(e) => form.setData('slug', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                placeholder={tr('form.slugPlaceholder')}
                                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--primary)]"
                            />
                            {form.errors.slug && <p className="mt-1 text-xs text-[var(--destructive)]">{form.errors.slug}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('form.description')}</label>
                        <input
                            type="text"
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('form.monthlyPrice')}</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.data.price_monthly}
                                onChange={(e) => form.setData('price_monthly', parseFloat(e.target.value) || 0)}
                                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('form.yearlyPrice')}</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.data.price_yearly}
                                onChange={(e) => form.setData('price_yearly', parseFloat(e.target.value) || 0)}
                                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('form.minutesLimit')}</label>
                            <input
                                type="number"
                                value={form.data.minutes_limit}
                                onChange={(e) => form.setData('minutes_limit', parseInt(e.target.value) || 0)}
                                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                            />
                            <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{tr('form.unlimitedHint')}</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('form.concurrent')}</label>
                            <input
                                type="number"
                                value={form.data.concurrent_limit}
                                onChange={(e) => form.setData('concurrent_limit', parseInt(e.target.value) || 0)}
                                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('form.team')}</label>
                            <input
                                type="number"
                                value={form.data.team_member_limit}
                                onChange={(e) => form.setData('team_member_limit', parseInt(e.target.value) || 0)}
                                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">{tr('form.features')}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {allFeatureKeys.map((feature) => (
                                <label key={feature} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--sidebar-hover)]">
                                    <input
                                        type="checkbox"
                                        checked={form.data.features.includes(feature)}
                                        onChange={() => toggleFeature(form, feature)}
                                        className="rounded border-[var(--border)]"
                                    />
                                    <span className="text-[var(--foreground)]">{featureLabels[feature]}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="plan_active"
                            checked={form.data.is_active}
                            onChange={(e) => form.setData('is_active', e.target.checked)}
                            className="rounded border-[var(--border)]"
                        />
                        <label htmlFor="plan_active" className="text-sm text-[var(--foreground)]">{tr('form.activeVisible')}</label>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" type="button" onClick={onClose}>{tr('form.cancel')}</Button>
                        <Button type="submit" disabled={form.processing}>{submitLabel}</Button>
                    </div>
                </form>
            </div>
        </div>
    );

    return (
        <DashboardLayout title={tr('pageTitle')} subtitle={tr('pageSubtitle')}>
            <Head title="Pricing Management" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--muted-foreground)]">{tr('planCount', { count: plans.length })}</p>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus size={16} />
                        {tr('addPlan')}
                    </Button>
                </div>

                {/* Plan Cards */}
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative rounded-xl border bg-[var(--card)] p-5 transition-shadow hover:shadow-md ${plan.is_active ? 'border-[var(--border)]' : 'border-dashed border-[var(--muted-foreground)] opacity-60'
                                }`}
                        >
                            <div className="mb-4 flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--foreground)]">{plan.name}</h3>
                                    <p className="text-xs text-[var(--muted-foreground)]">{plan.slug}</p>
                                </div>
                                <Badge variant={plan.is_active ? 'success' : 'danger'}>
                                    {plan.is_active ? tr('status.active') : tr('status.inactive')}
                                </Badge>
                            </div>

                            {plan.description && (
                                <p className="mb-4 text-xs text-[var(--muted-foreground)]">{plan.description}</p>
                            )}

                            <div className="mb-4">
                                <span className="text-2xl font-bold text-[var(--foreground)]">{formatPrice(plan.price_monthly)}</span>
                                <span className="text-sm text-[var(--muted-foreground)]">{tr('perMonth')}</span>
                                <p className="text-xs text-[var(--muted-foreground)]">{formatPrice(plan.price_yearly)}{tr('perYear')}</p>
                            </div>

                            <div className="mb-4 space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                    <Clock size={14} />
                                    <span>{formatLimit(plan.minutes_limit)} {tr('minutes')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                    <Zap size={14} />
                                    <span>{formatLimit(plan.concurrent_limit)} {tr('concurrent')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                    <Users size={14} />
                                    <span>{formatLimit(plan.team_member_limit)} {tr('teamMembers')}</span>
                                </div>
                            </div>

                            <div className="mb-4 space-y-1">
                                {plan.features.map((f) => (
                                    <div key={f} className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                                        <Check size={12} className="text-[var(--success)]" />
                                        {featureLabels[f] ?? f}
                                    </div>
                                ))}
                            </div>

                            <div className="mb-3 rounded-lg bg-[var(--sidebar-bg)] px-3 py-2 text-center">
                                <span className="text-sm font-semibold text-[var(--foreground)]">{plan.subscriber_count}</span>
                                <span className="text-xs text-[var(--muted-foreground)]"> {tr('subscribers')}</span>
                            </div>

                            {/* Stripe Sync Status */}
                            <div className="mb-3">
                                {hasStripeSync(plan) ? (
                                    <div className="flex items-center justify-between rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/5 px-3 py-2">
                                        <div className="flex items-center gap-1.5">
                                            <Check size={12} className="text-[var(--success)]" />
                                            <span className="text-xs font-medium text-[var(--success)]">{tr('stripe.synced')}</span>
                                        </div>
                                        <button
                                            onClick={() => handleSyncToStripe(plan)}
                                            disabled={syncingPlanId === plan.id}
                                            className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
                                            title={tr('stripe.resync')}
                                        >
                                            {syncingPlanId === plan.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <RefreshCw size={14} />
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleSyncToStripe(plan)}
                                        disabled={syncingPlanId === plan.id}
                                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#6366F1]/30 bg-[#6366F1]/10 px-3 py-2 text-xs font-medium text-[#6366F1] transition-colors hover:bg-[#6366F1]/20 disabled:opacity-50"
                                    >
                                        {syncingPlanId === plan.id ? (
                                            <><Loader2 size={12} className="animate-spin" /> {tr('stripe.creating')}</>
                                        ) : (
                                            <><ExternalLink size={12} /> {tr('stripe.createProduct')}</>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(plan)}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--sidebar-hover)]"
                                >
                                    <Edit2 size={14} /> {tr('actions.edit')}
                                </button>
                                <button
                                    onClick={() => handleDelete(plan)}
                                    className="flex items-center justify-center rounded-lg border border-[var(--border)] p-2 text-[var(--muted-foreground)] transition-colors hover:border-[var(--destructive)] hover:text-[var(--destructive)]"
                                    title={tr('actions.delete')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showCreateModal && renderPlanForm(createForm, handleCreate, tr('form.createTitle'), () => {
                setShowCreateModal(false);
                createForm.reset();
            })}

            {editingPlan && renderPlanForm(editForm, handleUpdate, tr('form.updateTitle'), () => setEditingPlan(null))}
        </DashboardLayout>
    );
}
