import { Head } from '@inertiajs/react';
import { Building2, Users, CreditCard, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlatformLayout } from '@/components/PlatformLayout';
import { Badge } from '@/components/Badge';

interface PlatformDashboardProps {
    stats: {
        totalClinics: number;
        totalUsers: number;
        activeSubscriptions: number;
        monthlyRevenue: number;
    };
    recentClinics: {
        id: number;
        name: string;
        email: string;
        phone: string;
        is_enabled: boolean;
        created_at: string;
        users_count: number;
        subscription?: { plan: string; status: string } | null;
    }[];
}

export default function Dashboard({ stats, recentClinics }: PlatformDashboardProps) {
    const { t } = useTranslation('platform');
    const tr = (key: string, opts?: Record<string, unknown>) => t(`dashboard.${key}`, opts as never);

    return (
        <PlatformLayout title={tr('title')} subtitle={tr('subtitle')}>
            <Head title="Platform Dashboard" />

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Building2} label={tr('stats.totalClinics')} value={stats.totalClinics} color="#22D3EE" />
                <StatCard icon={Users} label={tr('stats.totalUsers')} value={stats.totalUsers} color="#22C55E" />
                <StatCard icon={CreditCard} label={tr('stats.activeSubscriptions')} value={stats.activeSubscriptions} color="#8B5CF6" />
                <StatCard icon={TrendingUp} label={tr('stats.monthlyRevenue')} value={`$${stats.monthlyRevenue.toLocaleString()}`} color="#F59E0B" />
            </div>

            {/* Recent Clinics */}
            <div className="mt-6 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                <div className="border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-[14px] font-semibold text-[var(--foreground)]">{tr('recentRegistrations')}</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.clinic')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.email')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.users')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.plan')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.status')}</th>
                                <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.registered')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentClinics.map((clinic, i) => (
                                <tr key={clinic.id} className={`transition-colors hover:bg-[var(--card-hover)] ${i < recentClinics.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                                    <td className="px-5 py-3">
                                        <span className="text-[13px] font-medium text-[var(--foreground)]">{clinic.name}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-[12px] text-[var(--muted-foreground)]">{clinic.email}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="font-mono text-[12px] text-[var(--foreground)]">{clinic.users_count}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="font-mono text-[11px] capitalize text-[var(--muted-foreground)]">
                                            {clinic.subscription?.plan ?? '—'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <Badge variant={clinic.is_enabled ? 'success' : 'danger'}>
                                            {clinic.is_enabled ? tr('status.active') : tr('status.disabled')}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                                            {new Date(clinic.created_at).toLocaleDateString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {recentClinics.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-[13px] text-[var(--muted-foreground)]">
                                        {tr('table.noClinics')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </PlatformLayout>
    );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
    return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium uppercase text-[var(--muted-foreground)]">{label}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]" style={{ backgroundColor: color + '15' }}>
                    <Icon size={16} style={{ color }} />
                </div>
            </div>
            <span className="mt-2 block font-mono text-[28px] font-bold text-[var(--foreground)]">{value}</span>
        </div>
    );
}
