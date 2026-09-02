import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Phone, Calendar, Timer, CircleCheck } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { CallActivityChart } from '@/components/CallActivityChart';
import { RecentCalls } from '@/components/RecentCalls';
import { UpcomingAppointments } from '@/components/UpcomingAppointments';
import { QuickActions } from '@/components/QuickActions';
import { AIPerformance } from '@/components/AIPerformance';
import type { Call, Appointment } from '@/types';

interface CallActivityDay {
    day: string;
    date: string;
    inbound: number;
    outbound: number;
}

interface AiPerformanceData {
    intentRecognition: number;
    callCompletion: number;
    patientSatisfaction: number;
}

interface DashboardProps {
    stats: {
        callsToday: number;
        appointmentsToday: number;
        avgResponseTime: number;
        resolutionRate: number;
    };
    callActivity: CallActivityDay[];
    recentCalls: Call[];
    upcomingAppointments: Appointment[];
    aiPerformance: AiPerformanceData;
}

function formatDuration(seconds: number): string {
    if (seconds <= 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const min = Math.round(seconds / 60 * 10) / 10;
    return `${min}m`;
}

export default function Dashboard({ stats, callActivity, recentCalls, upcomingAppointments, aiPerformance }: DashboardProps) {
    const { t } = useTranslation('dashboard');
    return (
        <>
            <Head title={t('title')} />
            <DashboardLayout title={t('headerTitle')} subtitle={t('subtitle')}>
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label={t('stats.callsToday')} value={stats.callsToday.toString()} change="" period={t('stats.today')} icon={Phone} iconColor="#22D3EE" iconBgColor="#22D3EE15" />
                        <StatCard label={t('stats.appointmentsToday')} value={stats.appointmentsToday.toString()} change="" period={t('stats.today')} icon={Calendar} iconColor="#22C55E" iconBgColor="#22C55E15" />
                        <StatCard label={t('stats.avgResponseTime')} value={formatDuration(stats.avgResponseTime)} change="" changeColor="text-[var(--primary)]" period={t('stats.today')} icon={Timer} iconColor="#8B5CF6" iconBgColor="#8B5CF615" />
                        <StatCard label={t('stats.resolutionRate')} value={`${stats.resolutionRate}%`} change="" period={t('stats.today')} icon={CircleCheck} iconColor="#F59E0B" iconBgColor="#F59E0B15" />
                    </div>
                    <div className="flex flex-col gap-4 lg:flex-row" style={{ minHeight: '340px' }}>
                        <CallActivityChart data={callActivity} />
                        <RecentCalls calls={recentCalls} />
                    </div>
                    <div className="flex flex-col gap-4 lg:flex-row" style={{ minHeight: '420px' }}>
                        <UpcomingAppointments appointments={upcomingAppointments} />
                        <div className="flex w-full flex-col gap-4 lg:w-[340px]">
                            <QuickActions />
                            <AIPerformance data={aiPerformance} />
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
}
