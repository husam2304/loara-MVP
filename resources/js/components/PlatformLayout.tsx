import { usePage } from '@inertiajs/react';
import { PlatformSidebar } from './PlatformSidebar';
import { FlashMessage } from './FlashMessage';
import type { SharedProps } from '@/types';

interface PlatformLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export function PlatformLayout({ children, title, subtitle, actions }: PlatformLayoutProps) {
    const { flash } = usePage<SharedProps>().props;

    return (
        <div className="flex h-full bg-[var(--background)]">
            <FlashMessage />
            <PlatformSidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] px-7">
                    <div>
                        <h1 className="font-mono text-[18px] font-bold uppercase tracking-wider text-[var(--foreground)]">{title}</h1>
                        {subtitle && <p className="font-mono text-[12px] text-[var(--muted-foreground)]">{subtitle}</p>}
                    </div>
                    {actions && <div className="flex items-center gap-3">{actions}</div>}
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-7">
                    {children}
                </main>
            </div>
        </div>
    );
}
