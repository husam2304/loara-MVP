import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import {
    Shield,
    CheckCircle2,
    AlertCircle,
    Circle,
    Copy,
    Check,
    Trash2,
    Zap,
    Eye,
    EyeOff,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlatformLayout } from '@/components/PlatformLayout';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import type { GatewayConfiguration } from '@/types';

interface PaymentGatewaysProps {
    gatewayConfigs: GatewayConfiguration[];
    webhookUrl: string;
    availableGateways: { value: string; label: string }[];
}

export default function PaymentGateways({ gatewayConfigs, webhookUrl }: PaymentGatewaysProps) {
    const { t } = useTranslation('admin');
    const tr = (key: string, opts?: Record<string, unknown>) => t(`paymentGateways.${key}`, opts as never);

    const statusConfig = {
        connected: { label: tr('status.connected'), variant: 'success' as const, icon: CheckCircle2 },
        error: { label: tr('status.error'), variant: 'danger' as const, icon: AlertCircle },
        not_configured: { label: tr('status.not_configured'), variant: 'default' as const, icon: Circle },
    };

    const stripeConfig = gatewayConfigs.find(c => c.gateway === 'stripe') ?? null;
    const statusInfo = statusConfig[stripeConfig?.status ?? 'not_configured'];
    const StatusIcon = statusInfo.icon;

    const [copied, setCopied] = useState(false);
    const [showPublishable, setShowPublishable] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [showWebhook, setShowWebhook] = useState(false);
    const [testing, setTesting] = useState(false);

    const form = useForm({
        gateway: 'stripe',
        publishable_key: '',
        secret_key: '',
        webhook_secret: '',
        is_active: stripeConfig?.is_active ?? false,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.put('/platform/payment-gateways', { preserveScroll: true });
    };

    const handleTest = () => {
        setTesting(true);
        router.post('/platform/payment-gateways/test', { gateway: 'stripe' }, {
            preserveScroll: true,
            onFinish: () => setTesting(false),
        });
    };

    const handleRemove = () => {
        if (!stripeConfig || !confirm(tr('actions.removeConfirm'))) return;
        router.delete(`/platform/payment-gateways/${stripeConfig.id}`, { preserveScroll: true });
    };

    const copyWebhookUrl = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <PlatformLayout
            title={tr('pageTitle')}
            subtitle={tr('pageSubtitle')}
        >
            <Head title="Payment Gateways" />

            <div className="space-y-6">
                {/* Status Card */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366F120]">
                                <Shield size={24} className="text-[#6366F1]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--foreground)]">{tr('stripe.name')}</h2>
                                <p className="text-sm text-[var(--muted-foreground)]">
                                    {tr('stripe.description')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={statusInfo.variant}>
                                <StatusIcon size={12} className="me-1 inline" />
                                {statusInfo.label}
                            </Badge>
                            {stripeConfig?.last_tested_at && (
                                <span className="text-xs text-[var(--muted-foreground)]">
                                    {tr('stripe.tested', { date: new Date(stripeConfig.last_tested_at).toLocaleDateString() })}
                                </span>
                            )}
                        </div>
                    </div>

                    {stripeConfig?.status === 'error' && stripeConfig.error_message && (
                        <div className="mt-4 rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/5 p-3">
                            <p className="text-sm text-[var(--destructive)]">
                                <AlertCircle size={14} className="me-1.5 inline -translate-y-px" />
                                {stripeConfig.error_message}
                            </p>
                        </div>
                    )}
                </div>

                {/* Webhook URL */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">{tr('webhook.title')}</h3>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {tr('webhook.instructions')}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                            <code className="font-mono text-sm text-[var(--foreground)]" dir="ltr">{webhookUrl}</code>
                        </div>
                        <button
                            onClick={copyWebhookUrl}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                            title={tr('webhook.copyToClipboard')}
                        >
                            {copied ? <Check size={16} className="text-[var(--success)]" /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                {/* Credentials Form */}
                <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">{tr('credentials.title')}</h3>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {tr('credentials.instructions')}
                    </p>

                    {stripeConfig?.has_credentials && (
                        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                            <p className="text-xs text-[var(--muted-foreground)]">
                                {tr('credentials.currentKeysConfigured')}
                            </p>
                            <div className="mt-2 space-y-1 font-mono text-xs text-[var(--foreground)]" dir="ltr">
                                <div>{tr('credentials.publishable')}: {stripeConfig.publishable_key_last4}</div>
                                <div>{tr('credentials.secret')}: {stripeConfig.secret_key_last4}</div>
                                <div>{tr('credentials.webhook')}: {stripeConfig.webhook_secret_last4}</div>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                                {tr('credentials.publishableKey')}
                            </label>
                            <div className="relative mt-1">
                                <input
                                    type={showPublishable ? 'text' : 'password'}
                                    value={form.data.publishable_key}
                                    onChange={e => form.setData('publishable_key', e.target.value)}
                                    placeholder="pk_live_..."
                                    dir="ltr"
                                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 pe-10 font-mono text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:border-[var(--primary)] focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPublishable(!showPublishable)}
                                    className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                >
                                    {showPublishable ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            {form.errors.publishable_key && (
                                <p className="mt-1 text-xs text-[var(--destructive)]">{form.errors.publishable_key}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                                {tr('credentials.secretKey')}
                            </label>
                            <div className="relative mt-1">
                                <input
                                    type={showSecret ? 'text' : 'password'}
                                    value={form.data.secret_key}
                                    onChange={e => form.setData('secret_key', e.target.value)}
                                    placeholder="sk_live_..."
                                    dir="ltr"
                                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 pe-10 font-mono text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:border-[var(--primary)] focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSecret(!showSecret)}
                                    className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                >
                                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            {form.errors.secret_key && (
                                <p className="mt-1 text-xs text-[var(--destructive)]">{form.errors.secret_key}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                                {tr('credentials.webhookSecret')}
                            </label>
                            <div className="relative mt-1">
                                <input
                                    type={showWebhook ? 'text' : 'password'}
                                    value={form.data.webhook_secret}
                                    onChange={e => form.setData('webhook_secret', e.target.value)}
                                    placeholder="whsec_..."
                                    dir="ltr"
                                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 pe-10 font-mono text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:border-[var(--primary)] focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowWebhook(!showWebhook)}
                                    className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                >
                                    {showWebhook ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            {form.errors.webhook_secret && (
                                <p className="mt-1 text-xs text-[var(--destructive)]">{form.errors.webhook_secret}</p>
                            )}
                        </div>

                        {/* Active toggle */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => form.setData('is_active', !form.data.is_active)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                                    form.data.is_active ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                                }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                        form.data.is_active ? 'translate-x-[18px] rtl:-translate-x-[18px]' : 'translate-x-[3px] rtl:-translate-x-[3px]'
                                    }`}
                                />
                            </button>
                            <span className="text-sm text-[var(--foreground)]">{tr('credentials.enableGateway')}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex items-center gap-3 border-t border-[var(--border)] pt-4">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? tr('actions.saving') : tr('actions.saveConfiguration')}
                        </Button>
                        {stripeConfig?.has_credentials && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleTest}
                                    disabled={testing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
                                >
                                    <Zap size={14} />
                                    {testing ? tr('actions.testing') : tr('actions.testConnection')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemove}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--destructive)]/30 px-3 py-2 text-sm font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
                                >
                                    <Trash2 size={14} />
                                    {tr('actions.remove')}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </PlatformLayout>
    );
}
