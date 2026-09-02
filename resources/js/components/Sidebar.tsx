import {
    LayoutDashboard,
    Phone,
    Calendar,
    Users,
    Shield,
    Stethoscope,
    BarChart2,
    AlertTriangle,
    Zap,
    Workflow,
    Globe,
    CreditCard,
    Settings,
    Headphones,
    UserCog,
    ChevronsLeft,
    ChevronsRight,
    LogOut,
    Building2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import type { SharedProps } from '@/types';

interface NavItemProps {
    icon: LucideIcon;
    label: string;
    href: string;
    active?: boolean;
    collapsed: boolean;
}

function NavItem({ icon: Icon, label, href, active = false, collapsed }: NavItemProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = () => {
        if (!collapsed) return;
        timeoutRef.current = setTimeout(() => setShowTooltip(true), 150);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShowTooltip(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <Link
                href={href}
                className={`group relative flex h-10 items-center gap-3 rounded-lg px-3 transition-all duration-150 ${active
                    ? 'bg-[var(--sidebar-active)] text-[var(--foreground)]'
                    : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]'
                    } ${collapsed ? 'justify-center' : ''}`}
            >
                {active && (
                    <span className="absolute top-1/2 start-0 h-5 w-[3px] -translate-y-1/2 rounded-e-full bg-[var(--primary)] transition-all" />
                )}
                <Icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={`shrink-0 transition-colors ${active ? 'text-[var(--primary)]' : ''}`}
                />
                <span
                    className={`whitespace-nowrap text-[13px] font-medium transition-all duration-200 ${collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-auto opacity-100'
                        }`}
                >
                    {label}
                </span>
            </Link>

            {collapsed && showTooltip && (
                <div className="pointer-events-none absolute top-1/2 start-full z-50 ms-3 -translate-y-1/2">
                    <div className="relative rounded-md bg-[var(--foreground)] px-2.5 py-1.5 text-xs font-medium text-[var(--background)] shadow-lg">
                        {label}
                        <span className="absolute top-1/2 end-full -translate-y-1/2 border-4 border-transparent border-e-[var(--foreground)] rtl:border-e-transparent rtl:border-s-[var(--foreground)]" />
                    </div>
                </div>
            )}
        </div>
    );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
    return (
        <div className="mb-1.5 mt-6 flex items-center px-3">
            {collapsed ? (
                <div className="mx-auto h-px w-5 bg-[var(--sidebar-border)]" />
            ) : (
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--sidebar-text)]">
                    {label}
                </span>
            )}
        </div>
    );
}

function ClinicLabel({ clinic }: { clinic: SharedProps['clinic'] }) {
    const { t } = useTranslation('sidebar');
    return (
        <div className="mx-2.5 my-2 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--sidebar-active)] px-3 py-2">
            <Building2 size={14} className="shrink-0 text-[var(--primary)]" />
            <span className="min-w-0 truncate text-[12px] font-medium text-[var(--foreground)]">{clinic?.name ?? t('clinic.noClinic')}</span>
        </div>
    );
}

