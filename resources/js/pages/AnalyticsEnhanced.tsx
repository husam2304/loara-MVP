import { Head } from '@inertiajs/react';
import {
    Phone,
    CircleCheck,
    Timer,
    Star,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { StatCard } from '@/components/StatCard';

interface ChartDataPoint {
    month: string;
    total: number;
    aiResolved: number;
    escalated: number;
}

const chartData: ChartDataPoint[] = [
    { month: 'Sep', total: 1840, aiResolved: 1620, escalated: 220 },
    { month: 'Oct', total: 2100, aiResolved: 1870, escalated: 230 },
    { month: 'Nov', total: 1950, aiResolved: 1740, escalated: 210 },
    { month: 'Dec', total: 1680, aiResolved: 1510, escalated: 170 },
    { month: 'Jan', total: 2250, aiResolved: 2020, escalated: 230 },
    { month: 'Feb', total: 2480, aiResolved: 2230, escalated: 250 },
    { month: 'Mar', total: 2650, aiResolved: 2410, escalated: 240 },
];

interface DistributionItem {
    label: string;
    value: number;
    percentage: number;
    color: string;
}

const getDistribution = (t: any): DistributionItem[] => [
    { label: t('enhanced.distributionLabels.appointments'), value: 5524, percentage: 43, color: '#22D3EE' },
    { label: t('enhanced.distributionLabels.rxRefills'), value: 2698, percentage: 21, color: '#22C55E' },
    { label: t('enhanced.distributionLabels.labInquiries'), value: 2184, percentage: 17, color: '#8B5CF6' },
    { label: t('enhanced.distributionLabels.billing'), value: 1542, percentage: 12, color: '#F59E0B' },
    { label: t('enhanced.distributionLabels.other'), value: 899, percentage: 7, color: '#6B7280' },
];

const getMetricCards = (t: any) => [
    {
        label: t('enhanced.metrics.callVolume'),
        value: '1,284',
        change: '+12%',
        positive: true,
        icon: TrendingUp,
    },
    {
        label: t('enhanced.metrics.resolutionRate'),
        value: '94.7%',
        change: '+3.5%',
        positive: true,
        icon: TrendingUp,
    },
    {
        label: t('enhanced.metrics.avgWaitTime'),
        value: '1m 48s',
        change: '-24s',
        positive: true,
        icon: TrendingDown,
    },
];

function CallVolumeChart({ data, t }: { data: ChartDataPoint[]; t: any }) {
    const maxValue = Math.max(...data.map((d) => d.total));
    const chartHeight = 220;

    return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <h3 className="font-mono text-sm font-semibold text-[var(--foreground)]">

                    CALL_VOLUME_TRENDS
                </h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#22D3EE]" />
                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                            Total Calls
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                            AI Resolved
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                            Escalated
                        </span>
                    </div>
                </div>
            </div>
            <div className="p-5">
                <div className="flex items-end justify-between" style={{ height: chartHeight }}>
                    {data.map((point) => {
                        const totalHeight = (point.total / maxValue) * chartHeight;
                        const aiHeight = (point.aiResolved / maxValue) * chartHeight;
                        const escalatedHeight = (point.escalated / maxValue) * chartHeight;

                        return (
                            <div key={point.month} className="flex flex-col items-center gap-2">
                                <div className="flex items-end gap-1" style={{ height: chartHeight - 24 }}>
                                    <div
                                        className="w-3.5 rounded-t-sm bg-[#22D3EE]"
                                        style={{ height: `${totalHeight * 0.8}px`, opacity: 0.9 }}
                                    />
                                    <div
                                        className="w-3.5 rounded-t-sm bg-[#22C55E]"
                                        style={{ height: `${aiHeight * 0.8}px`, opacity: 0.9 }}
                                    />
                                    <div
                                        className="w-3.5 rounded-t-sm bg-[#EF4444]"
                                        style={{ height: `${escalatedHeight * 0.8}px`, opacity: 0.9 }}
                                    />
                                </div>
                                <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                                    {point.month}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function DonutChart({ items, totalCount, t }: { items: DistributionItem[]; totalCount: string; t: any }) {
    const total = items.reduce((sum, item) => sum + item.percentage, 0);
    let cumulativeAngle = -90;

    function describeArc(startAngle: number, endAngle: number, radius: number): string {
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = 80 + radius * Math.cos(startRad);
        const y1 = 80 + radius * Math.sin(startRad);
        const x2 = 80 + radius * Math.cos(endRad);
        const y2 = 80 + radius * Math.sin(endRad);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
    }

    return (
        <div className="flex flex-col items-center gap-5">
            <svg width="160" height="160" viewBox="0 0 160 160">
                {items.map((item) => {
                    const sliceAngle = (item.percentage / total) * 360;
                    const startAngle = cumulativeAngle;
                    const endAngle = cumulativeAngle + sliceAngle - 1;
                    cumulativeAngle += sliceAngle;

                    return (
                        <path
                            key={item.label}
                            d={describeArc(startAngle, endAngle, 65)}
                            fill="none"
                            stroke={item.color}
                            strokeWidth="22"
                            strokeLinecap="round"
                        />
                    );
                })}
                <text
                    x="80"
                    y="74"
                    textAnchor="middle"
                    className="font-mono"
                    fill="var(--foreground)"
                    fontSize="22"
                    fontWeight="700"
                >
                    {totalCount}
                </text>
                <text
                    x="80"
                    y="94"
                    textAnchor="middle"
                    className="font-mono"
                    fill="var(--muted-foreground)"
                    fontSize="10"
                >
                    TOTAL CALLS
                </text>
            </svg>
            <div className="flex w-full flex-col gap-2">
                {items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="font-primary text-[12px] text-[var(--muted-foreground)]">
                                {item.label}
                            </span>
                        </div>
                        <span className="font-mono text-[12px] font-medium text-[var(--foreground)]">
                            {item.percentage}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AnalyticsEnhanced() {
    const { t } = useTranslation('analytics');
    return (
        <>
            <Head title={t('title')} />
            <DashboardLayout
                title={t('headerTitle')}
                subtitle={t('subtitle')}
            >
                <div className="flex flex-col gap-6">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t('stats.totalCalls')}
                            value="12,847"
                            change="+12.5%"
                            period={t('enhanced.fromLastMonth')}
                            icon={Phone}
                            iconColor="#22D3EE"
                            iconBgColor="#22D3EE15"
                        />
                        <StatCard
                            label={t('stats.aiResolution')}
                            value="87.4%"
                            change="+3.2%"
                            period={t('enhanced.fromLastMonth')}
                            icon={CircleCheck}
                            iconColor="#22C55E"
                            iconBgColor="#22C55E15"
                        />
                        <StatCard
                            label={t('stats.avgHandleTime')}
                            value="2m 14s"
                            change="-18s"
                            changeColor="text-[var(--primary)]"
                            period={t('enhanced.improvement')}
                            icon={Timer}
                            iconColor="#8B5CF6"
                            iconBgColor="#8B5CF615"
                        />
                        <StatCard
                            label={t('stats.patientSatisfaction')}
                            value="4.8/5"
                            change="+0.3"
                            period={t('enhanced.fromLastMonth')}
                            icon={Star}
                            iconColor="#F59E0B"
                            iconBgColor="#F59E0B15"
                        />
                    </div>

                    {/* Call Volume Trends */}
                    <CallVolumeChart data={chartData} t={t} />

                    {/* Bottom Section */}
                    <div className="flex flex-col gap-6 lg:flex-row">
                        {/* Call Distribution Donut */}
                        <div className="flex-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                            <div className="border-b border-[var(--border)] px-5 py-4">
                                <h3 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                                    CALL_DISTRIBUTION
                                </h3>
                            </div>
                            <div className="flex items-center justify-center p-6">
                                <DonutChart items={getDistribution(t)} totalCount="12,847" t={t} />
                            </div>
                        </div>

                        {/* Right Metric Cards */}
                        <div className="flex w-full flex-col gap-4 lg:w-[340px]">
                            {getMetricCards(t).map((metric) => {
                                const Icon = metric.icon;

                                return (
                                    <div
                                        key={metric.label}
                                        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                                {metric.label}
                                            </span>
                                            <div
                                                className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${metric.positive
                                                        ? 'bg-[#22C55E1A] text-[var(--success)]'
                                                        : 'bg-[#EF44441A] text-[var(--destructive)]'
                                                    }`}
                                            >
                                                {metric.positive ? (
                                                    <ArrowUpRight size={12} />
                                                ) : (
                                                    <ArrowDownRight size={12} />
                                                )}
                                                <span className="font-mono text-[11px] font-medium">
                                                    {metric.change}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="mt-2 block font-mono text-[28px] font-bold text-[var(--foreground)]">
                                            {metric.value}
                                        </span>
                                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                                            <div
                                                className="h-full rounded-full bg-[var(--primary)]"
                                                style={{
                                                    width:
                                                        metric.label === t('enhanced.metrics.callVolume')
                                                            ? '72%'
                                                            : metric.label === t('enhanced.metrics.resolutionRate')
                                                                ? '95%'
                                                                : '60%',
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
}
