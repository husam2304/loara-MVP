import {
    LayoutDashboard,
    Building2,
    Users,
    DollarSign,
    Settings,
    LogOut,
    Headphones,
} from 'lucide-react';
import { Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import type { SharedProps } from '@/types';

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    active?: boolean;
}

function NavItem({ icon: Icon, label, href, active = false }: NavItemProps) {
    return (
        <Link
            href={href}
            className={`group relative flex h-10 items-center gap-3 rounded-lg px-3 transition-all duration-150 ${active
                ? 'bg-[var(--sidebar-active)] text-[var(--foreground)]'
                : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]'
                }`}
        >
            {active && (
                <span className="absolute top-1/2 start-0 h-5 w-[3px] -translate-y-1/2 rounded-e-full bg-[var(--primary)] transition-all" />
            )}
            <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className={`shrink-0 ${active ? 'text-[var(--primary)]' : ''}`} />
            <span className="whitespace-nowrap text-[13px] font-medium">{label}</span>
        </Link>
    );
}

function SectionLabel({ label }: { label: string }) {
    return (
        <div className="mb-1.5 mt-6 flex items-center px-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--sidebar-text)]">{label}</span>
        </div>
    );
}

export function PlatformSidebar() {
    const { t } = useTranslation('sidebar');
    const { url, props } = usePage<SharedProps>();
    const currentPath = url || '/platform/dashboard';
    const user = props.auth.user;

    return (
        <aside className="hidden h-full w-[240px] flex-col border-e border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] md:flex">
            {/* Logo */}
            <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-[var(--sidebar-border)] px-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary)]">
                    <Headphones size={14} className="text-[var(--primary-foreground)]" />
                </div>
                <span className="truncate text-[14px] font-bold text-[var(--foreground)]">
                    {props.appName ?? 'Loara'}
                </span>
            </div>

            {/* Platform badge */}
            <div className="mx-2.5 my-2 flex items-center gap-2 rounded-[var(--radius-md)] bg-indigo-500/10 px-3 py-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-indigo-400" />
                <span className="text-[12px] font-medium text-indigo-400">{t('platform.badge')}</span>
            </div>

            {/* Navigation */}
            <div className="flex flex-1 flex-col overflow-y-auto px-2.5 py-2">
                <SectionLabel label={t('platform.sections.overview')} />
                <nav className="flex flex-col gap-0.5">
                    <NavItem icon={LayoutDashboard} label={t('platform.nav.dashboard')} href="/platform/dashboard" active={currentPath === '/platform/dashboard'} />
                </nav>

                <SectionLabel label={t('platform.sections.management')} />
                <nav className="flex flex-col gap-0.5">
                    <NavItem icon={Building2} label={t('platform.nav.clinics')} href="/platform/clinics" active={currentPath.startsWith('/platform/clinics')} />
                    <NavItem icon={Users} label={t('platform.nav.users')} href="/platform/users" active={currentPath === '/platform/users'} />
                    <NavItem icon={DollarSign} label={t('platform.nav.pricing')} href="/platform/pricing" active={currentPath.startsWith('/platform/pricing')} />
                </nav>

                <SectionLabel label={t('platform.sections.configuration')} />
                <nav className="flex flex-col gap-0.5">
                    <NavItem icon={Settings} label={t('platform.nav.settings')} href="/platform/settings" active={currentPath.startsWith('/platform/settings')} />
                </nav>
            </div>

            {/* User */}
            <div className="shrink-0 border-t border-[var(--sidebar-border)] p-2.5">
                {user && (
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                            <span className="text-[11px] font-semibold text-indigo-400">
                                {user.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                            </span>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[13px] font-medium text-[var(--foreground)]">{user.name}</span>
                            <span className="text-[11px] text-indigo-400">{t('platform.superAdmin')}</span>
                        </div>
                        <button
                            onClick={() => router.post('/logout')}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--sidebar-text)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--destructive)]"
                            title={t('platform.signOut')}
                        >
                            <LogOut size={14} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
