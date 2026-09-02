import { useState } from 'react';
import { Phone } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';
import { NewCallModal } from './NewCallModal';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export function Header({ title = 'DASHBOARD', subtitle, actions }: HeaderProps) {
    const { props } = usePage<SharedProps>();
    const userName = props.auth.user?.name ?? 'there';
    const [callModalOpen, setCallModalOpen] = useState(false);
    const { t } = useTranslation('header');
    const displaySubtitle = subtitle ?? t('subtitleBeforeName') + userName + t('subtitleAfterName');

    return (
        <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-[var(--border)] px-7">
            <div className="flex flex-col gap-0.5">
                <h1 className="font-mono text-lg font-semibold text-[var(--foreground)]">
                    {title}
                </h1>
                <p className="hidden font-mono text-[13px] text-[var(--muted-foreground)] sm:block">
                    {displaySubtitle}
                </p>
            </div>

            <div className="flex items-center gap-2.5">
                <LanguageSwitcher />
                <GlobalSearch />

                <NotificationBell />

                {actions || (
                    <button
                        onClick={() => setCallModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] px-3.5 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80"
                    >
                        <Phone size={14} />
                        {t('newCall')}
                    </button>
                )}
            </div>

            <NewCallModal open={callModalOpen} onClose={() => setCallModalOpen(false)} />
        </header>
    );
}
