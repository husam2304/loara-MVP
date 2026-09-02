import { useTranslation } from 'react-i18next';
interface AiPerformanceData {
    intentRecognition: number;
    callCompletion: number;
    patientSatisfaction: number;
}

interface AIPerformanceProps {
    data: AiPerformanceData;
}

export function AIPerformance({ data }: AIPerformanceProps) {
    const { t } = useTranslation('dashboard');
    const metrics = [
        {
            label: t('aiPerformance.metrics.intentRecognition'),
            value: `${data.intentRecognition}%`,
            percentage: data.intentRecognition,
            barColor: '#22D3EE',
        },
        {
            label: t('aiPerformance.metrics.callCompletion'),
            value: `${data.callCompletion}%`,
            percentage: data.callCompletion,
            barColor: '#6366F1',
        },
        {
            label: t('aiPerformance.metrics.patientSatisfaction'),
            value: `${data.patientSatisfaction} / 5.0`,
            percentage: (data.patientSatisfaction / 5) * 100,
            barColor: '#22C55E',
        },
    ];

    return (
        <div className="flex flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            {/* Header */}
            <div className="border-b border-[var(--border)] px-5 py-4">
                <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                    AI_PERFORMANCE
                </h3>
            </div>

            {/* Metrics */}
            <div className="flex flex-col gap-4 p-5">
                {metrics.map((metric, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <span className="font-primary text-xs font-medium text-[var(--muted-foreground)]">
                                {metric.label}
                            </span>
                            <span className="font-mono text-xs font-semibold text-[var(--foreground)]">
                                {metric.value}
                            </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${Math.min(metric.percentage, 100)}%`,
                                    backgroundColor: metric.barColor,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
