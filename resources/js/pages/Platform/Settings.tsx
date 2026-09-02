import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import { FormEvent, useState } from 'react';
import {
    Save, Palette, Mail, Shield, CreditCard, Eye, EyeOff, Loader2, Send,
    CheckCircle2, AlertCircle, Copy, Check, Zap, Trash2, Circle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlatformLayout } from '@/components/PlatformLayout';
import { Badge } from '@/components/Badge';
import type { GatewayConfiguration } from '@/types';
import { router } from '@inertiajs/react';

interface PlatformSettingsProps {
    smtpConfig: SmtpConfig;
    claimMdConfig: ClaimMdConfig;
    gatewayConfigs: GatewayConfiguration[];
    stripeWebhookUrl: string;
    appName: string;
}

interface SmtpConfig {
    mailer: string; host: string; port: string; username: string;
    password: string; encryption: string; from_address: string; from_name: string;
}

interface ClaimMdConfig {
    api_key: string; is_configured: boolean;
}

type TabId = 'branding' | 'smtp' | 'payment-gateways' | 'claim-md';

export default function Settings({ smtpConfig, claimMdConfig, gatewayConfigs, stripeWebhookUrl, appName }: PlatformSettingsProps) {
    const { t } = useTranslation('platform');
    const tr = (key: string, opts?: Record<string, unknown>) => t(`settings.${key}`, opts as never);
    const [activeTab, setActiveTab] = useState<TabId>('branding');

    const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
        { id: 'branding', label: tr('tabs.branding'), icon: Palette },
        { id: 'payment-gateways', label: tr('tabs.paymentGateways'), icon: CreditCard },
        { id: 'smtp', label: tr('tabs.smtp'), icon: Mail },
        { id: 'claim-md', label: tr('tabs.claimMd'), icon: Shield },
    ];

    return (
        <PlatformLayout title={tr('pageTitle')} subtitle={tr('pageSubtitle')}>
            <Head title="Platform Settings" />

            <div className="flex flex-col gap-6 lg:flex-row">
                {/* Tabs */}
                <div className="w-full shrink-0 lg:w-[220px]">
                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-2">
                        <nav className="flex flex-col gap-0.5">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-start transition-colors ${isActive ? 'bg-[var(--accent)] text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)]'}`}
                                    >
                                        <Icon size={16} className={isActive ? 'text-[var(--primary)]' : ''} />
                                        <span className="font-primary text-[13px] font-medium">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-6">
                    {activeTab === 'branding' && <BrandingTab appName={appName} />}
                    {activeTab === 'smtp' && <SmtpTab config={smtpConfig} />}
                    {activeTab === 'payment-gateways' && <PaymentGatewaysTab gatewayConfigs={gatewayConfigs} webhookUrl={stripeWebhookUrl} />}
                    {activeTab === 'claim-md' && <ClaimMdTab config={claimMdConfig} />}
                </div>
            </div>
        </PlatformLayout>
    );
}

// ===================== Branding Tab =====================

function BrandingTab({ appName }: { appName: string }) {
    const { t } = useTranslation('platform');
    const tr = (key: string) => t(`settings.branding.${key}`);
    const form = useForm({ app_name: appName });

    function handleSave(e: FormEvent) {
        e.preventDefault();
        form.put('/platform/settings/app-name', { preserveScroll: true });
    }

    return (
        <Card icon={Palette} title={t('settings.branding.cardTitle')}>
            <form onSubmit={handleSave} className="flex flex-col gap-4 p-5">
                <FieldLabel label={tr('appName')} error={form.errors.app_name}>
                    <input type="text" value={form.data.app_name} onChange={(e) => form.setData('app_name', e.target.value)} placeholder="Loara" className={inputClass} />
                </FieldLabel>
                <div className="border-t border-[var(--border)] pt-4">
                    <SaveBtn processing={form.processing} label={tr('save')} />
                </div>
            </form>
        </Card>
    );
}

// ===================== SMTP Tab =====================

function SmtpTab({ config }: { config: SmtpConfig }) {
    const { t } = useTranslation('platform');
    const tr = (key: string) => t(`settings.smtp.${key}`);
    const form = useForm({ ...config });
    const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [testing, setTesting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    function handleSave(e: FormEvent) { e.preventDefault(); setTestStatus(null); form.put('/platform/settings/smtp', { preserveScroll: true }); }
    function handleTest() {
        setTesting(true); setTestStatus(null);
        axios.post('/platform/settings/smtp/test').then(r => setTestStatus({ type: 'success', message: r.data.message })).catch(e => setTestStatus({ type: 'error', message: e.response?.data?.message ?? t('settings.failed') })).finally(() => setTesting(false));
    }

    const mailers = [
        { value: 'smtp', label: tr('mailers.smtp') }, { value: 'ses', label: tr('mailers.ses') },
        { value: 'postmark', label: tr('mailers.postmark') }, { value: 'resend', label: tr('mailers.resend') },
        { value: 'sendmail', label: tr('mailers.sendmail') }, { value: 'log', label: tr('mailers.log') },
    ];

    return (
        <Card icon={Mail} title={tr('cardTitle')} subtitle={tr('cardSubtitle')}>
            <form onSubmit={handleSave} className="flex flex-col gap-5 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldLabel label={tr('mailDriver')} error={form.errors.mailer}>
                        <select value={form.data.mailer} onChange={e => form.setData('mailer', e.target.value)} className={inputClass}>
                            {mailers.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </FieldLabel>
                    <FieldLabel label={tr('encryption')} error={form.errors.encryption}>
                        <select value={form.data.encryption} onChange={e => form.setData('encryption', e.target.value)} className={inputClass}>
                            <option value="tls">TLS</option><option value="ssl">SSL</option><option value="null">{tr('encryptionNone')}</option>
                        </select>
                    </FieldLabel>
                </div>
                {form.data.mailer === 'smtp' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FieldLabel label={tr('smtpHost')} error={form.errors.host}><input type="text" value={form.data.host} onChange={e => form.setData('host', e.target.value)} placeholder="smtp.gmail.com" dir="ltr" className={inputClass} /></FieldLabel>
                        <FieldLabel label={tr('smtpPort')} error={form.errors.port}><input type="text" value={form.data.port} onChange={e => form.setData('port', e.target.value)} placeholder="587" dir="ltr" className={inputClass} /></FieldLabel>
                        <FieldLabel label={tr('username')} error={form.errors.username}><input type="text" value={form.data.username} onChange={e => form.setData('username', e.target.value)} className={inputClass} /></FieldLabel>
                        <FieldLabel label={tr('password')} error={form.errors.password}>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={form.data.password} onChange={e => form.setData('password', e.target.value)} className={inputClass + ' pe-10'} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                            </div>
                        </FieldLabel>
                    </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldLabel label={tr('fromAddress')} error={form.errors.from_address}><input type="email" value={form.data.from_address} onChange={e => form.setData('from_address', e.target.value)} dir="ltr" className={inputClass} /></FieldLabel>
                    <FieldLabel label={tr('fromName')} error={form.errors.from_name}><input type="text" value={form.data.from_name} onChange={e => form.setData('from_name', e.target.value)} className={inputClass} /></FieldLabel>
                </div>
                {testStatus && <StatusBanner type={testStatus.type} message={testStatus.message} />}
                <div className="flex items-center gap-3 border-t border-[var(--border)] pt-4">
                    <SaveBtn processing={form.processing} />
                    <button type="button" onClick={handleTest} disabled={testing} className={secondaryBtn}>{testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {tr('sendTestEmail')}</button>
                </div>
            </form>
        </Card>
    );
}

// ===================== Payment Gateways Tab =====================

function PaymentGatewaysTab({ gatewayConfigs, webhookUrl }: { gatewayConfigs: GatewayConfiguration[]; webhookUrl: string }) {
    const { t } = useTranslation('platform');
    const tr = (key: string, opts?: Record<string, unknown>) => t(`settings.paymentGateways.${key}`, opts as never);

    const stripe = gatewayConfigs?.find(c => c.gateway === 'stripe') ?? null;
    const statusMap: Record<string, { label: string; variant: 'success' | 'danger' | 'default'; icon: React.ElementType }> = {
        connected: { label: tr('status.connected'), variant: 'success', icon: CheckCircle2 },
        error: { label: tr('status.error'), variant: 'danger', icon: AlertCircle },
        not_configured: { label: tr('status.not_configured'), variant: 'default', icon: Circle },
    };
    const si = statusMap[stripe?.status ?? 'not_configured'] ?? statusMap.not_configured;
    const SI = si.icon;

    const [copied, setCopied] = useState(false);
    const [showPub, setShowPub] = useState(false);
    const [showSec, setShowSec] = useState(false);
    const [showWh, setShowWh] = useState(false);
    const [testing, setTesting] = useState(false);
    const form = useForm({ gateway: 'stripe', publishable_key: '', secret_key: '', webhook_secret: '', is_active: stripe?.is_active ?? false });

    return (
        <Card icon={CreditCard} title={tr('cardTitle')} subtitle={tr('cardSubtitle')}>
            <div className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-2">
                    <Badge variant={si.variant}><SI size={12} className="me-1 inline" />{si.label}</Badge>
                    {stripe?.last_tested_at && <span className="font-mono text-[10px] text-[var(--muted-foreground)]">{tr('tested', { date: new Date(stripe.last_tested_at).toLocaleDateString() })}</span>}
                </div>
                {stripe?.status === 'error' && stripe.error_message && <StatusBanner type="error" message={stripe.error_message} />}
                <div>
                    <label className="mb-1 block font-mono text-[11px] font-medium uppercase text-[var(--muted-foreground)]">{tr('webhookUrl')}</label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"><code className="font-mono text-[12px]" dir="ltr">{webhookUrl}</code></div>
                        <button onClick={() => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)]">{copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}</button>
                    </div>
                </div>
                {stripe?.has_credentials && (
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] p-3 font-mono text-[11px] text-[var(--foreground)]" dir="ltr">
                        <div>{tr('currentKeys.publishable')}: {stripe.publishable_key_last4}</div>
                        <div>{tr('currentKeys.secret')}: {stripe.secret_key_last4}</div>
                        <div>{tr('currentKeys.webhook')}: {stripe.webhook_secret_last4}</div>
                    </div>
                )}
            </div>
            <form onSubmit={e => { e.preventDefault(); form.put('/platform/payment-gateways', { preserveScroll: true }); }} className="border-t border-[var(--border)] p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldLabel label={tr('publishableKey')} error={form.errors.publishable_key}><div className="relative"><input type={showPub ? 'text' : 'password'} value={form.data.publishable_key} onChange={e => form.setData('publishable_key', e.target.value)} placeholder="pk_live_..." dir="ltr" className={inputClass + ' pe-10'} /><button type="button" onClick={() => setShowPub(!showPub)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">{showPub ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></FieldLabel>
                    <FieldLabel label={tr('secretKey')} error={form.errors.secret_key}><div className="relative"><input type={showSec ? 'text' : 'password'} value={form.data.secret_key} onChange={e => form.setData('secret_key', e.target.value)} placeholder="sk_live_..." dir="ltr" className={inputClass + ' pe-10'} /><button type="button" onClick={() => setShowSec(!showSec)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">{showSec ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></FieldLabel>
                </div>
                <div className="mt-4">
                    <FieldLabel label={tr('webhookSecret')} error={form.errors.webhook_secret}><div className="relative"><input type={showWh ? 'text' : 'password'} value={form.data.webhook_secret} onChange={e => form.setData('webhook_secret', e.target.value)} placeholder="whsec_..." dir="ltr" className={inputClass + ' pe-10'} /><button type="button" onClick={() => setShowWh(!showWh)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">{showWh ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></FieldLabel>
                </div>
                <div className="mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-4">
                    <SaveBtn processing={form.processing} label={tr('saveCredentials')} />
                    {stripe?.has_credentials && (
                        <>
                            <button type="button" onClick={() => { setTesting(true); router.post('/platform/payment-gateways/test', { gateway: 'stripe' }, { preserveScroll: true, onFinish: () => setTesting(false) }); }} disabled={testing} className={secondaryBtn}>{testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} {tr('test')}</button>
                            <button type="button" onClick={() => { if (stripe && confirm(tr('removeConfirm'))) router.delete(`/platform/payment-gateways/${stripe.id}`, { preserveScroll: true }); }} className="flex items-center gap-1 text-[12px] text-[var(--destructive)] hover:underline"><Trash2 size={12} /> {tr('remove')}</button>
                        </>
                    )}
                </div>
            </form>
        </Card>
    );
}

// ===================== Claim.MD Tab =====================

function ClaimMdTab({ config }: { config: ClaimMdConfig }) {
    const { t } = useTranslation('platform');
    const tr = (key: string) => t(`settings.claimMd.${key}`);
    const form = useForm({ api_key: config.api_key ?? '' });
    const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [testing, setTesting] = useState(false);
    const [showKey, setShowKey] = useState(false);

    return (
        <Card icon={Shield} title={tr('cardTitle')} subtitle={tr('cardSubtitle')}>
            <form onSubmit={e => { e.preventDefault(); setTestStatus(null); form.put('/platform/settings/claim-md', { preserveScroll: true }); }} className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-2">
                    <span className={`inline-flex h-2 w-2 rounded-full ${config.is_configured ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{config.is_configured ? tr('apiKeyConfigured') : tr('notConfigured')}</span>
                </div>
                <FieldLabel label={tr('apiKey')} error={form.errors.api_key}>
                    <div className="relative">
                        <input type={showKey ? 'text' : 'password'} value={form.data.api_key} onChange={e => form.setData('api_key', e.target.value)} placeholder={tr('apiKeyPlaceholder')} dir="ltr" className={inputClass + ' pe-10 font-mono'} />
                        <button type="button" onClick={() => setShowKey(!showKey)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">{showKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    </div>
                </FieldLabel>
                {testStatus && <StatusBanner type={testStatus.type} message={testStatus.message} />}
                <div className="flex items-center gap-3 border-t border-[var(--border)] pt-4">
                    <SaveBtn processing={form.processing} label={tr('saveApiKey')} />
                    <button type="button" onClick={() => { setTesting(true); setTestStatus(null); axios.post('/platform/settings/claim-md/test').then(r => setTestStatus({ type: 'success', message: r.data.message })).catch(e => setTestStatus({ type: 'error', message: e.response?.data?.message ?? t('settings.failed') })).finally(() => setTesting(false)); }} disabled={testing || !config.is_configured} className={secondaryBtn}>{testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} {tr('testConnection')}</button>
                </div>
            </form>
        </Card>
    );
}

// ===================== Shared Components =====================

const inputClass = 'h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]';
const secondaryBtn = 'flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] disabled:opacity-50';

function Card({ icon: Icon, title, subtitle, children }: { icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
                <Icon size={16} className="text-[var(--primary)]" />
                <div>
                    <h3 className="font-mono text-[14px] font-semibold text-[var(--foreground)]">{title}</h3>
                    {subtitle && <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

function FieldLabel({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{label}</label>
            {children}
            {error && <p className="mt-1 text-[11px] text-[var(--destructive)]">{error}</p>}
        </div>
    );
}

function SaveBtn({ processing, label }: { processing: boolean; label?: string }) {
    const { t } = useTranslation('platform');
    return (
        <button type="submit" disabled={processing} className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-80 disabled:opacity-50">
            {processing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {label ?? t('settings.branding.save')}
        </button>
    );
}

function StatusBanner({ type, message }: { type: 'success' | 'error'; message: string }) {
    return (
        <div className={`flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3 font-primary text-[13px] ${type === 'success' ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border border-red-500/30 bg-red-500/10 text-red-400'}`}>
            {type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {message}
        </div>
    );
}