export function Sidebar() {
    const { t } = useTranslation('sidebar');
    const [collapsed, setCollapsed] = useState(false);
    const { url, props } = usePage<SharedProps>();
    const currentPath = url || '/';
    const user = props.auth.user;
    const role = user?.role;
    const isClinicOwner = role === 'clinic_owner';
    const isBillingAllowed = isClinicOwner || role === 'billing' || role === 'customer';
    // Clinical/operational nav is staff-only; the patient-facing `customer` role
    // only gets Dashboard + Billing (matches the route middleware).
    const isClinicStaff = isClinicOwner || role === 'provider' || role === 'staff' || role === 'billing';
    const features = props.planFeatures ?? [];
    const hasFeature = (f: string) => features.includes(f as never);

    const [collapseTooltip, setCollapseTooltip] = useState(false);
    const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleCollapseEnter = () => {
        if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
        collapseTimeoutRef.current = setTimeout(() => setCollapseTooltip(true), 100);
    };

    const handleCollapseLeave = () => {
        if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
        setCollapseTooltip(false);
    };

    // Reset tooltip when collapsed state changes
    useEffect(() => {
        setCollapseTooltip(false);
        if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    }, [collapsed]);

    useEffect(() => {
        return () => {
            if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
        };
    }, []);

    return (
        <aside
            className={`relative hidden h-full flex-col border-e border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-all duration-300 ease-in-out md:flex ${collapsed ? 'w-[68px]' : 'w-[240px]'
                }`}
        >
            {/* Logo + App name + Collapse toggle */}
            <div className={`flex shrink-0 items-center border-b border-[var(--sidebar-border)] ${collapsed ? 'h-14 justify-center px-0' : 'h-14 justify-between px-4'}`}>
                <div className="flex min-w-0 items-center gap-2.5">
                    {props.clinic?.logo_url ? (
                        <img src={`/storage/${props.clinic.logo_url}`} alt="" className="h-7 w-7 shrink-0 rounded-md object-contain" />
                    ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary)]">
                            <Headphones size={14} className="text-[var(--primary-foreground)]" />
                        </div>
                    )}
                    <span
                        className={`truncate text-[14px] font-bold text-[var(--foreground)] transition-all duration-200 ${collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-auto opacity-100'
                            }`}
                    >
                        {props.appName ?? 'Loara'}
                    </span>
                </div>
                {!collapsed && (
                    <button
                        onClick={() => { setCollapseTooltip(false); setCollapsed(true); }}
                        onMouseEnter={handleCollapseEnter}
                        onMouseLeave={handleCollapseLeave}
                        className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--sidebar-text)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                        aria-label={t('clinic.collapse')}
                    >
                        <ChevronsLeft size={16} className="rtl:rotate-180" />
                        {collapseTooltip && (
                            <div className="pointer-events-none absolute top-full start-1/2 z-50 mt-2 -translate-x-1/2">
                                <div className="relative whitespace-nowrap rounded-md bg-[var(--foreground)] px-2.5 py-1.5 text-xs font-medium text-[var(--background)] shadow-lg">
                                    {t('clinic.collapse')}
                                    <span className="absolute bottom-full start-1/2 -translate-x-1/2 border-4 border-transparent border-b-[var(--foreground)]" />
                                </div>
                            </div>
                        )}
                    </button>
                )}
            </div>

            {/* Clinic name */}
            {!collapsed && <ClinicLabel clinic={props.clinic} />}

            {/* Expand button (collapsed state only) */}
            {collapsed && (
                <div className="flex shrink-0 justify-center py-2">
                    <button
                        onClick={() => { setCollapseTooltip(false); setCollapsed(false); }}
                        onMouseEnter={handleCollapseEnter}
                        onMouseLeave={handleCollapseLeave}
                        className="relative flex h-8 w-8 items-center justify-center rounded-md text-[var(--sidebar-text)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                        aria-label={t('clinic.expandSidebar')}
                    >
                        <ChevronsRight size={16} className="rtl:rotate-180" />
                        {collapseTooltip && (
                            <div className="pointer-events-none absolute top-1/2 start-full z-50 ms-2 -translate-y-1/2">
                                <div className="relative whitespace-nowrap rounded-md bg-[var(--foreground)] px-2.5 py-1.5 text-xs font-medium text-[var(--background)] shadow-lg">
                                    {t('clinic.expandSidebar')}
                                    <span className="absolute top-1/2 end-full -translate-y-1/2 border-4 border-transparent border-e-[var(--foreground)] rtl:border-e-transparent rtl:border-s-[var(--foreground)]" />
                                </div>
                            </div>
                        )}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-2.5 py-2">
                <SectionLabel label={t('clinic.sections.overview')} collapsed={collapsed} />
                <nav className="flex flex-col gap-0.5">
                    <NavItem icon={LayoutDashboard} label={t('clinic.nav.dashboard')} href="/dashboard" active={currentPath === '/dashboard'} collapsed={collapsed} />
                    {isClinicStaff && (
                        <>
                            <NavItem icon={Phone} label={t('clinic.nav.callCenter')} href="/call-center" active={currentPath === '/call-center'} collapsed={collapsed} />
                            <NavItem icon={Calendar} label={t('clinic.nav.appointments')} href="/appointments" active={currentPath === '/appointments'} collapsed={collapsed} />
                            <NavItem icon={Users} label={t('clinic.nav.patients')} href="/patients" active={currentPath.startsWith('/patients')} collapsed={collapsed} />
                            <NavItem icon={Stethoscope} label={t('clinic.nav.doctors')} href="/providers" active={currentPath.startsWith('/providers')} collapsed={collapsed} />
                            {/* <NavItem icon={Shield} label={t('clinic.nav.insurance')} href="/insurance" active={currentPath === '/insurance'} collapsed={collapsed} /> */}
                        </>
                    )}
                </nav>

                <SectionLabel label={t('clinic.sections.management')} collapsed={collapsed} />
                <nav className="flex flex-col gap-0.5">
                    {isClinicStaff && (
                        <NavItem icon={BarChart2} label={t('clinic.nav.analytics')} href="/analytics" active={currentPath.startsWith('/analytics')} collapsed={collapsed} />
                    )}
                    {isClinicOwner && (
                        <>
                            {hasFeature('triage') && (
                                <NavItem icon={AlertTriangle} label={t('clinic.nav.triageRules')} href="/triage-rules" active={currentPath === '/triage-rules'} collapsed={collapsed} />
                            )}
                            {/* {hasFeature('integrations') && (
                                <NavItem icon={Zap} label={t('clinic.nav.integrations')} href="/integrations" active={currentPath === '/integrations'} collapsed={collapsed} />
                            )} */}
                            {/* {hasFeature('custom_workflows') && (
                                <NavItem icon={Workflow} label={t('clinic.nav.workflow')} href="/workflow" active={currentPath === '/workflow'} collapsed={collapsed} />
                            )} */}
                            <NavItem icon={Globe} label={t('clinic.nav.landingPage')} href="/landing-page" active={currentPath === '/landing-page'} collapsed={collapsed} />
                        </>
                    )}
                    {/* {isBillingAllowed && (
                        <NavItem icon={CreditCard} label={t('clinic.nav.billing')} href="/billing" active={currentPath.startsWith('/billing')} collapsed={collapsed} />
                    )} */}
                    {isClinicOwner && (
                        <NavItem icon={Settings} label={t('clinic.nav.settings')} href="/settings" active={currentPath === '/settings'} collapsed={collapsed} />
                    )}
                </nav>

                {isClinicOwner && (
                    <>
                        <SectionLabel label={t('clinic.sections.clinicAdmin')} collapsed={collapsed} />
                        <nav className="flex flex-col gap-0.5">
                            <NavItem icon={UserCog} label={t('clinic.nav.users')} href="/admin/users" active={currentPath.startsWith('/admin/users')} collapsed={collapsed} />
                        </nav>
                    </>
                )}

            </div>

            {/* Bottom section */}
            <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--sidebar-border)] p-2.5">
                {/* AI Status */}
                <div
                    className={`flex items-center rounded-lg bg-[var(--sidebar-active)] transition-all ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                        }`}
                >
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
                    </span>
                    <div
                        className={`flex flex-col transition-all duration-200 ${collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-auto opacity-100'
                            }`}
                    >
                        <span className="whitespace-nowrap text-xs font-semibold text-[var(--success)]">
                            {t('clinic.aiAgentActive')}
                        </span>
                        <span className="whitespace-nowrap font-mono text-[10px] text-[var(--muted-foreground)]">
                            {t('clinic.readyForCalls')}
                        </span>
                    </div>
                </div>

                {/* User profile */}
                {user && (
                    <div
                        className={`flex items-center rounded-lg transition-all ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
                            }`}
                    >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#22D3EE20]">
                            <span className="text-[11px] font-semibold text-[var(--primary)]">
                                {user.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                            </span>
                        </div>
                        <div
                            className={`flex min-w-0 flex-1 flex-col transition-all duration-200 ${collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-auto opacity-100'
                                }`}
                        >
                            <span className="truncate whitespace-nowrap text-[13px] font-medium text-[var(--foreground)]">
                                {user.name}
                            </span>
                            <span className="whitespace-nowrap text-[11px] capitalize text-[var(--muted-foreground)]">
                                {props.impersonating ? (
                                    <span className="text-[var(--primary)]">{t('clinic.impersonating')}</span>
                                ) : (
                                    user.role
                                )}
                            </span>
                        </div>
                        {!collapsed && (
                            <button
                                onClick={() => router.post('/logout')}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--sidebar-text)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--destructive)]"
                                title={t('clinic.signOut')}
                            >
                                <LogOut size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
