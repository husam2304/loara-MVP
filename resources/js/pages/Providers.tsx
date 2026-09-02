import { Head, Link, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState, useCallback, useRef } from 'react';
import {
    Users, UserCheck, Stethoscope, Calendar, Search, Plus, X,
    ChevronLeft, ChevronRight, Pencil, Trash2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import type { Provider, ProviderSchedule, PaginatedData } from '@/types';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SPECIALTIES = [
    'Family Medicine', 'Internal Medicine', 'Pediatrics', 'Dermatology',
    'Cardiology', 'Orthopedics', 'Ophthalmology', 'Neurology',
    'Psychiatry', 'OB/GYN', 'Urology', 'Oncology',
    'Radiology', 'Anesthesiology', 'Emergency Medicine',
];

const COLOR_SWATCHES = [
    '#22D3EE', '#A78BFA', '#F472B6', '#34D399',
    '#FBBF24', '#FB923C', '#EF4444', '#3B82F6',
];

const TITLE_OPTIONS = ['Dr.', 'NP', 'PA', 'DO'];

interface ProviderWithCounts extends Provider {
    appointments_count: number;
    patients_count: number;
}

interface ProvidersProps {
    providers: PaginatedData<ProviderWithCounts>;
    stats: {
        totalProviders: number;
        activeProviders: number;
        specialtyCount: number;
        avgAppointmentsPerWeek: number;
    };
    specialties: string[];
    filters: {
        search: string;
        specialty: string;
        status: string;
    };
}

function getScheduleSummary(schedules: ProviderSchedule[] | undefined, t: any): string {
    if (!schedules || schedules.length === 0) return '—';
    const available = schedules.filter(s => s.is_available);
    if (available.length === 0) return t('schedule.noHours');
    if (available.length === 7) return t('schedule.everyDay');
    if (available.length === 5 &&
        available.every(s => s.day_of_week >= 1 && s.day_of_week <= 5)) {
        return t('schedule.monFri');
    }
    const daysShort = [
        t('schedule.daysShort.sun'), t('schedule.daysShort.mon'), t('schedule.daysShort.tue'),
        t('schedule.daysShort.wed'), t('schedule.daysShort.thu'), t('schedule.daysShort.fri'),
        t('schedule.daysShort.sat')
    ];
    return available.map(s => daysShort[s.day_of_week]).join(', ');
}


// ─── New Provider Modal ──────────────────────────────────────────────

function NewProviderModal({ specialties, onClose }: { specialties: string[]; onClose: () => void }) {
    const { t } = useTranslation('providers');
    const form = useForm({
        first_name: '',
        last_name: '',
        title: 'Dr.',
        specialty: '',
        npi_number: '',
        color: COLOR_SWATCHES[0],
    });

    const allSpecialties = [...new Set([...specialties, ...SPECIALTIES])].sort();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/providers', {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">{t('modals.new.title').toUpperCase()}</h2>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.firstName')}</label>
                            <input type="text" value={form.data.first_name} onChange={(e) => form.setData('first_name', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                            {form.errors.first_name && <span className="font-primary text-[11px] text-red-500">{form.errors.first_name}</span>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.lastName')}</label>
                            <input type="text" value={form.data.last_name} onChange={(e) => form.setData('last_name', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                            {form.errors.last_name && <span className="font-primary text-[11px] text-red-500">{form.errors.last_name}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.doctorTitle')}</label>
                            <select value={form.data.title} onChange={(e) => form.setData('title', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]">
                                {TITLE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.specialty')}</label>
                            <select value={form.data.specialty} onChange={(e) => form.setData('specialty', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]">
                                <option value="">{t('modals.new.select')}</option>
                                {allSpecialties.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {form.errors.specialty && <span className="font-primary text-[11px] text-red-500">{form.errors.specialty}</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.npi')}</label>
                        <input type="text" value={form.data.npi_number} onChange={(e) => form.setData('npi_number', e.target.value)}
                            placeholder={t("modals.new.npiPlaceholder")}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.color')}</label>
                        <div className="flex items-center gap-2">
                            {COLOR_SWATCHES.map((c) => (
                                <button key={c} type="button" onClick={() => form.setData('color', c)}
                                    className={`h-7 w-7 rounded-full border-2 transition-all ${form.data.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
                        <Button variant="secondary" type="button" onClick={onClose}>{t('modals.new.cancel')}</Button>
                        <Button variant="primary" type="submit" disabled={form.processing}>
                            {form.processing ? t('modals.new.creating') : t('modals.new.create')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Edit Provider Modal ─────────────────────────────────────────────

interface ScheduleRow {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
}

function EditProviderModal({ provider, specialties, onClose }: { provider: ProviderWithCounts; specialties: string[]; onClose: () => void }) {
    const { t } = useTranslation('providers');
    const defaultSchedules: ScheduleRow[] = DAY_LABELS.map((_, i) => {
        const existing = provider.schedules?.find(s => s.day_of_week === i);
        return existing
            ? { day_of_week: i, start_time: existing.start_time.slice(0, 5), end_time: existing.end_time.slice(0, 5), is_available: existing.is_available }
            : { day_of_week: i, start_time: '09:00', end_time: '17:00', is_available: false };
    });

    const form = useForm({
        first_name: provider.first_name,
        last_name: provider.last_name,
        title: provider.title,
        specialty: provider.specialty,
        npi_number: provider.npi_number || '',
        color: provider.color,
        is_active: provider.is_active,
        schedules: defaultSchedules,
    });

    const allSpecialties = [...new Set([...specialties, ...SPECIALTIES])].sort();

    const updateSchedule = (index: number, field: keyof ScheduleRow, value: string | boolean) => {
        const updated = [...form.data.schedules];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('schedules', updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.patch(`/providers/${provider.id}`, form.data as any, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">{t('modals.edit.title').toUpperCase()}</h2>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.firstName')}</label>
                            <input type="text" value={form.data.first_name} onChange={(e) => form.setData('first_name', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.lastName')}</label>
                            <input type="text" value={form.data.last_name} onChange={(e) => form.setData('last_name', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.doctorTitle')}</label>
                            <select value={form.data.title} onChange={(e) => form.setData('title', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]">
                                {TITLE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.specialty')}</label>
                            <select value={form.data.specialty} onChange={(e) => form.setData('specialty', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]">
                                <option value="">{t('modals.new.select')}</option>
                                {allSpecialties.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.edit.npi')}</label>
                            <input type="text" value={form.data.npi_number} onChange={(e) => form.setData('npi_number', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.edit.status')}</label>
                            <select value={form.data.is_active ? 'active' : 'inactive'}
                                onChange={(e) => form.setData('is_active', e.target.value === 'active')}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]">
                                <option value="active">{t('directory.active')}</option>
                                <option value="inactive">{t('directory.inactive')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.new.color')}</label>
                        <div className="flex items-center gap-2">
                            {COLOR_SWATCHES.map((c) => (
                                <button key={c} type="button" onClick={() => form.setData('color', c)}
                                    className={`h-7 w-7 rounded-full border-2 transition-all ${form.data.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>

                    {/* Schedule Editor */}
                    <div className="flex flex-col gap-2">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.edit.weeklySchedule')}</label>
                        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)]">
                            {form.data.schedules.map((schedule, index) => (
                                <div key={index} className={`flex items-center gap-3 px-3 py-2 ${index < 6 ? 'border-b border-[var(--border)]' : ''}`}>
                                    <span className="w-12 shrink-0 font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{[t('schedule.daysShort.sun'), t('schedule.daysShort.mon'), t('schedule.daysShort.tue'), t('schedule.daysShort.wed'), t('schedule.daysShort.thu'), t('schedule.daysShort.fri'), t('schedule.daysShort.sat')][index]}</span>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={schedule.is_available} onChange={(e) => updateSchedule(index, 'is_available', e.target.checked)}
                                            className="h-3.5 w-3.5 rounded border-[var(--border)] accent-[var(--primary)]" />
                                    </label>
                                    {schedule.is_available ? (
                                        <div className="flex items-center gap-2">
                                            <input type="time" value={schedule.start_time} onChange={(e) => updateSchedule(index, 'start_time', e.target.value)}
                                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-2 py-1 font-mono text-[11px] text-[var(--foreground)] outline-none" />
                                            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{t('schedule.to')}</span>
                                            <input type="time" value={schedule.end_time} onChange={(e) => updateSchedule(index, 'end_time', e.target.value)}
                                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-2 py-1 font-mono text-[11px] text-[var(--foreground)] outline-none" />
                                        </div>
                                    ) : (
                                        <span className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('schedule.unavailable')}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
                        <Button variant="secondary" type="button" onClick={onClose}>{t('modals.new.cancel')}</Button>
                        <Button variant="primary" type="submit" disabled={form.processing}>
                            {form.processing ? t('modals.edit.saving') : t('modals.edit.saveChanges')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete Confirm Modal ────────────────────────────────────────────

function DeleteConfirmModal({ provider, onClose }: { provider: ProviderWithCounts; onClose: () => void }) {
    const { t } = useTranslation('providers');
    const [processing, setProcessing] = useState(false);

    const handleDelete = () => {
        setProcessing(true);
        router.delete(`/providers/${provider.id}`, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">{t('modals.delete.title').toUpperCase()}</h2>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><X size={16} /></button>
                </div>
                <div className="flex flex-col gap-4 p-5">
                    <p className="font-primary text-[13px] text-[var(--foreground)]">
                        {t('modals.delete.confirmation').replace('{{name}}', provider.full_name)}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={onClose}>{t('modals.new.cancel')}</Button>
                        <button
                            onClick={handleDelete}
                            disabled={processing}
                            className="rounded-[var(--radius-md)] bg-red-600 px-4 py-2 font-primary text-[13px] font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                            {processing ? t('modals.delete.deleting') : t('modals.delete.delete')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function Providers({ providers, stats, specialties, filters }: ProvidersProps) {
    const { t } = useTranslation('providers');
    const [search, setSearch] = useState(filters.search || '');
    const [showNewModal, setShowNewModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState<ProviderWithCounts | null>(null);
    const [deletingProvider, setDeletingProvider] = useState<ProviderWithCounts | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const handleSearch = useCallback((value: string) => {
        setSearch(value);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            router.get('/providers', {
                search: value || undefined,
                specialty: filters.specialty || undefined,
                status: filters.status || undefined,
            }, { preserveState: true, preserveScroll: true });
        }, 300);
    }, [filters.specialty, filters.status]);

    const handleSpecialtyFilter = useCallback((specialty: string) => {
        router.get('/providers', {
            search: filters.search || undefined,
            specialty: specialty || undefined,
            status: filters.status || undefined,
        }, { preserveState: true, preserveScroll: true });
    }, [filters.search, filters.status]);

    const handleStatusFilter = useCallback((status: string) => {
        router.get('/providers', {
            search: filters.search || undefined,
            specialty: filters.specialty || undefined,
            status: status || undefined,
        }, { preserveState: true, preserveScroll: true });
    }, [filters.search, filters.specialty]);

    return (
        <>
            <Head title={t("title")} />
            <DashboardLayout
                title={t("dashboardTitle").toUpperCase()}
                subtitle={t("dashboardSubtitle")}
                actions={
                    <Button variant="primary" icon={Plus} onClick={() => setShowNewModal(true)}>
                        + {t("addDoctor")}
                    </Button>
                }
            >
                <div className="flex flex-col gap-6">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label={t("stats.totalDoctors")} value={stats.totalProviders.toLocaleString()} change="" period="" icon={Users} iconColor="#22D3EE" iconBgColor="#22D3EE15" />
                        <StatCard label={t("stats.activeDoctors")} value={stats.activeProviders.toLocaleString()} change={stats.totalProviders > 0 ? `${Math.round((stats.activeProviders / stats.totalProviders) * 100)}%` : '0%'} changeColor="text-[var(--success)]" period={t("stats.ofTotal")} icon={UserCheck} iconColor="#22C55E" iconBgColor="#22C55E15" />
                        <StatCard label={t("stats.specialties")} value={stats.specialtyCount.toLocaleString()} change="" period="" icon={Stethoscope} iconColor="#8B5CF6" iconBgColor="#8B5CF615" />
                        <StatCard label={t("stats.avgApptsWeek")} value={stats.avgAppointmentsPerWeek.toLocaleString()} change="" period={t("stats.acrossActive")} icon={Calendar} iconColor="#F59E0B" iconBgColor="#F59E0B15" />
                    </div>

                    {/* Provider Directory */}
                    <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                        {/* Card Header */}
                        <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">{t('directory.title').toUpperCase()}</h3>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3">
                                    <Search size={14} className="text-[var(--muted-foreground)]" />
                                    <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder={t("directory.searchPlaceholder")}
                                        className="h-[34px] w-[180px] bg-transparent font-primary text-[13px] text-[var(--foreground)] placeholder-[#52525B] outline-none" />
                                </div>
                                <select value={filters.specialty} onChange={(e) => handleSpecialtyFilter(e.target.value)}
                                    className="h-[34px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] outline-none">
                                    <option value="">{t('directory.allSpecialties')}</option>
                                    {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select value={filters.status} onChange={(e) => handleStatusFilter(e.target.value)}
                                    className="h-[34px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] outline-none">
                                    <option value="">{t('directory.allStatus')}</option>
                                    <option value="active">{t('directory.active')}</option>
                                    <option value="inactive">{t('directory.inactive')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('directory.columns.doctor')}</th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('directory.columns.npi')}</th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('directory.columns.schedule')}</th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('directory.columns.patients')}</th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('directory.columns.status')}</th>
                                        <th className="px-5 py-3 text-end font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('directory.columns.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {providers.data.map((provider, index) => (
                                        <tr key={provider.id} className={`transition-colors hover:bg-[var(--card-hover)] ${index < providers.data.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: provider.color + '20' }}>
                                                        <span className="font-primary text-[11px] font-semibold" style={{ color: provider.color }}>
                                                            {provider.first_name.charAt(0)}{provider.last_name.charAt(0)}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">{provider.full_name}</span>
                                                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{provider.specialty}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="font-mono text-[12px] text-[var(--muted-foreground)]">{provider.npi_number || '—'}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="font-primary text-[12px] text-[var(--foreground)]">{getScheduleSummary(provider.schedules, t)}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="font-mono text-[12px] text-[var(--foreground)]">{provider.patients_count}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <Badge variant={provider.is_active ? 'success' : 'error'}>
                                                    {provider.is_active ? t('directory.active') : t('directory.inactive')}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setEditingProvider(provider)} className="rounded-[var(--radius-md)] p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]">
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={() => setDeletingProvider(provider)} className="rounded-[var(--radius-md)] p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-red-500/10 hover:text-red-500">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {providers.data.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-12 text-center">
                                                <p className="font-primary text-[14px] text-[var(--muted-foreground)]">{t('directory.noDoctorsFound')}</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
                            <span className="font-primary text-[12px] text-[var(--muted-foreground)]">
                                {providers.total > 0
                                    ? t('directory.showing', { from: providers.from, to: providers.to, total: providers.total.toLocaleString() })
                                    : t('directory.noDoctors')}
                            </span>
                            {providers.last_page > 1 && (
                                <div className="flex items-center gap-1">
                                    {providers.links.map((link, index) => {
                                        if (index === 0) {
                                            return (
                                                <Link key="prev" href={link.url || '#'} preserveState preserveScroll
                                                    className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card-hover)] ${!link.url ? 'pointer-events-none opacity-50' : ''}`}>
                                                    <ChevronLeft size={14} className="rtl:rotate-180" />
                                                </Link>
                                            );
                                        }
                                        if (index === providers.links.length - 1) {
                                            return (
                                                <Link key="next" href={link.url || '#'} preserveState preserveScroll
                                                    className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card-hover)] ${!link.url ? 'pointer-events-none opacity-50' : ''}`}>
                                                    <ChevronRight size={14} className="rtl:rotate-180" />
                                                </Link>
                                            );
                                        }
                                        if (link.label === '...') {
                                            return <span key={`ellipsis-${index}`} className="px-1 font-mono text-[12px] text-[var(--muted-foreground)]">...</span>;
                                        }
                                        return (
                                            <Link key={link.label} href={link.url || '#'} preserveState preserveScroll
                                                className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] font-mono text-[12px] font-medium ${link.active
                                                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                                    : 'border border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card-hover)]'
                                                    }`}>
                                                {link.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DashboardLayout>

            {showNewModal && <NewProviderModal specialties={specialties} onClose={() => setShowNewModal(false)} />}
            {editingProvider && <EditProviderModal provider={editingProvider} specialties={specialties} onClose={() => setEditingProvider(null)} />}
            {deletingProvider && <DeleteConfirmModal provider={deletingProvider} onClose={() => setDeletingProvider(null)} />}
        </>
    );
}
