import { Head, Link, router } from '@inertiajs/react';
import { Users, UserPlus, UserCheck, Star, Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { AddPatientModal } from '@/components/AddPatientModal';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Patient, PaginatedData } from '@/types';

interface PatientsProps {
    patients: PaginatedData<Patient & { insurance_policies?: Array<{ insurance_provider?: { name: string } | null }>; appointments_max_scheduled_at?: string | null }>;
    stats: {
        totalPatients: number;
        activePatients: number;
        newThisMonth: number;
    };
    filters: {
        search: string;
        status: string;
    };
}

function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getAvatarBg(color: string | null): string {
    if (!color) return '#22D3EE15';
    return color + '15';
}

export default function Patients({ patients, stats, filters }: PatientsProps) {
    const { t } = useTranslation('patients');
    const [search, setSearch] = useState(filters.search || '');
    const [addOpen, setAddOpen] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const handleSearch = useCallback((value: string) => {
        setSearch(value);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            router.get('/patients', { search: value || undefined, status: filters.status || undefined }, {
                preserveState: true,
                preserveScroll: true,
            });
        }, 300);
    }, [filters.status]);

    const handleStatusFilter = useCallback((status: string) => {
        router.get('/patients', { search: filters.search || undefined, status: status || undefined }, {
            preserveState: true,
            preserveScroll: true,
        });
    }, [filters.search]);

    return (
        <>
            <Head title={t('title')} />
            <DashboardLayout
                title={t('headerTitle')}
                subtitle={t('subtitle')}
                actions={
                    <Button variant="primary" icon={UserPlus} onClick={() => setAddOpen(true)}>

                        {t('addBtn')}
                    </Button>
                }
            >
                <div className="flex flex-col gap-6">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t('stats.total')}
                            value={stats.totalPatients.toLocaleString()}
                            change={`+${stats.newThisMonth}`}
                            period={t('stats.thisMonth')}
                            icon={Users}
                            iconColor="#22D3EE"
                            iconBgColor="#22D3EE15"
                        />
                        <StatCard
                            label={t('stats.new')}
                            value={stats.newThisMonth.toLocaleString()}
                            change=""
                            period={t('stats.thisMonth')}
                            icon={UserPlus}
                            iconColor="#22C55E"
                            iconBgColor="#22C55E15"
                        />
                        <StatCard
                            label={t('stats.active')}
                            value={stats.activePatients.toLocaleString()}
                            change={stats.totalPatients > 0 ? `${Math.round((stats.activePatients / stats.totalPatients) * 100)}%` : '0%'}
                            changeColor="text-[var(--primary)]"
                            period={t('stats.ofTotal')}
                            icon={UserCheck}
                            iconColor="#8B5CF6"
                            iconBgColor="#8B5CF615"
                        />
                        <StatCard
                            label={t('stats.inactive')}
                            value={(stats.totalPatients - stats.activePatients).toLocaleString()}
                            change={stats.totalPatients > 0 ? `${Math.round(((stats.totalPatients - stats.activePatients) / stats.totalPatients) * 100)}%` : '0%'}
                            changeColor="text-[var(--warning)]"
                            period={t('stats.ofTotal')}
                            icon={Star}
                            iconColor="#F59E0B"
                            iconBgColor="#F59E0B15"
                        />
                    </div>

                    {/* Patient Directory */}
                    <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                        {/* Card Header */}
                        <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                                {t('directory.title')}
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3">
                                    <Search size={14} className="text-[var(--muted-foreground)]" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        placeholder={t('directory.searchPlaceholder')}
                                        className="h-[34px] w-[200px] bg-transparent font-primary text-[13px] text-[var(--foreground)] placeholder-[#52525B] outline-none"
                                    />
                                </div>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleStatusFilter(e.target.value)}
                                    className="h-[34px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] outline-none"
                                >
                                    <option value="">{t('directory.allStatus')}</option>
                                    <option value="active">{t('status.active')}</option>
                                    <option value="inactive">{t('status.inactive')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                            {t('table.patient')}
                                        </th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                            {t('table.dob')}
                                        </th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                            {t('table.phone')}
                                        </th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                            {t('table.insurance')}
                                        </th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                            {t('table.lastVisit')}
                                        </th>
                                        <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                            {t('table.status')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.data.map((patient, index) => (
                                        <tr
                                            key={patient.id}
                                            onClick={() => router.visit(`/patients/${patient.id}`)}
                                            className={`cursor-pointer transition-colors hover:bg-[var(--card-hover)] ${index < patients.data.length - 1 ? 'border-b border-[var(--border)]' : ''
                                                }`}
                                        >
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
                                                        style={{ backgroundColor: getAvatarBg(patient.avatar_color) }}
                                                    >
                                                        <span
                                                            className="font-primary text-[11px] font-semibold"
                                                            style={{ color: patient.avatar_color || '#22D3EE' }}
                                                        >
                                                            {getInitials(patient.first_name, patient.last_name)}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                                            {patient.first_name} {patient.last_name}
                                                        </span>
                                                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                                            {patient.email || '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="font-mono text-[12px] text-[var(--muted-foreground)]">
                                                    {formatDate(patient.date_of_birth)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="font-mono text-[12px] text-[var(--foreground)]">
                                                    {patient.phone}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="font-primary text-[12px] text-[var(--foreground)]">
                                                    {patient.insurance_policies?.[0]?.insurance_provider?.name || '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="font-mono text-[12px] text-[var(--muted-foreground)]">
                                                    {formatDate(patient.appointments_max_scheduled_at)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <Badge variant={patient.status === 'active' ? 'success' : 'error'}>
                                                    {patient.status === 'active' ? t('status.active') : patient.status === 'inactive' ? t('status.inactive') : t('status.deceased')}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {patients.data.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-12 text-center">
                                                <p className="font-primary text-[14px] text-[var(--muted-foreground)]">
                                                    No patients found
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
                            <span className="font-primary text-[12px] text-[var(--muted-foreground)]">
                                {patients.total > 0
                                    ? t('pagination.showing').replace('{{from}}', String(patients.from)).replace('{{to}}', String(patients.to)).replace('{{total}}', patients.total.toLocaleString())
                                    : t('pagination.noPatients')}
                            </span>
                            {patients.last_page > 1 && (
                                <div className="flex items-center gap-1">
                                    {patients.links.map((link, index) => {
                                        if (index === 0) {
                                            return (
                                                <Link
                                                    key="prev"
                                                    href={link.url || '#'}
                                                    preserveState
                                                    preserveScroll
                                                    className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card-hover)] ${!link.url ? 'pointer-events-none opacity-50' : ''}`}
                                                >
                                                    <ChevronLeft size={14} className="rtl:rotate-180" />
                                                </Link>
                                            );
                                        }
                                        if (index === patients.links.length - 1) {
                                            return (
                                                <Link
                                                    key="next"
                                                    href={link.url || '#'}
                                                    preserveState
                                                    preserveScroll
                                                    className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card-hover)] ${!link.url ? 'pointer-events-none opacity-50' : ''}`}
                                                >
                                                    <ChevronRight size={14} className="rtl:rotate-180" />
                                                </Link>
                                            );
                                        }
                                        if (link.label === '...') {
                                            return (
                                                <span key={`ellipsis-${index}`} className="px-1 font-mono text-[12px] text-[var(--muted-foreground)]">...</span>
                                            );
                                        }
                                        return (
                                            <Link
                                                key={link.label}
                                                href={link.url || '#'}
                                                preserveState
                                                preserveScroll
                                                className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] font-mono text-[12px] font-medium ${link.active
                                                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                                    : 'border border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card-hover)]'
                                                    }`}
                                            >
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
            <AddPatientModal open={addOpen} onClose={() => setAddOpen(false)} />
        </>
    );
}
