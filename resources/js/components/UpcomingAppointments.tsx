import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import type { Appointment } from '@/types';

interface UpcomingAppointmentsProps {
    appointments: Appointment[];
}

const typeColors = [
    { divider: 'var(--primary)', tag: 'var(--primary)', bg: '#22D3EE15' },
    { divider: '#6366F1', tag: '#6366F1', bg: '#6366F115' },
    { divider: 'var(--success)', tag: 'var(--success)', bg: '#22C55E15' },
    { divider: 'var(--warning)', tag: 'var(--warning)', bg: '#F59E0B15' },
];

function formatTime(dateString: string): { hour: string; ampm: string } {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ':00';
    return { hour: `${displayHours}${minuteStr}`, ampm };
}

function getDurationMinutes(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
}

export function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
    const { t } = useTranslation('dashboard');
    const today = new Date();
    const { i18n } = useTranslation();
    const dateLabel = today.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="flex flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                    {t('upcomingAppointments.title')}
                </h3>
                <Link href="/appointments" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)] transition-opacity hover:opacity-80">
                    {dateLabel}
                </Link>
            </div>

            {/* Appointment List */}
            <div className="flex flex-col">
                {appointments.length > 0 ? appointments.map((appt, i) => {
                    const colors = appt.appointment_type?.color
                        ? { divider: appt.appointment_type.color, tag: appt.appointment_type.color, bg: `${appt.appointment_type.color}15` }
                        : typeColors[i % typeColors.length];
                    const time = formatTime(appt.scheduled_at);
                    const duration = getDurationMinutes(appt.scheduled_at, appt.ends_at);
                    const patientName = appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'Unknown Patient';
                    const typeName = appt.appointment_type?.name || t('upcomingAppointments.appointment');
                    const providerName = appt.provider ? `${appt.provider.title} ${appt.provider.last_name}` : '';
                    const description = providerName ? `${typeName} — ${providerName}` : typeName;

                    return (
                        <div
                            key={appt.id}
                            className={`flex items-center gap-3.5 px-5 py-3 ${
                                i < appointments.length - 1 ? 'border-b border-[var(--border)]' : ''
                            }`}
                        >
                            {/* Time */}
                            <div className="flex w-[52px] shrink-0 flex-col items-center gap-0.5">
                                <span className="font-mono text-sm font-semibold text-[var(--foreground)]">
                                    {time.hour}
                                </span>
                                <span className="font-mono text-[9px] font-medium text-[var(--muted-foreground)]">
                                    {time.ampm}
                                </span>
                            </div>

                            {/* Divider */}
                            <div
                                className="h-9 w-[3px] shrink-0 rounded-full"
                                style={{ backgroundColor: colors.divider }}
                            />

                            {/* Info */}
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                    {patientName}
                                </span>
                                <span className="truncate font-primary text-[11px] text-[var(--muted-foreground)]">
                                    {description}
                                </span>
                            </div>

                            {/* Tag */}
                            <div
                                className="shrink-0 rounded-[var(--radius-sm)] px-2.5 py-1"
                                style={{ backgroundColor: colors.bg }}
                            >
                                <span
                                    className="font-mono text-[10px] font-medium"
                                    style={{ color: colors.tag }}
                                >
                                    {duration} min
                                </span>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="px-5 py-8 text-center">
                        <p className="font-primary text-[13px] text-[var(--muted-foreground)]">{t('upcomingAppointments.noUpcoming')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
