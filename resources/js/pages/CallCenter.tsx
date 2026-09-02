import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Phone,
    PhoneIncoming,
    Timer,
    PhoneMissed,
    PhoneOutgoing,
    ChevronLeft,
    ChevronRight,
    FileText,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { CallDetailModal } from '@/components/CallDetailModal';
import type { Call, PaginatedData } from '@/types';

type CallDirectionFilter = 'all' | 'inbound' | 'outbound';

interface CallCenterProps {
    activeCalls: Call[];
    callLog: PaginatedData<Call>;
    stats: {
        activeCalls: number;
        callsToday: number;
        missedCalls: number;
        avgDurationSeconds: number;
    };
}

function formatDuration(seconds: number | null): string {
    if (!seconds) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function getInitials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
}

const getCallTypeLabels = (t: any): Record<string, string> => ({
    appointment: t('callTypes.appointment'),
    insurance: t('callTypes.insurance'),
    billing: t('callTypes.billing'),
    prescription: t('callTypes.prescription'),
    triage: t('callTypes.triage'),
    general: t('callTypes.general'),
    follow_up: t('callTypes.follow_up'),
    reminder: t('callTypes.reminder'),
});

const resolutionBadge: Record<string, 'success' | 'warning' | 'error'> = {
    resolved: 'success',
    escalated: 'error',
    callback_needed: 'warning',
    voicemail: 'warning',
};

function WaveformIndicator() {
    return (
        <div className="flex items-center gap-[2px]">
            {[3, 5, 8, 5, 7, 4, 6, 8, 5, 3, 6, 4, 7, 5, 3].map((height, i) => (
                <div
                    key={i}
                    className="w-[2px] rounded-full bg-[var(--primary)]"
                    style={{ height: `${height * 2}px`, opacity: 0.4 + (height / 8) * 0.6 }}
                />
            ))}
        </div>
    );
}

