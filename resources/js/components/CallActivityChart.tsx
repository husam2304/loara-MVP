import { useTranslation } from 'react-i18next';
interface CallActivityDay {
    day: string;
    date: string;
    inbound: number;
    outbound: number;
}

interface CallActivityChartProps {
    data: CallActivityDay[];
}

export function CallActivityChart({ data }: CallActivityChartProps) {
    const { t } = useTranslation('dashboard');
    const maxValue = Math.max(...data.flatMap(d => [d.inbound, d.outbound]), 1);
    const todayIndex = data.length - 1;

    return (
        <div className="flex flex-1 flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                    <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                        {t('callActivity.title')}
                    </h3>
                    <p className="font-mono text-xs text-[var(--muted-foreground)]">
                        {t('callActivity.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-sm bg-[var(--primary)]" />
                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                            {t('callActivity.inbound')}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-sm bg-[#6366F1]" />
                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                            {t('callActivity.outbound')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="flex flex-1 items-end gap-3">
                {data.map((entry, i) => (
                    <div key={entry.date} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex w-full items-end justify-center gap-1" style={{ height: '200px' }}>
                            <div
                                className="w-full max-w-[28px] rounded-t-sm bg-[var(--primary)] transition-all"
                                style={{ height: `${(entry.inbound / maxValue) * 100}%` }}
                            />
                            <div
                                className="w-full max-w-[28px] rounded-t-sm bg-[#6366F1] transition-all"
                                style={{ height: `${(entry.outbound / maxValue) * 100}%` }}
                            />
                        </div>
                        <span
                            className={`mt-3 font-mono text-[10px] font-medium ${
                                i === todayIndex
                                    ? 'text-[var(--foreground)]'
                                    : 'text-[var(--muted-foreground)]'
                            }`}
                        >
                            {entry.day}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
