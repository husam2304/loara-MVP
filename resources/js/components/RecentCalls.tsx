import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Badge } from './Badge';
import type { Call } from '@/types';

interface RecentCallsProps {
    calls: Call[];
}







function getInitials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
}

function formatDuration(seconds: number | null): string {
    if (!seconds) return '';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec.toString().padStart(2, '0')}s`;
}

export function RecentCalls({ calls }: RecentCallsProps) {
    const { t } = useTranslation('dashboard');

    const callTypeLabels: Record<string, string> = {
        'inbound': t('recentCalls.inbound'),
        'outbound': t('recentCalls.outbound'),
        'campaign': t('recentCalls.campaign'),
    };

    const statusBadge: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
        'completed': { label: t('recentCalls.completed'), variant: 'success' },
        'missed': { label: t('recentCalls.missed'), variant: 'error' },
        'voicemail': { label: t('recentCalls.voicemail'), variant: 'warning' },
        'failed': { label: t('recentCalls.failed'), variant: 'error' },
        'in-progress': { label: t('recentCalls.inProgress'), variant: 'info' },
    };

    const resolutionBadge: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
        'booked': { label: t('recentCalls.booked'), variant: 'success' },
        'transferred': { label: t('recentCalls.transferred'), variant: 'info' },
        'resolved': { label: t('recentCalls.resolved'), variant: 'default' },
        'escalated': { label: t('recentCalls.escalated'), variant: 'warning' },
    };

    return (
        <div className="flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] lg:w-[420px]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                    {t('recentCalls.title')}
                </h3>
                <Link href="/call-center" className="font-primary text-xs font-medium text-[var(--primary)] transition-opacity hover:opacity-80">
                    {t('recentCalls.viewAll')}
                </Link>
            </div>

            {/* Call List */}
            <div className="flex flex-col">
                {calls.length > 0 ? calls.map((call, i) => {
                    const callerName = call.patient ? `${call.patient.first_name} ${call.patient.last_name}` : (call.caller_name || t('recentCalls.unknownCaller'));
                    const avatarColor = call.patient?.avatar_color || '#22D3EE';
                    const badge = call.resolution ? resolutionBadge[call.resolution] : statusBadge[call.status];
                    const typeLabel = callTypeLabels[call.type] || call.type;
                    const duration = formatDuration(call.duration_seconds);
                    const description = `${typeLabel}${duration ? ` — ${duration}` : ''}`;

                    return (
                        <div
                            key={call.id}
                            className={`flex items-center gap-3 px-5 py-3 ${
                                i < calls.length - 1 ? 'border-b border-[var(--border)]' : ''
                            }`}
                        >
                            <div
                                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
                                style={{ backgroundColor: `${avatarColor}15` }}
                            >
                                <span
                                    className="font-primary text-[11px] font-semibold"
                                    style={{ color: avatarColor }}
                                >
                                    {getInitials(callerName)}
                                </span>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                    {callerName}
                                </span>
                                <span className="truncate font-primary text-[11px] text-[var(--muted-foreground)]">
                                    {description}
                                </span>
                            </div>
                            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                        </div>
                    );
                }) : (
                    <div className="px-5 py-8 text-center">
                        <p className="font-primary text-[13px] text-[var(--muted-foreground)]">{t('recentCalls.noRecentCalls')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
