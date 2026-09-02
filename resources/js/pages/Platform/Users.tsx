import { Head, router } from '@inertiajs/react';
import { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlatformLayout } from '@/components/PlatformLayout';
import { Badge } from '@/components/Badge';
import type { PaginatedData } from '@/types';

interface UserRow {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    last_active_at: string | null;
    clinic?: { id: number; name: string } | null;
}

interface UsersProps {
    users: PaginatedData<UserRow>;
    filters: { search: string | null; role: string | null };
}

export default function Users({ users, filters }: UsersProps) {
    const { t } = useTranslation('platform');
    const tr = (key: string, opts?: Record<string, unknown>) => t(`users.${key}`, opts as never);

    const roleOptions = [
        { value: '', label: tr('roles.all') },
        { value: 'clinic_owner', label: tr('roles.clinic_owner') },
        { value: 'provider', label: tr('roles.provider') },
        { value: 'staff', label: tr('roles.staff') },
        { value: 'billing', label: tr('roles.billing') },
        { value: 'customer', label: tr('roles.customer') },
    ];

    const [search, setSearch] = useState(filters.search ?? '');
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    function handleSearch(value: string) {
        setSearch(value);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            router.get('/platform/users', { search: value || undefined, role: filters.role || undefined }, { preserveState: true, preserveScroll: true });
        }, 300);
    }

    function handleRoleFilter(role: string) {
        router.get('/platform/users', { search: filters.search || undefined, role: role || undefined }, { preserveState: true, preserveScroll: true });
    }

    return (
        <PlatformLayout title={tr('title')} subtitle={tr('subtitle')}>
            <Head title="Platform Users" />

            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                {/* Filters */}
                <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3">
                    <Search size={14} className="text-[var(--muted-foreground)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={tr('searchPlaceholder')}
                        className="flex-1 bg-transparent font-primary text-[13px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                    />
                    <select
                        value={filters.role ?? ''}
                        onChange={(e) => handleRoleFilter(e.target.value)}
                        className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-1.5 font-primary text-[12px] text-[var(--foreground)] outline-none"
                    >
                        {roleOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.name')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.email')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.clinic')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.role')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.map((user, i) => (
                                <tr key={user.id} className={`transition-colors hover:bg-[var(--card-hover)] ${i < users.data.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                                    <td className="px-5 py-3 text-[13px] font-medium text-[var(--foreground)]">{user.name}</td>
                                    <td className="px-5 py-3 text-[12px] text-[var(--muted-foreground)]">{user.email}</td>
                                    <td className="px-5 py-3 text-[12px] text-[var(--primary)]">{user.clinic?.name ?? '—'}</td>
                                    <td className="px-5 py-3 font-mono text-[11px] capitalize text-[var(--muted-foreground)]">{user.role.replace('_', ' ')}</td>
                                    <td className="px-5 py-3">
                                        <Badge variant={user.is_active ? 'success' : 'danger'}>{user.is_active ? tr('status.active') : tr('status.inactive')}</Badge>
                                    </td>
                                </tr>
                            ))}
                            {users.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[var(--muted-foreground)]">{tr('table.noUsers')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
                        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                            {tr('pagination.showing', { from: users.from, to: users.to, total: users.total })}
                        </span>
                        <div className="flex gap-1">
                            {users.links.map((link, i) => (
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
