import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string;
    change: string;
    changeColor?: string;
    period: string;
    icon: LucideIcon;
    iconColor: string;
    iconBgColor: string;
}

export function StatCard({
    label,
    value,
    change,
    changeColor = 'text-[var(--success)]',
    period,
    icon: Icon,
    iconColor,
    iconBgColor,
}: StatCardProps) {
    return (
        <div className="flex flex-1 flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                    {label}
                </span>
                <div
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]"
                    style={{ backgroundColor: iconBgColor }}
                >
                    <Icon size={18} style={{ color: iconColor }} />
                </div>
            </div>
            <span className="font-mono text-[28px] font-bold text-[var(--foreground)]">
                {value}
            </span>
            <div className="flex items-center gap-1.5">
                <span className={`font-mono text-[11px] font-medium ${changeColor}`}>
                    {change}
                </span>
                <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                    {period}
                </span>
            </div>
        </div>
    );
}