export default function CallCenter({ activeCalls, callLog, stats }: CallCenterProps) {
    const { t } = useTranslation('callCenter');
    const [activeFilter, setActiveFilter] = useState<CallDirectionFilter>('all');
    const [selectedCallId, setSelectedCallId] = useState<number | null>(null);

    const filteredActiveCalls = activeCalls.filter((call) => {
        if (activeFilter === 'all') return true;
        return call.direction === activeFilter;
    });

    return (
        <>
            <Head title={t('title')} />
            <DashboardLayout
                title={t('headerTitle')}
                subtitle={t('subtitle')}
            >
                <div className="flex flex-col gap-6">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t('stats.activeCalls')}
                            value={stats.activeCalls.toString()}
                            change=""
                            changeColor="text-[var(--primary)]"
                            period={t('stats.inProgress')}
                            icon={Phone}
                            iconColor="#22D3EE"
                            iconBgColor="#22D3EE15"
                        />
                        <StatCard
                            label={t('stats.callsToday')}
                            value={stats.callsToday.toString()}
                            change=""
                            period={t('stats.total')}
                            icon={PhoneIncoming}
                            iconColor="#22C55E"
                            iconBgColor="#22C55E15"
                        />
                        <StatCard
                            label={t('stats.avgDuration')}
                            value={stats.avgDurationSeconds > 0 ? `${Math.round(stats.avgDurationSeconds / 60)}m` : '0m'}
                            change=""
                            changeColor="text-[var(--primary)]"
                            period={t('stats.today')}
                            icon={Timer}
                            iconColor="#8B5CF6"
                            iconBgColor="#8B5CF615"
                        />
                        <StatCard
                            label={t('stats.missedCalls')}
                            value={stats.missedCalls.toString()}
                            change=""
                            period={t('stats.today')}
                            icon={PhoneMissed}
                            iconColor="#EF4444"
                            iconBgColor="#EF444415"
                        />
                    </div>

                    {/* Live Calls */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                            <div className="flex items-center gap-3">
                                <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">{t('liveCalls.title')}</h2>
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 font-mono text-[10px] font-bold text-[var(--primary-foreground)]">
                                    {activeCalls.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] p-0.5">
                                {([['all', t('liveCalls.filters.all')], ['inbound', t('liveCalls.filters.inbound')], ['outbound', t('liveCalls.filters.outbound')]] as const).map(([value, label]) => (
                                    <button
                                        key={value}
                                        onClick={() => setActiveFilter(value)}
                                        className={`rounded-[var(--radius-sm)] px-3 py-1.5 font-primary text-[12px] font-medium transition-colors ${activeFilter === value
                                            ? 'bg-[var(--accent)] text-[var(--foreground)]'
                                            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="divide-y divide-[var(--border)]">
                            {filteredActiveCalls.length > 0 ? filteredActiveCalls.map((call) => {
                                const callerName = call.patient ? `${call.patient.first_name} ${call.patient.last_name}` : (call.caller_name || t('liveCalls.unknownCaller'));
                                const avatarColor = call.patient?.avatar_color || '#22D3EE';
                                return (
                                    <div key={call.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--card-hover)]">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${avatarColor}20` }}>
                                            <span className="font-primary text-xs font-semibold" style={{ color: avatarColor }}>
                                                {getInitials(callerName)}
                                            </span>
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-primary text-[13px] font-semibold text-[var(--foreground)]">{callerName}</span>
                                                <Badge variant="success">{call.direction === 'inbound' ? 'Inbound' : 'Outbound'}</Badge>
                                            </div>
                                            <span className="font-mono text-[12px] text-[var(--muted-foreground)]">{call.caller_phone}</span>
                                        </div>
                                        <span className="hidden font-primary text-[13px] text-[var(--muted-foreground)] md:block">
                                            {getCallTypeLabels(t)[call.type] || call.type}
                                        </span>
                                        <div className="hidden items-center gap-4 lg:flex">
                                            <WaveformIndicator />
                                        </div>
                                        <span className="font-mono text-[13px] font-medium text-[var(--foreground)]">
                                            {formatDuration(call.duration_seconds)}
                                        </span>
                                    </div>
                                );
                            }) : (
                                <div className="px-5 py-8 text-center">
                                    <p className="font-primary text-[13px] text-[var(--muted-foreground)]">{t('liveCalls.noActiveCalls')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Call Log */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                            <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">{t('callLog.title')}</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--border)]">
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('callLog.columns.caller')}</th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('callLog.columns.phone')}</th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('callLog.columns.type')}</th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('callLog.columns.category')}</th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('callLog.columns.duration')}</th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('callLog.columns.status')}</th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {callLog.data.map((entry) => {
                                        const callerName = entry.patient ? `${entry.patient.first_name} ${entry.patient.last_name}` : (entry.caller_name || t('callLog.unknown'));
                                        const avatarColor = entry.patient?.avatar_color || '#22D3EE';
                                        return (
                                            <tr key={entry.id} className="transition-colors hover:bg-[var(--card-hover)]">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${avatarColor}20` }}>
                                                            <span className="font-primary text-[10px] font-semibold" style={{ color: avatarColor }}>
                                                                {getInitials(callerName)}
                                                            </span>
                                                        </div>
                                                        <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">{callerName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 font-mono text-[12px] text-[var(--muted-foreground)]">{entry.caller_phone}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        {entry.direction === 'inbound' ? <PhoneIncoming size={13} className="text-[var(--success)]" /> : <PhoneOutgoing size={13} className="text-[var(--primary)]" />}
                                                        <span className="font-primary text-[12px] font-medium text-[var(--foreground)]">{entry.direction === 'inbound' ? 'Inbound' : 'Outbound'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 font-primary text-[13px] text-[var(--muted-foreground)]">
                                                    {getCallTypeLabels(t)[entry.type] || entry.type}
                                                </td>
                                                <td className="px-5 py-3 font-mono text-[12px] text-[var(--foreground)]">
                                                    {formatDuration(entry.duration_seconds)}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <Badge variant={entry.resolution ? (resolutionBadge[entry.resolution] || 'warning') : 'warning'}>
                                                        {entry.resolution ? entry.resolution.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : entry.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </Badge>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <button
                                                        onClick={() => setSelectedCallId(entry.id)}
                                                        className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-2 py-1 font-mono text-[11px] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                                                    >
                                                        <FileText size={13} />
                                                        {t('callLog.viewTranscript', 'View')}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {callLog.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
                                <span className="font-primary text-[12px] text-[var(--muted-foreground)]">
                                    {t('callLog.pagination').replace('{{from}}', String(callLog.from)).replace('{{to}}', String(callLog.to)).replace('{{total}}', String(callLog.total))}
                                </span>
                                <div className="flex items-center gap-1">
                                    {callLog.links.map((link, index) => {
                                        if (index === 0) {
                                            return <Link key="prev" href={link.url || '#'} preserveState preserveScroll className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] ${!link.url ? 'pointer-events-none opacity-50' : ''}`}><ChevronLeft size={14} className="rtl:rotate-180" /></Link>;
                                        }
                                        if (index === callLog.links.length - 1) {
                                            return <Link key="next" href={link.url || '#'} preserveState preserveScroll className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] ${!link.url ? 'pointer-events-none opacity-50' : ''}`}><ChevronRight size={14} className="rtl:rotate-180" /></Link>;
                                        }
                                        if (link.label === '...') return <span key={`e-${index}`} className="px-1 font-mono text-[12px] text-[var(--muted-foreground)]">...</span>;
                                        return <Link key={link.label} href={link.url || '#'} preserveState preserveScroll className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] font-mono text-[12px] font-medium ${link.active ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'border border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)]'}`}>{link.label}</Link>;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>
            <CallDetailModal callId={selectedCallId} onClose={() => setSelectedCallId(null)} />

        </>
    );
}
