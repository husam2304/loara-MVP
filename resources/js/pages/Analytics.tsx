import { Head, usePage } from '@inertiajs/react';
import { Phone, Brain, Timer, Star, Download, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/Button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface VolumeDay {
    day: string;
    date: string;
    total: number;
    resolved: number;
    escalated: number;
}

interface Category {
    label: string;
    value: number;
    color: string;
}

interface TopIntent {
    label: string;
    count: number;
}

interface AnalyticsProps {
    stats: {
        totalCalls: number;
        aiResolutionRate: number;
        avgHandleSeconds: number;
        patientSatisfaction: number;
    };
    volumeData: VolumeDay[];
    aiMetrics: {
        intentRecognition: number;
        sentimentAnalysis: number;
        responseQuality: number;
    };
    categories: Category[];
    topIntents: TopIntent[];
}

function formatDuration(seconds: number): string {
    if (seconds <= 0) return '0s';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (min === 0) return `${sec}s`;
    return `${min}m ${sec.toString().padStart(2, '0')}s`;
}

export default function Analytics({ stats, volumeData, aiMetrics, categories, topIntents }: AnalyticsProps) {
    const { t } = useTranslation('analytics');
    const appName = (usePage().props as { appName?: string }).appName ?? 'Loara';
    const [hoveredDay, setHoveredDay] = useState<number | null>(null);
    const maxVolume = Math.max(...volumeData.map(d => d.total), 1);

    const handleExport = () => {
        const rows: string[][] = [
            [`${appName} — Analytics Report`],
            [],
            ['SUMMARY (This Month)'],
            ['Total Calls', stats.totalCalls.toString()],
            ['AI Resolution Rate', `${stats.aiResolutionRate}%`],
            ['Avg Handle Time (seconds)', stats.avgHandleSeconds.toString()],
            ['Patient Satisfaction', `${stats.patientSatisfaction}/5`],
            [],
            ['CALL VOLUME TRENDS (Last 7 Days)'],
            ['Day', 'Date', 'Total', 'AI Resolved', 'Escalated'],
            ...volumeData.map(d => [d.day, d.date, d.total.toString(), d.resolved.toString(), d.escalated.toString()]),
            [],
            ['AI PERFORMANCE'],
            ['Metric', 'Value'],
            ['Intent Recognition', `${aiMetrics.intentRecognition}%`],
            ['Sentiment Analysis', `${aiMetrics.sentimentAnalysis}%`],
            ['Response Quality', `${aiMetrics.responseQuality}%`],
            [],
            ['CALL CATEGORIES'],
            ['Category', 'Percentage'],
            ...categories.map(c => [c.label, `${c.value}%`]),
            [],
            ['TOP INTENTS'],
            ['Intent', 'Count'],
            ...topIntents.map(i => [i.label, i.count.toString()]),
        ];

        const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const aiMetricsList = [
        { label: t('aiPerformance.intentRecognition'), value: `${aiMetrics.intentRecognition}%`, percentage: aiMetrics.intentRecognition, barColor: '#22D3EE' },
        { label: t('aiPerformance.sentimentAnalysis'), value: `${aiMetrics.sentimentAnalysis}%`, percentage: aiMetrics.sentimentAnalysis, barColor: '#6366F1' },
        { label: t('aiPerformance.responseQuality'), value: `${aiMetrics.responseQuality}%`, percentage: aiMetrics.responseQuality, barColor: '#22C55E' },
    ];

    return (
        <>
            <Head title={t('title')} />
            <DashboardLayout title={t('headerTitle')} subtitle={t('subtitle')}>
                <div className="flex flex-col gap-6">
                    {/* Header action */}
                    <div className="flex justify-end">
                        <Button variant="secondary" icon={Download} onClick={handleExport}>
                            Export Report
                        </Button>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label={t('stats.totalCalls')} value={stats.totalCalls.toLocaleString()} change="" period={t('stats.thisMonth')} icon={Phone} iconColor="#22D3EE" iconBgColor="#22D3EE15" />
                        <StatCard label={t('stats.aiResolution')} value={`${stats.aiResolutionRate}%`} change="" period={t('stats.thisMonth')} icon={Brain} iconColor="#22C55E" iconBgColor="#22C55E15" />
                        <StatCard label={t('stats.avgHandleTime')} value={formatDuration(stats.avgHandleSeconds)} change="" changeColor="text-[var(--primary)]" period={t('stats.thisMonth')} icon={Timer} iconColor="#8B5CF6" iconBgColor="#8B5CF615" />
                        <StatCard label={t('stats.patientSatisfaction')} value={`${stats.patientSatisfaction}/5`} change="" period={t('stats.thisMonth')} icon={Star} iconColor="#F59E0B" iconBgColor="#F59E0B15" />
                    </div>

                    {/* Call Volume Trends */}
                    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-col gap-0.5">
                                <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">

                                    {t('volumeTrends.title')}
                                </h3>
                                <p className="font-mono text-xs text-[var(--muted-foreground)]">
                                    {t('volumeTrends.subtitle')}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-sm bg-[#22D3EE]" />
                                    <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('volumeTrends.totalCalls')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-sm bg-[#3B82F6]" />
                                    <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('volumeTrends.aiResolved')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-sm bg-[#F97316]" />
                                    <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('volumeTrends.escalated')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative flex flex-1 items-end gap-3" style={{ minHeight: '260px' }}>
                            {volumeData.map((data, i) => (
                                <div
                                    key={data.date}
                                    className="relative flex flex-1 flex-col items-center gap-1"
                                    onMouseEnter={() => setHoveredDay(i)}
                                    onMouseLeave={() => setHoveredDay(null)}
                                >
                                    {/* Tooltip */}
                                    {hoveredDay === i && (
                                        <div className="absolute -top-10 z-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 shadow-lg">
                                            <span className="font-mono text-[11px] font-semibold text-[var(--foreground)]">
                                                {t('volumeTrends.callsTooltip').replace('{{count}}', data.total.toLocaleString())}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex w-full items-end justify-center gap-1" style={{ height: '220px' }}>
                                        <div
                                            className="w-full max-w-[24px] rounded-t-sm bg-[#22D3EE] transition-all"
                                            style={{ height: `${(data.total / maxVolume) * 100}%` }}
                                        />
                                        <div
                                            className="w-full max-w-[24px] rounded-t-sm bg-[#3B82F6] transition-all"
                                            style={{ height: `${(data.resolved / maxVolume) * 100}%` }}
                                        />
                                        <div
                                            className="w-full max-w-[24px] rounded-t-sm bg-[#F97316] transition-all"
                                            style={{ height: `${(data.escalated / maxVolume) * 100}%` }}
                                        />
                                    </div>
                                    <span
                                        className={`mt-3 font-mono text-[10px] font-medium ${hoveredDay === i
                                            ? 'text-[var(--foreground)]'
                                            : 'text-[var(--muted-foreground)]'
                                            }`}
                                    >
                                        {data.day}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom 3 Columns */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* AI Performance */}
                        <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                            <div className="border-b border-[var(--border)] px-5 py-4">
                                <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                                    {t('aiPerformance.title')}
                                </h3>
                            </div>
                            <div className="flex flex-col gap-4 p-5">
                                {aiMetricsList.map((metric, i) => (
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

                        {/* Call Categories */}
                        <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                            <div className="border-b border-[var(--border)] px-5 py-4">
                                <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                                    {t('categories.title')}
                                </h3>
                            </div>
                            <div className="flex flex-col gap-3.5 p-5">
                                {categories.length > 0 ? categories.map((cat, i) => (
                                    <div key={i} className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="font-primary text-xs font-medium text-[var(--muted-foreground)]">
                                                {cat.label}
                                            </span>
                                            <span className="font-mono text-xs font-semibold text-[var(--foreground)]">
                                                {cat.value}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${cat.value}%`,
                                                    backgroundColor: cat.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )) : (
                                    <p className="font-primary text-[13px] text-[var(--muted-foreground)]">{t('categories.empty')}</p>
                                )}
                            </div>
                        </div>

                        {/* Top Intents Detected */}
                        <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                            <div className="border-b border-[var(--border)] px-5 py-4">
                                <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                                    {t('topIntents.title')}
                                </h3>
                            </div>
                            <div className="flex flex-col">
                                {topIntents.length > 0 ? topIntents.map((intent, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-between px-5 py-3 ${i < topIntents.length - 1 ? 'border-b border-[var(--border)]' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <TrendingUp size={14} className="text-[var(--muted-foreground)]" />
                                            <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                                {intent.label}
                                            </span>
                                        </div>
                                        <span className="font-mono text-[13px] font-semibold text-[var(--foreground)]">
                                            {intent.count.toLocaleString()}
                                        </span>
                                    </div>
                                )) : (
                                    <div className="px-5 py-8 text-center">
                                        <p className="font-primary text-[13px] text-[var(--muted-foreground)]">{t('topIntents.empty')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
}
