import { usePage, Link, router } from '@inertiajs/react';
import { AlertTriangle, Eye } from 'lucide-react';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FlashMessage } from './FlashMessage';
import type { SharedProps } from '@/types';

interface DashboardLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
    actions?: React.ReactNode;
}

export function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
    const { flash, impersonating, auth, clinic } = usePage<SharedProps>().props;

    useEffect(() => {
        const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) return;
        if (clinic?.favicon_url) {
            const ts = clinic.updated_at ? new Date(clinic.updated_at).getTime() : 0;
            link.href = `/storage/${clinic.favicon_url}?v=${ts}`;
        } else {
            link.href = '/favicon.ico';
        }
    }, [clinic?.favicon_url, clinic?.updated_at]);

    return (
        <div className="flex h-full bg-[var(--background)]">
            <FlashMessage />
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header title={title} subtitle={subtitle} actions={actions} />
                {impersonating && (
                    <div className="mx-7 mt-4 flex items-center gap-3 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-3">
                        <Eye size={16} className="shrink-0 text-[var(--primary)]" />
                        <p className="flex-1 text-sm text-[var(--primary)]">
                            Viewing as <strong>{auth.user?.name}</strong> — signed in as{' '}
                            <span className="font-medium">{impersonating.admin_name}</span>
                        </p>
                        <button
                            onClick={() => router.post('/admin/impersonate/stop')}
                            className="shrink-0 rounded-md bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80"
                        >
                            Stop Impersonating
                        </button>
                    </div>
                )}
                {flash.billing_warning && (
                    <div className="mx-7 mt-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                        <AlertTriangle size={16} className="shrink-0 text-amber-400" />
                        <p className="flex-1 text-sm text-amber-200">{flash.billing_warning}</p>
                        <Link href="/billing" className="shrink-0 text-[12px] font-medium text-amber-400 hover:underline">
                            Update Payment
                        </Link>
                    </div>
                )}
                <main className="flex-1 overflow-y-auto p-7">
                    {children}
                </main>
            </div>
        </div>
    );
}
