import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Activity, ArrowUpRight, AlertCircle, Plus, Settings, X, Trash2, Power, PowerOff, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import type { Integration } from '@/types';

interface AvailableProvider {
    value: string;
    label: string;
}

interface IntegrationsProps {
    integrations: Integration[];
    stats: {
        activeCount: number;
        totalCount: number;
        errorCount: number;
        uptimePercentage: number;
        daysSinceError: number;
    };
    availableProviders: AvailableProvider[];
}

const getProviderDisplay = (t: any): Record<string, { letter: string; color: string; bgColor: string; description: string }> => ({
    vapi: { letter: 'AI', color: '#06B6D4', bgColor: '#06B6D415', description: t('providers.descriptions.vapi') },
    epic: { letter: 'E', color: '#22D3EE', bgColor: '#22D3EE15', description: t('providers.descriptions.epic') },
    athenahealth: { letter: 'A', color: '#3B82F6', bgColor: '#3B82F615', description: t('providers.descriptions.athenahealth') },
    drchrono: { letter: 'D', color: '#8B5CF6', bgColor: '#8B5CF615', description: t('providers.descriptions.drchrono') },
    twilio_voice: { letter: 'T', color: '#EF4444', bgColor: '#EF444415', description: t('providers.descriptions.twilio_voice') },
    twilio_sms: { letter: 'T', color: '#22C55E', bgColor: '#22C55E15', description: t('providers.descriptions.twilio_sms') },
    sendgrid: { letter: 'SG', color: '#F59E0B', bgColor: '#F59E0B15', description: t('providers.descriptions.sendgrid') },
    google_calendar: { letter: 'G', color: '#3B82F6', bgColor: '#3B82F615', description: t('providers.descriptions.google_calendar') },
    stripe: { letter: 'S', color: '#8B5CF6', bgColor: '#8B5CF615', description: t('providers.descriptions.stripe') },
    dentrix: { letter: 'DX', color: '#22D3EE', bgColor: '#22D3EE15', description: t('providers.descriptions.dentrix') },
    open_dental: { letter: 'OD', color: '#22C55E', bgColor: '#22C55E15', description: t('providers.descriptions.open_dental') },
});

const getProviderNames = (t: any): Record<string, string> => ({
    vapi: t('providers.names.vapi'),
    epic: t('providers.names.epic'),
    athenahealth: t('providers.names.athenahealth'),
    drchrono: t('providers.names.drchrono'),
    twilio_voice: t('providers.names.twilio_voice'),
    twilio_sms: t('providers.names.twilio_sms'),
    sendgrid: t('providers.names.sendgrid'),
    google_calendar: t('providers.names.google_calendar'),
    stripe: t('providers.names.stripe'),
    dentrix: t('providers.names.dentrix'),
    open_dental: t('providers.names.open_dental'),
});

function getTimeSince(dateString: string | null, t: any): string {
    if (!dateString) return t('timeSince.never');
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('timeSince.justNow');
    if (diffMin < 60) return t('timeSince.minAgo').replace('{{count}}', diffMin.toString());
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return t('timeSince.hoursAgo').replace('{{count}}', diffHours.toString());
    const diffDays = Math.floor(diffHours / 24);
    return t('timeSince.daysAgo').replace('{{count}}', diffDays.toString());
}

// ─── Add Integration Modal ──────────────────────────────────────────

