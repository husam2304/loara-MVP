import { Head, router, useForm } from '@inertiajs/react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { usePatientSearch } from '@/hooks/usePatientSearch';
import {
    Calendar,
    CalendarPlus,
    Clock,
    UserX,
    User,
    ListOrdered,
    Timer,
    MapPin,
    Shield,
    FileText,
    ChevronRight,
    MoreHorizontal,
    Sparkles,
    X,
    Ban,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import type { Provider, Appointment, AppointmentType, WaitlistEntry, ProviderSchedule, ProviderBlockTime } from '@/types';

interface PatientOption {
    id: number;
    first_name: string;
    last_name: string;
}

interface Props {
    providers: (Provider & {
        appointments: (Appointment & {
            patient: { id: number; first_name: string; last_name: string; full_name: string; avatar_color: string | null };
            appointment_type: AppointmentType;
        })[];
        schedules: ProviderSchedule[];
        block_times: ProviderBlockTime[];
    })[];
    appointmentTypes: AppointmentType[];
    waitlistEntries: (WaitlistEntry & {
        patient: { id: number; first_name: string; last_name: string; full_name: string; phone: string; avatar_color: string | null };
    })[];
    patients: PatientOption[];
    stats: {
        todayAppointmentCount: number;
        dateAppointmentCount: number;
        remainingCount: number;
        waitlistCount: number;
        noShowRate: number;
        noShowChange: string;
        avgDuration: string;
    };
    filters: {
        date: string;
        view: 'day' | 'week';
    };
}

const SLOT_HEIGHT = 52;

const priorityVariantMap: Record<string, 'success' | 'warning' | 'error'> = {
    urgent: 'error',
    high: 'error',
    normal: 'warning',
    low: 'success',
};

const priorityLabelMap: Record<string, string> = {
    urgent: 'Urgent',
    high: 'High',
    normal: 'Medium',
    low: 'Low',
};

function getInitials(firstName: string, lastName: string): string {
    console.log('[Appointments] getInitials:', { firstName, lastName });
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function parseTimeToMinutes(timeStr: string): number {
    console.log('[Appointments] parseTimeToMinutes:', { timeStr });
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
}

function formatHour(hour: number): string {
    console.log('[Appointments] formatHour:', { hour });
    const lang = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date.toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });
}

function getStartSlot(scheduledAt: string, dayStartHour: number): number {
    console.log('[Appointments] getStartSlot:', { scheduledAt, dayStartHour });
    const date = new Date(scheduledAt);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutesSinceDayStart = (hours - dayStartHour) * 60 + minutes;
    return Math.max(0, Math.floor(totalMinutesSinceDayStart / 30));
}

function getDurationMinutes(scheduledAt: string, endsAt: string): number {
    console.log('[Appointments] getDurationMinutes:', { scheduledAt, endsAt });
    const start = new Date(scheduledAt);
    const end = new Date(endsAt);
    return Math.round((end.getTime() - start.getTime()) / 60000);
}

function formatTimeRange(scheduledAt: string, endsAt: string): string {
    console.log('[Appointments] formatTimeRange:', { scheduledAt, endsAt });
    const start = new Date(scheduledAt);
    const end = new Date(endsAt);
    const formatTime = (d: Date) => {
        const lang = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
        return d.toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });
    };
    return `${formatTime(start)} - ${formatTime(end)}`;
}

function formatWaitingSince(createdAt: string, t: any): string {
    console.log('[Appointments] formatWaitingSince:', { createdAt });
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('time.today');
    if (diffDays === 1) return t('time.oneDay');
    return t('time.days', { count: diffDays });
}

function formatPreferredDate(dateStr: string | null, t: any): string {
    console.log('[Appointments] formatPreferredDate:', { dateStr });
    if (!dateStr) return t('time.anyDate');
    const date = new Date(dateStr + 'T00:00:00');
    const lang = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
    return date.toLocaleDateString(lang, { month: 'short', day: 'numeric', year: 'numeric' });
}

