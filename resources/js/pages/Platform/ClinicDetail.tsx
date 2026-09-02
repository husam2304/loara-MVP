import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Building2, Mail, Phone, Globe, UserCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlatformLayout } from '@/components/PlatformLayout';
import { Badge } from '@/components/Badge';

interface ClinicDetailProps {
    clinic: {
        id: number;
        name: string;
        email: string;
        phone: string;
        address: string | null;
        city: string | null;
        state: string | null;
        zip_code: string | null;
        timezone: string;
        is_enabled: boolean;
        created_at: string;
        subscription?: { plan: string; status: string } | null;
        ai_configuration?: { vapi_assistant_id: string | null; vapi_phone_number: string | null } | null;
    };
    users: {
        id: number;
        name: string;
        email: string;
        role: string;
        is_active: boolean;
        last_active_at: string | null;
    }[];
}

export default function ClinicDetail({ clinic, users }: ClinicDetailProps) {
    const { t } = useTranslation('platform');
    const tr = (key: string, opts?: Record<string, unknown>) => t(`clinicDetail.${key}`, opts as never);

    function impersonate(userId: number) {
        router.post(`/platform/clinics/${clinic.id}/users/${userId}/impersonate`);
    }

    return (
        <PlatformLayout
            title={clinic.name}
            subtitle={tr('subtitle')}
            actions={
                <button onClick={() => router.get('/platform/clinics')} className="flex items-center gap-1.5 font-primary text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                    <ArrowLeft size={14} className="rtl:rotate-180" /> {tr('backToClinics')}
                </button>
            }
        >
            <Head title={clinic.name} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Clinic Info */}
                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5 lg:col-span-1">
                    <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                        <Building2 size={20} className="text-[var(--primary)]" />
                        <div>
                            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{clinic.name}</h2>
                            <Badge variant={clinic.is_enabled ? 'success' : 'danger'}>
                                {clinic.is_enabled ? tr('status.enabled') : tr('status.disabled')}
                            </Badge>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                        <InfoRow icon={Mail} label={tr('info.email')} value={clinic.email} />
                        <InfoRow icon={Phone} label={tr('info.phone')} value={clinic.phone} />
                        <InfoRow icon={Globe} label={tr('info.timezone')} value={clinic.timezone} />
                        {clinic.address && <InfoRow icon={Building2} label={tr('info.address')} value={[clinic.address, clinic.city, clinic.state, clinic.zip_code].filter(Boolean).join(', ')} />}
                        <div className="mt-2 border-t border-[var(--border)] pt-3">
                            <span className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">{tr('info.subscription')}</span>
                            <p className="mt-1 font-mono text-[13px] capitalize text-[var(--foreground)]">
                                {clinic.subscription?.plan ?? tr('info.none')} — {clinic.subscription?.status ?? tr('info.noSubscription')}
                            </p>
                        </div>
                        <div>
                            <span className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">{tr('info.aiAssistant')}</span>
                            <p className="mt-1 font-mono text-[12px] text-[var(--foreground)]">
                                {clinic.ai_configuration?.vapi_assistant_id ? tr('info.configured') : tr('info.notConfigured')}
                            </p>
                        </div>
                        <div>
                            <span className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">{tr('info.registered')}</span>
                            <p className="mt-1 font-mono text-[12px] text-[var(--foreground)]">{new Date(clinic.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Users */}
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                        <h2 className="font-mono text-[14px] font-semibold text-[var(--foreground)]">{tr('clinicUsers')}</h2>
                        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{tr('usersCount', { count: users.length })}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                                    <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.name')}</th>
                                    <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.email')}</th>
                                    <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.role')}</th>
                                    <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.status')}</th>
                                    <th className="px-5 py-3 text-end font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{tr('table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user, i) => (
                                    <tr key={user.id} className={`transition-colors hover:bg-[var(--card-hover)] ${i < users.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                                        <td className="px-5 py-3 text-[13px] font-medium text-[var(--foreground)]">{user.name}</td>
                                        <td className="px-5 py-3 text-[12px] text-[var(--muted-foreground)]">{user.email}</td>
                                        <td className="px-5 py-3 font-mono text-[11px] capitalize text-[var(--muted-foreground)]">{user.role.replace('_', ' ')}</td>
                                        <td className="px-5 py-3">
                                            <Badge variant={user.is_active ? 'success' : 'danger'}>{user.is_active ? tr('status.active') : tr('status.inactive')}</Badge>
                                        </td>
                                        <td className="px-5 py-3 text-end">
                                            <button
                                                onClick={() => impersonate(user.id)}
                                                className="inline-flex items-center gap-1 font-primary text-[12px] font-medium text-[var(--primary)] hover:underline"
                                            >
                                                <UserCog size={12} /> {tr('impersonate')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[var(--muted-foreground)]">{tr('table.noUsers')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </PlatformLayout>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon size={14} className="shrink-0 text-[var(--muted-foreground)]" />
            <div>
                <span className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">{label}</span>
                <p className="text-[13px] text-[var(--foreground)]">{value}</p>
            </div>
        </div>
    );
}