function AddIntegrationModal({ availableProviders, onClose }: { availableProviders: AvailableProvider[]; onClose: () => void }) {
    const { t } = useTranslation('integrations');
    const form = useForm({
        provider: '',
        name: '',
    });

    const handleProviderChange = (provider: string) => {
        form.setData(data => ({
            ...data,
            provider,
            name: getProviderNames(t)[provider] || provider,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/integrations', {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">{t('modals.add.title')}</h2>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
                    {availableProviders.length === 0 ? (
                        <p className="font-primary text-[13px] text-[var(--muted-foreground)]">{t('modals.add.allConfigured')}</p>
                    ) : (
                        <>
                            <div className="flex flex-col gap-1.5">
                                <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.add.providerLabel')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableProviders.map((p) => {
                                        const display = getProviderDisplay(t)[p.value] || { letter: '?', color: '#71717A', bgColor: '#71717A15' };
                                        const isSelected = form.data.provider === p.value;
                                        return (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() => handleProviderChange(p.value)}
                                                className={`flex items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-start transition-all ${isSelected
                                                        ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                                        : 'border-[var(--border)] bg-[var(--secondary)] hover:border-[var(--muted-foreground)]'
                                                    }`}
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]" style={{ backgroundColor: display.bgColor }}>
                                                    <span className="font-mono text-[11px] font-bold" style={{ color: display.color }}>{display.letter}</span>
                                                </div>
                                                <span className="font-primary text-[12px] font-medium text-[var(--foreground)]">
                                                    {getProviderNames(t)[p.value] || p.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {form.errors.provider && <span className="font-primary text-[11px] text-red-500">{form.errors.provider}</span>}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.add.displayNameLabel')}</label>
                                <input
                                    type="text"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder={t('modals.add.displayNamePlaceholder')}
                                    className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                />
                                {form.errors.name && <span className="font-primary text-[11px] text-red-500">{form.errors.name}</span>}
                            </div>
                        </>
                    )}

                    <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
                        <Button variant="secondary" type="button" onClick={onClose}>{t('modals.add.cancelBtn')}</Button>
                        {availableProviders.length > 0 && (
                            <Button variant="primary" type="submit" disabled={form.processing || !form.data.provider}>
                                {form.processing ? t('modals.add.addingBtn') : t('modals.add.addBtn')}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Configure Modal ─────────────────────────────────────────────────

function ConfigureModal({ integration, onClose }: { integration: Integration; onClose: () => void }) {
    const { t } = useTranslation('integrations');
    const [processing, setProcessing] = useState(false);

    const isConnected = integration.status === 'connected';
    const isSetup = integration.status === 'setup_required';

    const handleToggleStatus = () => {
        setProcessing(true);
        const newStatus = isConnected ? 'disconnected' : 'connected';
        router.patch(`/integrations/${integration.id}`, { status: newStatus }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setProcessing(false),
        });
    };

    const handleSync = () => {
        setProcessing(true);
        router.post(`/integrations/${integration.id}/sync`, {}, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    const handleDelete = () => {
        setProcessing(true);
        router.delete(`/integrations/${integration.id}`, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setProcessing(false),
        });
    };

    const display = getProviderDisplay(t)[integration.provider] || { letter: '?', color: '#71717A', bgColor: '#71717A15', description: '' };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">{t('modals.configure.title')}</h2>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><X size={16} /></button>
                </div>
                <div className="flex flex-col gap-4 p-5">
                    {/* Integration Info */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]" style={{ backgroundColor: display.bgColor }}>
                            <span className="font-mono text-sm font-bold" style={{ color: display.color }}>{display.letter}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="font-primary text-[14px] font-semibold text-[var(--foreground)]">{integration.name}</span>
                            <Badge variant={isConnected ? 'success' : integration.status === 'error' ? 'error' : 'warning'}>
                                {isConnected ? t('status.connected') : isSetup ? t('status.setupRequired') : integration.status === 'error' ? t('status.error') : t('status.disconnected')}
                            </Badge>
                        </div>
                    </div>

                    <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{display.description}</p>

                    {integration.error_message && (
                        <div className="rounded-[var(--radius-md)] bg-red-500/10 px-3 py-2">
                            <p className="font-mono text-[11px] text-red-400">{integration.error_message}</p>
                        </div>
                    )}

                    {integration.last_synced_at && (
                        <p className="font-mono text-[11px] text-[var(--muted-foreground)]">{t('modals.configure.lastSynced')} {getTimeSince(integration.last_synced_at, t)}</p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
                        <button
                            onClick={handleToggleStatus}
                            disabled={processing}
                            className={`flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 font-primary text-[13px] font-medium transition-colors disabled:opacity-50 ${isConnected
                                    ? 'bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--card-hover)]'
                                    : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90'
                                }`}
                        >
                            {isConnected ? <PowerOff size={14} /> : <Power size={14} />}
                            {processing ? t('modals.configure.processing') : isConnected ? t('modals.configure.disconnectBtn') : t('modals.configure.connectBtn')}
                        </button>
                        {isConnected && (
                            <button
                                onClick={handleSync}
                                disabled={processing}
                                className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--secondary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-hover)] disabled:opacity-50"
                            >
                                <RefreshCw size={14} />
                                Sync now
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            disabled={processing}
                            className="flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 font-primary text-[13px] font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            Remove Integration
                        </button>
                    </div>

                    <div className="flex justify-end border-t border-[var(--border)] pt-4">
                        <Button variant="secondary" onClick={onClose}>{t('modals.configure.closeBtn')}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function Integrations({ integrations, stats, availableProviders }: IntegrationsProps) {
    const { t } = useTranslation('integrations');
    const [showAddModal, setShowAddModal] = useState(false);
    const [configuringIntegration, setConfiguringIntegration] = useState<Integration | null>(null);

    return (
        <>
            <Head title={t('title')} />
            <DashboardLayout title={t('headerTitle')} subtitle={t('subtitle')}>
                <div className="flex flex-col gap-6">
                    {/* Header action */}
                    <div className="flex justify-end">
                        <Button variant="primary" icon={Plus} onClick={() => setShowAddModal(true)}>
                            Add Integration
                        </Button>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t('stats.active')}
                            value={stats.activeCount.toString()}
                            change={`${t('stats.of')} ${stats.totalCount}`}
                            period={t('stats.total')}
                            icon={Zap}
                            iconColor="#22D3EE"
                            iconBgColor="#22D3EE15"
                        />
                        <StatCard
                            label={t('stats.total')}
                            value={stats.totalCount.toString()}
                            change=""
                            period={t('stats.configured')}
                            icon={Activity}
                            iconColor="#22C55E"
                            iconBgColor="#22C55E15"
                        />
                        <StatCard
                            label={t('stats.uptime')}
                            value={`${stats.uptimePercentage}%`}
                            change={stats.daysSinceError > 0 ? `${stats.daysSinceError} ${t('stats.days')}` : ''}
                            period={stats.daysSinceError > 0 ? t('stats.withoutIncident') : ''}
                            icon={ArrowUpRight}
                            iconColor="#8B5CF6"
                            iconBgColor="#8B5CF615"
                        />
                        <StatCard
                            label={t('stats.errors')}
                            value={stats.errorCount.toString()}
                            change=""
                            changeColor="text-[var(--primary)]"
                            period={t('stats.integrationsWithErrors')}
                            icon={AlertCircle}
                            iconColor="#F59E0B"
                            iconBgColor="#F59E0B15"
                        />
                    </div>

                    {/* Integration Cards Grid */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {integrations.map((integration) => {
                            const display = getProviderDisplay(t)[integration.provider] || { letter: '?', color: '#71717A', bgColor: '#71717A15', description: integration.name };
                            const isConnected = integration.status === 'connected';
                            const isSetupRequired = integration.status === 'setup_required';

                            return (
                                <div
                                    key={integration.id}
                                    className="flex flex-col justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5"
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
                                                    style={{ backgroundColor: display.bgColor }}
                                                >
                                                    <span
                                                        className="font-mono text-sm font-bold"
                                                        style={{ color: display.color }}
                                                    >
                                                        {display.letter}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-primary text-[14px] font-semibold text-[var(--foreground)]">
                                                        {integration.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <Badge variant={isConnected ? 'success' : integration.status === 'error' ? 'error' : 'warning'}>
                                                {isConnected ? t('status.connected') : isSetupRequired ? t('status.setupRequired') : integration.status === 'error' ? t('status.error') : t('status.disconnected')}
                                            </Badge>
                                        </div>
                                        <p className="font-primary text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                                            {display.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                                        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                                            {isConnected ? `${t('card.lastSync')}${getTimeSince(integration.last_synced_at, t)}` : isSetupRequired ? t('card.readyToSetup') : integration.error_message || t('card.notConnected')}
                                        </span>
                                        <button
                                            onClick={() => setConfiguringIntegration(integration)}
                                            className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 font-primary text-[12px] font-medium transition-opacity hover:opacity-80 ${isSetupRequired
                                                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                                    : 'border border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)]'
                                                }`}
                                        >
                                            {!isSetupRequired && <Settings size={12} />}
                                            {isSetupRequired ? t('card.connectBtn') : t('card.configureBtn')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {integrations.length === 0 && (
                            <div className="col-span-full py-12 text-center">
                                <p className="font-primary text-[14px] text-[var(--muted-foreground)]">
                                    No integrations configured yet
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>

            {showAddModal && <AddIntegrationModal availableProviders={availableProviders} onClose={() => setShowAddModal(false)} />}
            {configuringIntegration && <ConfigureModal integration={configuringIntegration} onClose={() => setConfiguringIntegration(null)} />}
        </>
    );
}
