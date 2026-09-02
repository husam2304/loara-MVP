interface UsageProgressProps {
    label: string;
    used: number;
    limit: number;
    percentage: number;
    unit?: string;
}

export function UsageProgress({ label, used, limit, percentage, unit = 'min' }: UsageProgressProps) {
    const isUnlimited = limit === -1;
    const clampedPercentage = Math.min(percentage, 100);

    const barColor =
        percentage >= 90
            ? 'bg-[var(--destructive)]'
            : percentage >= 75
              ? 'bg-[var(--warning)]'
              : 'bg-[var(--primary)]';

    const textColor =
        percentage >= 90
            ? 'text-[var(--destructive)]'
            : percentage >= 75
              ? 'text-[var(--warning)]'
              : 'text-[var(--primary)]';

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[var(--foreground)]">{label}</span>
                <span className={`font-mono text-[12px] font-semibold ${textColor}`}>
                    {isUnlimited ? (
                        <>
                            {Math.round(used)} {unit} used (unlimited)
                        </>
                    ) : (
                        <>
                            {Math.round(used)} / {limit} {unit}
                        </>
                    )}
                </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: isUnlimited ? '0%' : `${clampedPercentage}%` }}
                />
            </div>
            {!isUnlimited && (
                <span className="text-[11px] text-[var(--muted-foreground)]">
                    {percentage >= 100
                        ? 'Limit reached — outbound calls are paused'
                        : percentage >= 90
                          ? 'Approaching limit — consider upgrading'
                          : `${Math.round(100 - percentage)}% remaining`}
                </span>
            )}
        </div>
    );
}
