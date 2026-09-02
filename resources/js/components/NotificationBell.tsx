import { useState, useRef, useEffect } from 'react';
import { Bell, PhoneMissed, CalendarX, CalendarClock, Inbox } from 'lucide-react';
import { usePage, router } from '@inertiajs/react';
import type { SharedProps, HeaderNotification } from '@/types';

const NOTIFICATION_ICONS = {
    missed_call: PhoneMissed,
    cancelled_appointment: CalendarX,
    upcoming_appointment: CalendarClock,
} as const;

const NOTIFICATION_COLORS = {
    missed_call: 'text-red-400',
    cancelled_appointment: 'text-amber-400',
    upcoming_appointment: 'text-blue-400',
} as const;

function timeAgo(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
    const { props } = usePage<SharedProps>();
    const notifications: HeaderNotification[] = props.notifications ?? [];
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleItemClick(notification: HeaderNotification) {
        setIsOpen(false);
        router.visit(notification.url);
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex h-[34px] w-[34px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] transition-colors hover:bg-[var(--accent)]"
            >
                <Bell size={16} className="text-[var(--muted-foreground)]" />
                {notifications.length > 0 && (
                    <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-bold text-white">
                        {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute end-0 top-full z-50 mt-1.5 w-[340px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-lg">
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                        <span className="font-mono text-[11px] font-semibold text-[var(--foreground)]">
                            NOTIFICATIONS
                        </span>
                        {notifications.length > 0 && (
                            <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
                                {notifications.length}
                            </span>
                        )}
                    </div>

                    <div className="max-h-[320px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 px-4 py-8">
                                <Inbox size={24} className="text-[var(--muted-foreground)]" />
                                <span className="font-primary text-[13px] text-[var(--muted-foreground)]">
                                    All clear — no new notifications
                                </span>
                            </div>
                        ) : (
                            <div className="p-1.5">
                                {notifications.map((notification) => {
                                    const Icon = NOTIFICATION_ICONS[notification.type];
                                    const iconColor = NOTIFICATION_COLORS[notification.type];

                                    return (
                                        <button
                                            key={notification.id}
                                            onClick={() => handleItemClick(notification)}
                                            className="flex w-full items-start gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2.5 text-start transition-colors hover:bg-[var(--secondary)]"
                                        >
                                            <span className={`mt-0.5 shrink-0 ${iconColor}`}>
                                                <Icon size={15} />
                                            </span>
                                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                <span className="font-primary text-[13px] leading-snug text-[var(--foreground)]">
                                                    {notification.title}
                                                </span>
                                                <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                                                    {timeAgo(notification.time)}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
