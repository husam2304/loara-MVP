import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import {
    UserPlus,
    UserCheck,
    Search,
    Edit2,
    Trash2,
    ToggleLeft,
    ToggleRight,
    X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    title: string | null;
    phone: string | null;
    is_active: boolean;
    last_active_at: string | null;
    created_at: string;
}

interface UserManagementProps {
    users: User[];
    roleStats: Record<string, number>;
    totalUsers: number;
    activeUsers: number;
}

const roleBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    admin: 'danger',
    provider: 'success',
    staff: 'info',
    billing: 'warning',
    customer: 'default',
};

export default function UserManagement({ users, roleStats, totalUsers, activeUsers }: UserManagementProps) {
    const { t } = useTranslation('admin');
    const tr = (key: string, opts?: Record<string, unknown>) => t(`userManagement.${key}`, opts as never);

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const createForm = useForm({
        name: '',
        email: '',
        role: 'staff',
        title: '',
        phone: '',
    });

    const editForm = useForm({
        name: '',
        email: '',
        role: '',
        title: '',
        phone: '',
        is_active: true,
    });

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleCreate = (e: FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/users', {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            },
        });
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        editForm.setData({
            name: user.name,
            email: user.email,
            role: user.role,
            title: user.title ?? '',
            phone: user.phone ?? '',
            is_active: user.is_active,
        });
    };

    const handleUpdate = (e: FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        editForm.patch(`/admin/users/${editingUser.id}`, {
            onSuccess: () => setEditingUser(null),
        });
    };

    const handleToggleActive = (user: User) => {
        router.patch(`/admin/users/${user.id}`, { is_active: !user.is_active });
    };

    const handleDelete = (user: User) => {
        if (confirm(tr('actions.deleteConfirm', { name: user.name }))) {
            router.delete(`/admin/users/${user.id}`);
        }
    };

    return (
        <DashboardLayout title={tr('title')} subtitle={tr('subtitle')}>
            <Head title="User Management" />

            <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                        <p className="text-xs text-[var(--muted-foreground)]">{tr('stats.totalUsers')}</p>
                        <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{totalUsers}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                        <p className="text-xs text-[var(--muted-foreground)]">{tr('stats.activeUsers')}</p>
                        <p className="mt-1 text-2xl font-bold text-[var(--success)]">{activeUsers}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                        <p className="text-xs text-[var(--muted-foreground)]">{tr('stats.clinicOwners')}</p>
                        <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{roleStats.clinic_owner ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                        <p className="text-xs text-[var(--muted-foreground)]">{tr('stats.customers')}</p>
                        <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{roleStats.customer ?? 0}</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute top-1/2 start-3 -translate-y-1/2 text-[var(--muted-foreground)]" />
                            <input
                                type="text"
                                placeholder={tr('searchPlaceholder')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] ps-9 pe-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                        >
                            <option value="all">{tr('roles.all')}</option>
                            <option value="admin">{tr('roles.admin')}</option>
                            <option value="provider">{tr('roles.provider')}</option>
                            <option value="staff">{tr('roles.staff')}</option>
                            <option value="billing">{tr('roles.billing')}</option>
                            <option value="customer">{tr('roles.customer')}</option>
                        </select>
                    </div>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <UserPlus size={16} />
                        {tr('addUser')}
                    </Button>
                </div>

                {/* Users table */}
                <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
                                <th className="px-4 py-3 text-start font-medium text-[var(--muted-foreground)]">{tr('table.user')}</th>
                                <th className="px-4 py-3 text-start font-medium text-[var(--muted-foreground)]">{tr('table.role')}</th>
                                <th className="hidden px-4 py-3 text-start font-medium text-[var(--muted-foreground)] md:table-cell">{tr('table.title')}</th>
                                <th className="px-4 py-3 text-start font-medium text-[var(--muted-foreground)]">{tr('table.status')}</th>
                                <th className="px-4 py-3 text-end font-medium text-[var(--muted-foreground)]">{tr('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="border-b border-[var(--border)] last:border-0">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#22D3EE20]">
                                                <span className="text-[11px] font-semibold text-[var(--primary)]">
                                                    {user.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-[var(--foreground)]">{user.name}</p>
                                                <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={roleBadgeVariant[user.role] ?? 'default'}>
                                            {user.role}
                                        </Badge>
                                    </td>
                                    <td className="hidden px-4 py-3 text-[var(--muted-foreground)] md:table-cell">{user.title ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={user.is_active ? 'success' : 'danger'}>
                                            {user.is_active ? tr('status.active') : tr('status.inactive')}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {user.role !== 'super_admin' && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm(tr('actions.impersonateConfirm', { name: user.name }))) {
                                                            router.post(`/admin/impersonate/${user.id}`);
                                                        }
                                                    }}
                                                    className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--primary)]"
                                                    title={tr('actions.impersonate', { name: user.name })}
                                                >
                                                    <UserCheck size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                                                title={user.is_active ? tr('actions.deactivate') : tr('actions.activate')}
                                            >
                                                {user.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                                                title={tr('actions.edit')}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--destructive)]"
                                                title={tr('actions.delete')}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                                        {tr('table.noUsers')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">{tr('modal.addTitle')}</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('modal.name')}</label>
                                <input
                                    type="text"
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                />
                                {createForm.errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{createForm.errors.name}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('modal.email')}</label>
                                <input
                                    type="email"
                                    value={createForm.data.email}
                                    onChange={(e) => createForm.setData('email', e.target.value)}
                                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                />
                                {createForm.errors.email && <p className="mt-1 text-xs text-[var(--destructive)]">{createForm.errors.email}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('modal.role')}</label>
                                <select
                                    value={createForm.data.role}
                                    onChange={(e) => createForm.setData('role', e.target.value)}
                                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                >
                                    <option value="admin">{tr('roles.admin')}</option>
                                    <option value="provider">{tr('roles.provider')}</option>
                                    <option value="staff">{tr('roles.staff')}</option>
                                    <option value="billing">{tr('roles.billing')}</option>
                                    <option value="customer">{tr('roles.customer')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('modal.title')}</label>
                                <input
                                    type="text"
                                    value={createForm.data.title}
                                    onChange={(e) => createForm.setData('title', e.target.value)}
                                    placeholder={tr('modal.titlePlaceholder')}
                                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>{tr('modal.cancel')}</Button>
                                <Button type="submit" disabled={createForm.processing}>{tr('modal.createUser')}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">{tr('modal.editTitle')}</h3>
                            <button onClick={() => setEditingUser(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('modal.name')}</label>
                                <input
                                    type="text"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                />
                                {editForm.errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{editForm.errors.name}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('modal.email')}</label>
                                <input
                                    type="email"
                                    value={editForm.data.email}
                                    onChange={(e) => editForm.setData('email', e.target.value)}
                                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                />
                                {editForm.errors.email && <p className="mt-1 text-xs text-[var(--destructive)]">{editForm.errors.email}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('modal.role')}</label>
                                <select
                                    value={editForm.data.role}
                                    onChange={(e) => editForm.setData('role', e.target.value)}
                                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                >
                                    <option value="admin">{tr('roles.admin')}</option>
                                    <option value="provider">{tr('roles.provider')}</option>
                                    <option value="staff">{tr('roles.staff')}</option>
                                    <option value="billing">{tr('roles.billing')}</option>
                                    <option value="customer">{tr('roles.customer')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{tr('modal.title')}</label>
                                <input
                                    type="text"
                                    value={editForm.data.title}
                                    onChange={(e) => editForm.setData('title', e.target.value)}
                                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={editForm.data.is_active}
                                    onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                    className="rounded border-[var(--border)]"
                                />
                                <label htmlFor="is_active" className="text-sm text-[var(--foreground)]">{tr('modal.active')}</label>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="secondary" type="button" onClick={() => setEditingUser(null)}>{tr('modal.cancel')}</Button>
                                <Button type="submit" disabled={editForm.processing}>{tr('modal.updateUser')}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