function toDateString(date: Date): string {
    console.log('[Appointments] toDateString:', { date });
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getMonday(dateStr: string): Date {
    console.log('[Appointments] getMonday:', { dateStr });
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return date;
}

function addDays(date: Date, days: number): Date {
    console.log('[Appointments] addDays:', { date, days });
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function isSameDay(d1: Date, d2: Date): boolean {
    console.log('[Appointments] isSameDay:', { d1, d2 });
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function toLocalDatetimeString(date: Date): string {
    console.log('[Appointments] toLocalDatetimeString:', { date });
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
}

export default function Appointments({ providers, appointmentTypes, waitlistEntries, patients, stats, filters }: Props) {
    console.log('[Appointments] COMPONENT RENDER:', {
        providersCount: providers.length,
        appointmentTypesCount: appointmentTypes.length,
        waitlistCount: waitlistEntries.length,
        patientsCount: patients.length,
        appointmentTypes: appointmentTypes,
        waitlistEntries: waitlistEntries,
        patients: patients,
        providers: providers,
        stats,
        filters,
    });
    providers.forEach((p) => {
        p.appointments.forEach((apt) => {
            if (apt?.patient) {
                apt.patient.full_name =
                    `${apt.patient.first_name} ${apt.patient.last_name}`;
            }
        });
    });

    const { t } = useTranslation('appointments');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [activeProviderId, setActiveProviderId] = useState<number | null>(providers[0]?.id ?? null);
    const [showNewModal, setShowNewModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    const currentDate = filters.date;
    const currentView = filters.view;

    // Polling: refresh data every 30 seconds
    useEffect(() => {
        console.log('[Appointments] Polling effect initialized');

        const interval = setInterval(() => {
            console.log('[Appointments] Polling: reloading providers/stats/waitlistEntries');
            router.reload({ only: ['providers', 'stats', 'waitlistEntries'] });
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Reset active provider when providers change
    useEffect(() => {
        console.log('[Appointments] Provider synchronization effect:', {
            activeProviderId,
            providersCount: providers.length,
        });

        if (activeProviderId === null || !providers.find(p => p.id === activeProviderId)) {
            setActiveProviderId(providers[0]?.id ?? null);
        }
    }, [providers]);

    const navigate = useCallback((date: string, view?: string) => {
        console.log('[Appointments] navigate:', {
            date,
            view: view ?? currentView,
        });

        router.get('/appointments', { date, view: view ?? currentView }, { preserveState: true, preserveScroll: true });
    }, [currentView]);

    const goToToday = useCallback(() => {
        console.log('[Appointments] goToToday');
        navigate(toDateString(new Date()));
    }, [navigate]);

    const goToPrev = useCallback(() => {
        console.log('[Appointments] goToPrev:', { currentDate, currentView });
        const date = new Date(currentDate + 'T00:00:00');
        date.setDate(date.getDate() - (currentView === 'week' ? 7 : 1));
        navigate(toDateString(date));
    }, [currentDate, currentView, navigate]);

    const goToNext = useCallback(() => {
        console.log('[Appointments] goToNext:', { currentDate, currentView });
        const date = new Date(currentDate + 'T00:00:00');
        date.setDate(date.getDate() + (currentView === 'week' ? 7 : 1));
        navigate(toDateString(date));
    }, [currentDate, currentView, navigate]);

    const toggleView = useCallback((view: 'day' | 'week') => {
        console.log('[Appointments] toggleView:', {
            from: currentView,
            to: view,
            currentDate,
        });
        navigate(currentDate, view);
    }, [currentDate, currentView, navigate]);

    // Dynamic time range from provider schedules
    const { dayStartHour, timeLabels, totalSlots } = useMemo(() => {
        console.log('[Appointments] Calculating dynamic time range:', {
            currentDate,
            currentView,
            providersCount: providers.length,
        });

        let minHour = 24;
        let maxHour = 0;

        const dateObj = new Date(currentDate + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();

        for (const provider of providers) {
            if (!provider.schedules) continue;
            const relevant = currentView === 'week'
                ? provider.schedules.filter(s => s.is_available)
                : provider.schedules.filter(s => s.day_of_week === dayOfWeek && s.is_available);

            for (const schedule of relevant) {
                const startMin = parseTimeToMinutes(schedule.start_time);
                const endMin = parseTimeToMinutes(schedule.end_time);
                minHour = Math.min(minHour, Math.floor(startMin / 60));
                maxHour = Math.max(maxHour, Math.ceil(endMin / 60));
            }
        }

        if (minHour >= maxHour) {
            minHour = 8;
            maxHour = 18;
        }

        const labels: string[] = [];
        for (let h = minHour; h <= maxHour; h++) {
            labels.push(formatHour(h));
        }

        return {
            dayStartHour: minHour,
            timeLabels: labels,
            totalSlots: (maxHour - minHour) * 2,
        };
    }, [providers, currentDate, currentView]);

    const allAppointments = useMemo(() => {
        console.log('[Appointments] Building allAppointments:', {
            providersCount: providers.length,
        });

        return providers.flatMap((provider) =>
            provider.appointments.map((apt) => ({
                ...apt,
                providerName: provider.full_name,
                providerColor: provider.color,
            }))
        );
    }, [providers]);

    const selectedAppointment = useMemo(() => {
        console.log('[Appointments] Resolving selectedAppointment:', {
            selectedId,
            appointmentsCount: allAppointments.length,
        });

        if (selectedId !== null) {
            const found = allAppointments.find((apt) => apt.id === selectedId);
            if (found) return found;
        }
        return allAppointments.length > 0 ? allAppointments[0] : null;
    }, [selectedId, allAppointments]);

    const effectiveSelectedId = selectedAppointment?.id ?? null;

    const dateDisplay = useMemo(() => {
        console.log('[Appointments] Calculating dateDisplay:', {
            currentDate,
            currentView,
        });

        const date = new Date(currentDate + 'T00:00:00');
        if (currentView === 'week') {
            const monday = getMonday(currentDate);
            const sunday = addDays(monday, 6);
            if (monday.getMonth() === sunday.getMonth()) {
                return `${monday.toLocaleDateString('en-US', { month: 'long' })} ${monday.getDate()} – ${sunday.getDate()}, ${monday.getFullYear()}`;
            }
            return `${monday.toLocaleDateString('en-US', { month: 'short' })} ${monday.getDate()} – ${sunday.toLocaleDateString('en-US', { month: 'short' })} ${sunday.getDate()}, ${sunday.getFullYear()}`;
        }
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }, [currentDate, currentView]);

    const weekDays = useMemo(() => {
        console.log('[Appointments] Calculating weekDays:', {
            currentDate,
            currentView,
        });

        if (currentView !== 'week') return [];
        const monday = getMonday(currentDate);
        return Array.from({ length: 7 }, (_, i) => {
            const day = addDays(monday, i);
            return {
                date: day,
                dateStr: toDateString(day),
                dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNum: day.getDate(),
                isToday: isSameDay(day, new Date()),
            };
        });
    }, [currentDate, currentView]);

    const activeProvider = useMemo(() => {
        console.log('[Appointments] Resolving activeProvider:', {
            activeProviderId,
            providersCount: providers.length,
        });

        return providers.find(p => p.id === activeProviderId) ?? providers[0] ?? null;
    }, [providers, activeProviderId]);

    const canCheckIn = selectedAppointment && (selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'confirmed');
    const canReschedule = selectedAppointment && (selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'confirmed');
    const canCancel = selectedAppointment && !['cancelled', 'no_show', 'completed'].includes(selectedAppointment.status);

    const handleCheckIn = () => {
        console.log('[Appointments] handleCheckIn:', {
            appointmentId: selectedAppointment?.id,
            appointmentStatus: selectedAppointment?.status,
        });

        if (!selectedAppointment) {
            console.warn('[Appointments] handleCheckIn aborted: no selected appointment');
            return;
        }

        router.patch(`/appointments/${selectedAppointment.id}/check-in`, {}, { preserveScroll: true });
    };

    const renderBlockTimes = (blockTimes: ProviderBlockTime[]) => {
        console.log('[Appointments] renderBlockTimes:', {
            count: blockTimes.length,
        });

        return blockTimes.map((bt) => {
            const startSlot = getStartSlot(bt.start_at, dayStartHour);
            const duration = getDurationMinutes(bt.start_at, bt.end_at);
            const topPx = startSlot * SLOT_HEIGHT;
            const heightPx = (duration / 30) * SLOT_HEIGHT;

            return (
                <div
                    key={bt.id}
                    className="absolute start-0 end-0 overflow-hidden"
                    style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        backgroundColor: 'rgba(107, 114, 128, 0.08)',
                        backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(107, 114, 128, 0.06) 4px, rgba(107, 114, 128, 0.06) 8px)',
                    }}
                    title={bt.reason ?? 'Blocked'}
                >
                    {heightPx > 24 && (
                        <span className="block px-2 pt-1 font-mono text-[10px] text-[var(--muted-foreground)]">
                            {bt.reason ?? 'Blocked'}
                        </span>
                    )}
                </div>
            );
        });
    };

    const renderAppointmentBlock = (
        apt: {
            id: number;
            scheduled_at: string;
            ends_at: string;
            status: string;
            source: string;
            patient?: { full_name: string } | null;
            appointment_type?: { name: string; color: string } | null;
        },
        providerColor: string,
    ) => {
        console.log('[Appointments] renderAppointmentBlock:', {
            appointmentId: apt.id,
            status: apt.status,
            source: apt.source,
            scheduledAt: apt.scheduled_at,
            endsAt: apt.ends_at,
            patientName: apt.patient?.full_name ?? 'Unknown',
        });

        const startSlot = getStartSlot(apt.scheduled_at, dayStartHour);
        const duration = getDurationMinutes(apt.scheduled_at, apt.ends_at);
        const topPx = startSlot * SLOT_HEIGHT;
        const heightPx = (duration / 30) * SLOT_HEIGHT - 4;
        const isSelected = apt.id === effectiveSelectedId;
        const isCancelledOrNoShow = apt.status === 'cancelled' || apt.status === 'no_show';
        const color = isCancelledOrNoShow ? '#9CA3AF' : (apt.appointment_type?.color ?? providerColor);
        const timeRange = formatTimeRange(apt.scheduled_at, apt.ends_at);
        const isAiBooked = apt.source === 'ai';

        return (
            <button
                key={apt.id}
                onClick={() => setSelectedId(apt.id)}
                className={`absolute start-1.5 end-1.5 overflow-hidden rounded-[var(--radius-md)] p-2 text-start transition-all ${isSelected ? 'ring-2 ring-[var(--primary)]' : 'hover:brightness-110'
                    } ${isCancelledOrNoShow ? 'opacity-50' : ''}`}
                style={{
                    top: `${topPx + 2}px`,
                    height: `${heightPx}px`,
                    backgroundColor: `${color}18`,
                    borderLeft: `3px solid ${color}`,
                }}
            >
                <div className="flex items-center gap-1">
                    <span
                        className={`block truncate font-primary text-[11px] font-semibold ${isCancelledOrNoShow ? 'line-through' : ''}`}
                        style={{ color }}
                    >
                        {apt.patient?.full_name ?? 'Unknown'}
                    </span>
                    {isAiBooked && !isCancelledOrNoShow && (
                        <Sparkles size={10} style={{ color }} className="shrink-0" />
                    )}
                </div>
                <span className="block truncate font-primary text-[10px] text-[var(--muted-foreground)]">
                    {apt.appointment_type?.name ?? t('appointmentBlock.appointment')}
                </span>
                {heightPx > 50 && (
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--muted-foreground)]">
                        {timeRange}
                    </span>
                )}
            </button>
        );
    };

    return (
        <>
            <Head title={t('dashboard.title')} />
            <DashboardLayout
                title={t('dashboard.title').toUpperCase()}
                subtitle={t('dashboard.subtitle')}
            >
                <div className="flex flex-col gap-6">
                    {/* Header Action */}
                    <div className="flex items-center justify-end">
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80"
                        >
                            <CalendarPlus size={15} />
                            {t('dashboard.newAppointment')}
                        </button>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t('dashboard.stats.todaysAppointments')}
                            value={String(stats.todayAppointmentCount)}
                            change={t('dashboard.stats.remaining', { count: stats.remainingCount })}
                            changeColor="text-[var(--primary)]"
                            period={t('dashboard.stats.forToday')}
                            icon={Calendar}
                            iconColor="#22D3EE"
                            iconBgColor="#22D3EE15"
                        />
                        <StatCard
                            label={t('dashboard.stats.noShowRate')}
                            value={`${stats.noShowRate}%`}
                            change={stats.noShowChange}
                            period={t('dashboard.stats.vsLastMonth')}
                            icon={UserX}
                            iconColor="#EF4444"
                            iconBgColor="#EF444415"
                        />
                        <StatCard
                            label={t('dashboard.stats.waitlist')}
                            value={String(stats.waitlistCount)}
                            change={t('dashboard.stats.priority', { count: waitlistEntries.filter(e => e.priority === 'high' || e.priority === 'urgent').length })}
                            changeColor="text-[var(--warning)]"
                            period={t('dashboard.stats.queueEntries')}
                            icon={ListOrdered}
                            iconColor="#F59E0B"
                            iconBgColor="#F59E0B15"
                        />
                        <StatCard
                            label={t('dashboard.stats.avgDuration')}
                            value={stats.avgDuration}
                            change={t('dashboard.stats.thisMonth')}
                            changeColor="text-[var(--success)]"
                            period={t('dashboard.stats.completed')}
                            icon={Timer}
                            iconColor="#22C55E"
                            iconBgColor="#22C55E15"
                        />
                    </div>

                    {/* Schedule + Selected Appointment */}
                    <div className="flex flex-col gap-4 xl:flex-row">
                        {/* Schedule Grid */}
                        <div className="flex-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                                        {t('dashboard.schedule').toUpperCase()}
                                    </h2>
                                    <span className="hidden font-mono text-[12px] text-[var(--muted-foreground)] sm:inline">
                                        {new Date(currentDate + 'T00:00:00').toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Day/Week Toggle */}
                                    <div className="flex overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
                                        <button
                                            onClick={() => toggleView('day')}
                                            className={`px-3 py-1.5 font-primary text-[12px] font-medium transition-colors ${currentView === 'day'
                                                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                                : 'bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                                                }`}
                                        >
                                            {t('dashboard.view.day')}
                                        </button>
                                        <button
                                            onClick={() => toggleView('week')}
                                            className={`px-3 py-1.5 font-primary text-[12px] font-medium transition-colors ${currentView === 'week'
                                                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                                : 'bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                                                }`}
                                        >
                                            {t('dashboard.view.week')}
                                        </button>
                                    </div>
                                    <button
                                        onClick={goToPrev}
                                        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                                    >
                                        <ChevronRight size={14} className="rotate-180 rtl:rotate-0 " />
                                    </button>
                                    <button
                                        onClick={goToToday}
                                        className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-1.5 font-primary text-[12px] font-medium text-[var(--foreground)]"
                                    >
                                        {t('dashboard.view.today')}
                                    </button>
                                    <button
                                        onClick={goToNext}
                                        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                                    >
                                        <ChevronRight size={14} className="rtl:rotate-180" />                                    </button>
                                </div>
                            </div>

                            {/* Provider tabs for week view */}
                            {currentView === 'week' && providers.length > 1 && (
                                <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-5 py-2">
                                    {providers.map((provider) => (
                                        <button
                                            key={provider.id}
                                            onClick={() => setActiveProviderId(provider.id)}
                                            className={`shrink-0 rounded-[var(--radius-md)] px-3 py-1.5 font-primary text-[12px] font-medium transition-colors ${activeProviderId === provider.id
                                                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                                : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
                                                }`}
                                        >
                                            {provider.full_name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                {currentView === 'day' ? (
                                    /* Day View */
                                    <div className="min-w-[640px]">
                                        {/* Provider Header Row */}
                                        <div
                                            className="grid border-b border-[var(--border)]"
                                            style={{ gridTemplateColumns: `72px repeat(${providers.length || 1}, 1fr)` }}
                                        >
                                            <div className="px-3 py-3" />
                                            {providers.map((provider) => (
                                                <div key={provider.id} className="border-s border-[var(--border)] px-3 py-3">
                                                    <span className="block font-primary text-[13px] font-semibold text-[var(--foreground)]">
                                                        {provider.full_name}
                                                    </span>
                                                    <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                                        {provider.specialty}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Time Grid */}
                                        <div
                                            className="relative grid"
                                            style={{ gridTemplateColumns: `72px repeat(${providers.length || 1}, 1fr)` }}
                                        >
                                            {/* Time Labels */}
                                            <div className="relative">
                                                {timeLabels.map((time, i) => (
                                                    <div
                                                        key={time}
                                                        className="absolute end-3 font-mono text-[11px] text-[var(--muted-foreground)]"
                                                        style={{ top: `${i * 2 * SLOT_HEIGHT - 7}px` }}
                                                    >
                                                        {time}
                                                    </div>
                                                ))}
                                                <div style={{ height: `${totalSlots * SLOT_HEIGHT}px` }} />
                                            </div>

                                            {/* Provider Columns */}
                                            {providers.map((provider) => (
                                                <div
                                                    key={provider.id}
                                                    className="relative border-s border-[var(--border)]"
                                                    style={{ height: `${totalSlots * SLOT_HEIGHT}px` }}
                                                >
                                                    {timeLabels.map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className="absolute start-0 end-0 border-t border-[var(--border-subtle)]"
                                                            style={{ top: `${i * 2 * SLOT_HEIGHT}px` }}
                                                        />
                                                    ))}
                                                    {provider.block_times && renderBlockTimes(provider.block_times)}
                                                    {provider.appointments.map((apt) =>
                                                        renderAppointmentBlock(apt, provider.color)
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Week View */
                                    <div className="min-w-[640px]">
                                        {/* Day Header Row */}
                                        <div
                                            className="grid border-b border-[var(--border)]"
                                            style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}
                                        >
                                            <div className="px-3 py-3" />
                                            {weekDays.map((day) => (
                                                <div
                                                    key={day.dateStr}
                                                    className={`border-s border-[var(--border)] px-3 py-3 text-center ${day.isToday ? 'bg-[var(--accent)]' : ''}`}
                                                >
                                                    <span className="block font-primary text-[11px] text-[var(--muted-foreground)]">
                                                        {day.dayName}
                                                    </span>
                                                    <span className={`block font-mono text-[14px] font-semibold ${day.isToday ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                                                        {day.dayNum}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Time Grid */}
                                        <div
                                            className="relative grid"
                                            style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}
                                        >
                                            {/* Time Labels */}
                                            <div className="relative">
                                                {timeLabels.map((time, i) => (
                                                    <div
                                                        key={time}
                                                        className="absolute end-3 font-mono text-[11px] text-[var(--muted-foreground)]"
                                                        style={{ top: `${i * 2 * SLOT_HEIGHT - 7}px` }}
                                                    >
                                                        {time}
                                                    </div>
                                                ))}
                                                <div style={{ height: `${totalSlots * SLOT_HEIGHT}px` }} />
                                            </div>

                                            {/* Day Columns */}
                                            {weekDays.map((day) => {
                                                const dayAppointments = activeProvider
                                                    ? activeProvider.appointments.filter((apt) =>
                                                        isSameDay(new Date(apt.scheduled_at), day.date)
                                                    )
                                                    : [];

                                                const dayBlockTimes = activeProvider?.block_times?.filter((bt) => {
                                                    const btStart = new Date(bt.start_at);
                                                    return isSameDay(btStart, day.date);
                                                }) ?? [];

                                                return (
                                                    <div
                                                        key={day.dateStr}
                                                        className={`relative border-s border-[var(--border)] ${day.isToday ? 'bg-[var(--accent)]' : ''}`}
                                                        style={{ height: `${totalSlots * SLOT_HEIGHT}px` }}
                                                    >
                                                        {timeLabels.map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="absolute start-0 end-0 border-t border-[var(--border-subtle)]"
                                                                style={{ top: `${i * 2 * SLOT_HEIGHT}px` }}
                                                            />
                                                        ))}
                                                        {renderBlockTimes(dayBlockTimes)}
                                                        {dayAppointments.map((apt) =>
                                                            renderAppointmentBlock(apt, activeProvider!.color)
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selected Appointment Detail */}
                        <div className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] xl:w-[320px]">
                            <div className="border-b border-[var(--border)] px-5 py-4">
                                <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                                    {t('selectedAppointment.title').toUpperCase()}
                                </h2>
                            </div>

                            {selectedAppointment ? (
                                <div className="flex flex-col gap-5 p-5">
                                    {/* Patient Info */}
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                                            style={{ backgroundColor: `${selectedAppointment.appointment_type?.color ?? selectedAppointment.providerColor}20` }}
                                        >
                                            <span
                                                className="font-primary text-sm font-semibold"
                                                style={{ color: selectedAppointment.appointment_type?.color ?? selectedAppointment.providerColor }}
                                            >
                                                {getInitials(selectedAppointment.patient?.first_name ?? '', selectedAppointment.patient?.last_name ?? '')}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-primary text-[14px] font-semibold text-[var(--foreground)]">
                                                    {selectedAppointment.patient?.full_name ?? 'Unknown'}
                                                </span>
                                                {selectedAppointment.source === 'ai' && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#8B5CF61A] px-2 py-[3px]">
                                                        <Sparkles size={10} className="text-[#8B5CF6]" />
                                                        <span className="font-primary text-[11px] font-medium text-[#8B5CF6]">
                                                            {t('selectedAppointment.aiBooked')}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-primary text-[12px] text-[var(--muted-foreground)]">
                                                {selectedAppointment.appointment_type?.name ?? t('selectedAppointment.appointment')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-px bg-[var(--border)]" />

                                    {/* Appointment Details */}
                                    <div className="flex flex-col gap-3.5">
                                        <DetailRow
                                            icon={Calendar}
                                            label={t('selectedAppointment.details.type')}
                                            value={selectedAppointment.appointment_type?.name ?? t('selectedAppointment.appointment')}
                                        />
                                        <DetailRow
                                            icon={Clock}
                                            label={t('selectedAppointment.details.time')}
                                            value={formatTimeRange(selectedAppointment.scheduled_at, selectedAppointment.ends_at)}
                                        />
                                        <DetailRow
                                            icon={User}
                                            label={t('selectedAppointment.details.doctor')}
                                            value={selectedAppointment.providerName}
                                        />
                                        {selectedAppointment.room && (
                                            <DetailRow
                                                icon={MapPin}
                                                label={t('selectedAppointment.details.room')}
                                                value={selectedAppointment.room}
                                            />
                                        )}
                                        <DetailRow
                                            icon={Shield}
                                            label={t('selectedAppointment.details.status')}
                                            value={selectedAppointment.status.replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                        />
                                    </div>

                                    <div className="h-px bg-[var(--border)]" />

                                    {/* Notes */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <FileText size={13} className="text-[var(--muted-foreground)]" />
                                            <span className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                                {t('selectedAppointment.details.notes')}
                                            </span>
                                        </div>
                                        <p className="font-primary text-[12px] leading-[1.6] text-[var(--muted-foreground)]">
                                            {selectedAppointment.notes ?? selectedAppointment.reason ?? t('selectedAppointment.details.noNotes')}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {canCheckIn && (
                                            <button
                                                onClick={handleCheckIn}
                                                className="flex-1 rounded-[var(--radius-md)] bg-[var(--primary)] py-2 font-primary text-[12px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80"
                                            >
                                                {t('selectedAppointment.actions.checkIn')}
                                            </button>
                                        )}
                                        {canReschedule && (
                                            <button
                                                onClick={() => setShowRescheduleModal(true)}
                                                className="flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] py-2 font-primary text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                                            >
                                                {t('selectedAppointment.actions.reschedule')}
                                            </button>
                                        )}
                                        {canCancel && (
                                            <button
                                                onClick={() => setShowCancelModal(true)}
                                                className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 font-primary text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                                            >
                                                <Ban size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                                    <Calendar size={24} className="text-[var(--muted-foreground)]" />
                                    <p className="font-primary text-[13px] text-[var(--muted-foreground)]">
                                        {t('selectedAppointment.emptyState')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Waitlist */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                            <div className="flex items-center gap-3">
                                <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                                    {t('waitlist.title').toUpperCase()}
                                </h2>
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--warning)] px-1.5 font-mono text-[10px] font-bold text-[var(--warning-foreground)]">
                                    {waitlistEntries.length}
                                </span>
                            </div>
                        </div>

                        <div className="divide-y divide-[var(--border-subtle)]">
                            {waitlistEntries.length === 0 ? (
                                <div className="flex items-center justify-center py-8">
                                    <p className="font-primary text-[13px] text-[var(--muted-foreground)]">
                                        {t('waitlist.emptyState')}
                                    </p>
                                </div>
                            ) : (
                                waitlistEntries.map((entry) => {
                                    const avatarColor = entry.patient.avatar_color ?? '#8B5CF6';
                                    return (
                                        <div
                                            key={entry.id}
                                            className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[var(--card-hover)]"
                                        >
                                            <div
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                                                style={{ backgroundColor: `${avatarColor}20` }}
                                            >
                                                <span
                                                    className="font-primary text-[11px] font-semibold"
                                                    style={{ color: avatarColor }}
                                                >
                                                    {getInitials(entry.patient.first_name, entry.patient.last_name)}
                                                </span>
                                            </div>

                                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-primary text-[13px] font-semibold text-[var(--foreground)]">
                                                        {entry.patient.full_name}
                                                    </span>
                                                    <Badge variant={priorityVariantMap[entry.priority] ?? 'warning'}>
                                                        {priorityLabelMap[entry.priority] ?? entry.priority}
                                                    </Badge>
                                                </div>
                                                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                                                    {entry.patient.phone}
                                                </span>
                                            </div>

                                            <div className="hidden flex-col gap-0.5 text-end md:flex">
                                                <span className="font-primary text-[12px] text-[var(--foreground)]">
                                                    {entry.appointment_type?.name ?? t('waitlist.anyType')}
                                                </span>
                                                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                                                    {t('waitlist.requested')} {formatPreferredDate(entry.preferred_date_start, t)}
                                                </span>
                                            </div>

                                            <div className="hidden flex-col gap-0.5 text-end lg:flex">
                                                <span className="font-primary text-[12px] text-[var(--muted-foreground)]">
                                                    {t('waitlist.waiting')}
                                                </span>
                                                <span className="font-mono text-[11px] text-[var(--foreground)]">
                                                    {formatWaitingSince(entry.created_at, t)}
                                                </span>
                                            </div>

                                            <button className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]">
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </DashboardLayout>

            {/* New Appointment Modal */}
            {showNewModal && (
                <NewAppointmentModal
                    providers={providers}
                    appointmentTypes={appointmentTypes}
                    patients={patients}
                    onClose={() => setShowNewModal(false)}
                />
            )}

            {/* Reschedule Modal */}
            {showRescheduleModal && selectedAppointment && (
                <RescheduleModal
                    appointment={selectedAppointment}
                    providers={providers}
                    onClose={() => setShowRescheduleModal(false)}
                />
            )}

            {/* Cancel Modal */}
            {showCancelModal && selectedAppointment && (
                <CancelModal
                    appointment={selectedAppointment}
                    onClose={() => setShowCancelModal(false)}
                />
            )}
        </>
    );
}

interface DetailRowProps {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string;
}

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
    console.log('[Appointments] DetailRow:', { label, value });
    return (
        <div className="flex items-start gap-3">
            <Icon size={14} className="mt-0.5 shrink-0 text-[var(--muted-foreground)]" />
            <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] font-medium text-[var(--muted-foreground)]">
                    {label}
                </span>
                <span className="font-primary text-[13px] text-[var(--foreground)]">
                    {value}
                </span>
            </div>
        </div>
    );
}

function NewAppointmentModal({
    providers,
    appointmentTypes,
    patients,
    onClose,
}: {
    providers: Props['providers'];
    appointmentTypes: AppointmentType[];
    patients: PatientOption[];
    onClose: () => void;
}) {
    console.log('[Appointments] NewAppointmentModal render:', {
        providersCount: providers.length,
        appointmentTypesCount: appointmentTypes.length,
        patientsCount: patients.length,
    });

    const { t } = useTranslation('appointments');
    const form = useForm({
        patient_id: '',
        provider_id: providers[0]?.id?.toString() ?? '',
        appointment_type_id: appointmentTypes[0]?.id?.toString() ?? '',
        scheduled_at: '',
        room: '',
        reason: '',
        notes: '',
    });

    const { query: patientSearch, setQuery: setPatientSearch, results: filteredPatients } = usePatientSearch(patients);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log('[Appointments] NewAppointmentModal handleSubmit:', {
            formData: form.data,
            processing: form.processing,
            errors: form.errors,
        });

        form.post('/appointments', {
            preserveScroll: true,
            onSuccess: () => {
                console.log('[Appointments] New appointment created successfully');
                onClose();
            },
            onError: (errors) => {
                console.error('[Appointments] New appointment creation failed:', errors);
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                        {t('modals.new.title').toUpperCase()}
                    </h2>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
                    {/* Patient */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.patient')}</label>
                        <input
                            type="text"
                            placeholder={t('modals.new.searchPatient')}
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                        {patientSearch && !form.data.patient_id && (
                            <div className="max-h-32 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)]">
                                {filteredPatients.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            form.setData('patient_id', p.id.toString());
                                            setPatientSearch(`${p.first_name} ${p.last_name}`);
                                        }}
                                        className="w-full px-3 py-2 text-start font-primary text-[13px] text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                                    >
                                        {p.first_name} {p.last_name}
                                    </button>
                                ))}
                            </div>
                        )}
                        {form.data.patient_id && (
                            <button
                                type="button"
                                onClick={() => { form.setData('patient_id', ''); setPatientSearch(''); }}
                                className="self-start font-primary text-[11px] text-[var(--primary)] hover:underline"
                            >
                                {t('modals.new.changePatient')}
                            </button>
                        )}
                        {form.errors.patient_id && <span className="font-primary text-[11px] text-red-500">{form.errors.patient_id}</span>}
                    </div>

                    {/* Provider + Type row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.provider')}</label>
                            <select
                                value={form.data.provider_id}
                                onChange={(e) => form.setData('provider_id', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            >
                                <option value="">{t('modals.new.select')}</option>
                                {providers.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                            </select>
                            {form.errors.provider_id && <span className="font-primary text-[11px] text-red-500">{form.errors.provider_id}</span>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.type')}</label>
                            <select
                                value={form.data.appointment_type_id}
                                onChange={(e) => form.setData('appointment_type_id', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            >
                                <option value="">{t('modals.new.select')}</option>
                                {appointmentTypes.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.duration_minutes}m)</option>)}
                            </select>
                            {form.errors.appointment_type_id && <span className="font-primary text-[11px] text-red-500">{form.errors.appointment_type_id}</span>}
                        </div>
                    </div>

                    {/* Date/Time + Room */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.dateTime')}</label>
                            <input
                                type="datetime-local"
                                value={form.data.scheduled_at}
                                onChange={(e) => form.setData('scheduled_at', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                            {form.errors.scheduled_at && <span className="font-primary text-[11px] text-red-500">{form.errors.scheduled_at}</span>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.room')}</label>
                            <input
                                type="text"
                                value={form.data.room}
                                onChange={(e) => form.setData('room', e.target.value)}
                                placeholder={t('modals.new.roomPlaceholder')}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.reason')}</label>
                        <textarea
                            value={form.data.reason}
                            onChange={(e) => form.setData('reason', e.target.value)}
                            placeholder={t('modals.new.reasonPlaceholder')}
                            rows={2}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                        >
                            {t('modals.new.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                            {form.processing ? t('modals.new.creating') : t('modals.new.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function RescheduleModal({
    appointment,
    providers,
    onClose,
}: {
    appointment: { id: number; scheduled_at: string; provider_id: number };
    providers: Props['providers'];
    onClose: () => void;
}) {
    console.log('[Appointments] RescheduleModal render:', {
        appointmentId: appointment.id,
        scheduledAt: appointment.scheduled_at,
        providerId: appointment.provider_id,
    });

    const { t } = useTranslation('appointments');
    const form = useForm({
        scheduled_at: toLocalDatetimeString(new Date(appointment.scheduled_at)),
        provider_id: appointment.provider_id.toString(),
        reason: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log('[Appointments] RescheduleModal handleSubmit:', {
            appointmentId: appointment.id,
            formData: form.data,
            processing: form.processing,
            errors: form.errors,
        });

        form.patch(`/appointments/${appointment.id}/reschedule`, {
            preserveScroll: true,
            onSuccess: () => {
                console.log('[Appointments] Reschedule completed successfully:', {
                    appointmentId: appointment.id,
                });
                onClose();
            },
            onError: (errors) => {
                console.error('[Appointments] Reschedule failed:', errors);
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                        {t('modals.reschedule.title').toUpperCase()}
                    </h2>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.reschedule.newDateTime')}</label>
                        <input
                            type="datetime-local"
                            value={form.data.scheduled_at}
                            onChange={(e) => form.setData('scheduled_at', e.target.value)}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                        {form.errors.scheduled_at && <span className="font-primary text-[11px] text-red-500">{form.errors.scheduled_at}</span>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.reschedule.provider')}</label>
                        <select
                            value={form.data.provider_id}
                            onChange={(e) => form.setData('provider_id', e.target.value)}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        >
                            {providers.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.reschedule.reason')}</label>
                        <textarea
                            value={form.data.reason}
                            onChange={(e) => form.setData('reason', e.target.value)}
                            placeholder={t('modals.reschedule.reasonPlaceholder')}
                            rows={2}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                        >
                            {t('modals.reschedule.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                            {form.processing ? t('modals.reschedule.rescheduling') : t('modals.reschedule.reschedule')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CancelModal({
    appointment,
    onClose,
}: {
    appointment: { id: number; patient?: { full_name: string } | null };
    onClose: () => void;
}) {
    console.log('[Appointments] CancelModal render:', {
        appointmentId: appointment.id,
        patientName: appointment.patient?.full_name,
    });

    const { t } = useTranslation('appointments');
    const form = useForm({
        cancellation_reason: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log('[Appointments] CancelModal handleSubmit:', {
            appointmentId: appointment.id,
            patientName: appointment.patient?.full_name,
            formData: form.data,
            processing: form.processing,
            errors: form.errors,
        });

        form.patch(`/appointments/${appointment.id}/cancel`, {
            preserveScroll: true,
            onSuccess: () => {
                console.log('[Appointments] Cancellation completed successfully:', {
                    appointmentId: appointment.id,
                });
                onClose();
            },
            onError: (errors) => {
                console.error('[Appointments] Cancellation failed:', errors);
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-sm font-semibold text-red-500">
                        {t('modals.cancel.title').toUpperCase()}
                    </h2>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
                    <p className="font-primary text-[13px] text-[var(--foreground)]">
                        {t('modals.cancel.confirmation').split('<1>')[0]}
                        <strong>{appointment.patient?.full_name ?? 'Unknown'}</strong>
                        {t('modals.cancel.confirmation').split('</1>')[1]}
                    </p>
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.cancel.reason')}</label>
                        <textarea
                            value={form.data.cancellation_reason}
                            onChange={(e) => form.setData('cancellation_reason', e.target.value)}
                            placeholder={t('modals.cancel.reasonPlaceholder')}
                            rows={2}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                        >
                            {t('modals.cancel.keep')}
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-[var(--radius-md)] bg-red-600 px-4 py-2 font-primary text-[13px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                            {form.processing ? t('modals.cancel.cancelling') : t('modals.cancel.cancelAppointment')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
