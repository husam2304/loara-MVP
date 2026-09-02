import { Head, Link, router } from '@inertiajs/react';
import { useState, useRef } from 'react';
import { Search, Building2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlatformLayout } from '@/components/PlatformLayout';
import { Badge } from '@/components/Badge';
import type { PaginatedData } from '@/types';

interface ClinicRow {
    id: number;
    name: string;
    email: string;
    phone: string;
    is_enabled: boolean;
    created_at: string;
    users_count: number;
    subscription?: { plan: string; status: string; current_period_end: string | null } | null;
}

interface ClinicsProps {
    clinics: PaginatedData<ClinicRow>;
    filters: { search: string | null };
}

export default function Clinics({ clinics, filters }: ClinicsProps) {
    const { t } = useTranslation('platform');
    const tr = (key: string, opts?: Record<string, unknown>) => t(`clinics.${key}`, opts as never);

    const [search, setSearch] = useState(filters.search ?? '');
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    function handleSearch(value: string) {
        setSearch(value);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            router.get('/platform/clinics', { search: value || undefined }, { preserveState: true, preserveScroll: true });
        }, 300);
    }

    function toggleEnabled(clinicId: number) {
        router.patch(`/platform/clinics/${clinicId}/toggle`, {}, { preserveScroll: true });
    }

    return (
        <PlatformLayout title={tr('title')} subtitle={tr('subtitle')}>
            <Head title="Clinics" />

            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                {/* Search */}
                <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3">
                    <Search size={14} className="text-[var(--muted-foreground)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={tr('searchPlaceholder')}
                        className="flex-1 bg-transparent font-primary text-[13px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                    />
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.clinic')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.email')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.users')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.plan')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.status')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.enabled')}</th>
                                <th className="px-5 py-3 text-end font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clinics.data.map((clinic, i) => (
                                <tr key={clinic.id} className={`transition-colors hover:bg-[var(--card-hover)] ${i < clinics.data.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={14} className="text-[var(--primary)]" />
                                            <span className="text-[13px] font-medium text-[var(--foreground)]">{clinic.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-[12px] text-[var(--muted-foreground)]">{clinic.email}</td>
                                    <td className="px-5 py-3 font-mono text-[12px] text-[var(--foreground)]">{clinic.users_count}</td>
                                    <td className="px-5 py-3 font-mono text-[11px] capitalize text-[var(--muted-foreground)]">{clinic.subscription?.plan ?? '—'}</td>
                                    <td className="px-5 py-3">
                                        <Badge variant={clinic.subscription?.status === 'active' ? 'success' : clinic.subscription?.status === 'trialing' ? 'info' : 'warning'}>
                                            {clinic.subscription?.status ?? tr('subscriptionNone')}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-3">
                                        <button onClick={() => toggleEnabled(clinic.id)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                                            {clinic.is_enabled
                                                ? <ToggleRight size={20} className="text-emerald-400" />
                                                : <ToggleLeft size={20} className="text-[var(--muted-foreground)]" />
                                            }
                                        </button>
                                    </td>
                                    <td className="px-5 py-3 text-end">
                                        <Link
                                            href={`/platform/clinics/${clinic.id}`}
                                            className="font-primary text-[12px] font-medium text-[var(--primary)] hover:underline"
                                        >
                                            {tr('table.view')}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {clinics.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-[13px] text-[var(--muted-foreground)]">{tr('table.noClinics')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {clinics.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
                        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                            {tr('pagination.showing', { from: clinics.from, to: clinics.to, total: clinics.total })}
                        </span>
                        <div className="flex gap-1">
                            {clinics.links.map((link, i) => (
                                <button
                                    key={i}
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                    className={`rounded px-2.5 py-1 font-mono text-[11px] ${
                                        link.active ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)]'
                                    } disabled:opacity-30`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </PlatformLayout>
    );
}
