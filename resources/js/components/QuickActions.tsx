import { PhoneOutgoing, CalendarPlus, UserPlus, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

interface QuickAction {
    icon: LucideIcon;
    label: string;
    iconColor: string;
    iconBg: string;
    href: string;
}

const actions: QuickAction[] = [
    {
        icon: CalendarPlus,
        label: 'Manual Appointment',
        iconColor: '#6366F1',
        iconBg: '#6366F115',
        href: '/appointments',
    },
    {
        icon: UserPlus,
        label: 'Add New Patient',
        iconColor: 'var(--success)',
        iconBg: '#22C55E15',
        href: '/patients',
    },
    {
        icon: FileText,
        label: 'View Call Transcripts',
        iconColor: 'var(--warning)',
        iconBg: '#F59E0B15',
        href: '/call-center',
    },
];

export function QuickActions() {
    const { t } = useTranslation('dashboard');

    const translatedActions: QuickAction[] = actions.map(action => ({
        ...action,
        label:
            action.label === 'Start Outbound Campaign' ? t('quickActions.actions.startCampaign')
                : action.label === 'Manual Appointment' ? t('quickActions.actions.manualAppointment')
                    : action.label === 'Add New Patient' ? t('quickActions.actions.addPatient')
                        : t('quickActions.actions.viewTranscripts')
    }));
    return (
        <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            {/* Header */}
            <div className="border-b border-[var(--border)] px-5 py-4">
                <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                    {t('quickActions.title')}
                </h3>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 p-3">
                {translatedActions.map((action, i) => (
                    <button
                        key={i}
                        onClick={() => router.visit(action.href)}
                        className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--accent)] px-3.5 py-2.5 transition-colors hover:bg-[var(--card-hover)]"
                    >
                        <div
                            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[var(--radius-md)]"
                            style={{ backgroundColor: action.iconBg }}
                        >
                            <action.icon size={14} style={{ color: action.iconColor }} />
                        </div>
                        <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                            {action.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
