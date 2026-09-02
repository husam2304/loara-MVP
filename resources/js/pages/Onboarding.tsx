import { Head, usePage } from '@inertiajs/react';
import {
    Headphones,
    Building2,
    Mic,
    AlertTriangle,
    Plug,
    Lock,
    ArrowRight,
    Check,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/Button';

interface SetupStep {
    id: number;
    title: string;
    description: string;
    icon: React.ElementType;
    status: 'current' | 'pending' | 'completed';
    iconColor: string;
    iconBgColor: string;
}

const setupSteps: SetupStep[] = [
    {
        id: 1,
        title: 'Clinic Information',
        description: 'Add your clinic name, address, operating hours, and contact details',
        icon: Building2,
        status: 'current',
        iconColor: '#22D3EE',
        iconBgColor: '#22D3EE15',
    },
    {
        id: 2,
        title: 'AI Voice Settings',
        description: 'Configure how the AI assistant handles calls, tone, and language preferences',
        icon: Mic,
        status: 'pending',
        iconColor: '#8B5CF6',
        iconBgColor: '#8B5CF615',
    },
    {
        id: 3,
        title: 'Triage Rules',
        description: 'Set up urgency levels, escalation triggers, and routing protocols',
        icon: AlertTriangle,
        status: 'pending',
        iconColor: '#F59E0B',
        iconBgColor: '#F59E0B15',
    },
    {
        id: 4,
        title: 'Integrations',
        description: 'Connect your EHR, scheduling system, and pharmacy for seamless workflow',
        icon: Plug,
        status: 'pending',
        iconColor: '#22C55E',
        iconBgColor: '#22C55E15',
    },
];

function StepCard({ step }: { step: SetupStep }) {
    const Icon = step.icon;
    const isCurrent = step.status === 'current';
    const isCompleted = step.status === 'completed';

    return (
        <div
            className={`flex flex-col rounded-[var(--radius-lg)] border p-5 transition-colors ${isCurrent
                    ? 'border-[var(--primary)] bg-[var(--card)]'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
        >
            <div className="flex items-start justify-between">
                <div
                    className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
                    style={{ backgroundColor: step.iconBgColor }}
                >
                    <Icon size={20} style={{ color: step.iconColor }} />
                </div>
                {isCurrent && (
                    <span className="inline-flex items-center rounded-full bg-[#22D3EE1A] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--primary)]">
                        CURRENT STEP
                    </span>
                )}
                {isCompleted && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success)]">
                        <Check size={14} className="text-white" />
                    </div>
                )}
                {step.status === 'pending' && (
                    <Lock size={14} className="text-[var(--muted-foreground)]" />
                )}
            </div>

            <h3 className="mt-4 font-primary text-[14px] font-semibold text-[var(--foreground)]">
                {step.title}
            </h3>
            <p className="mt-1 font-primary text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                {step.description}
            </p>

            {isCurrent && (
                <div className="mt-4">
                    <Button variant="primary" icon={ArrowRight}>
                        Start Setup
                    </Button>
                </div>
            )}
            {step.status === 'pending' && (
                <div className="mt-4">
                    <span className="font-primary text-[12px] text-[var(--muted-foreground)]">
                        Complete previous steps to unlock
                    </span>
                </div>
            )}
        </div>
    );
}

export default function Onboarding() {
    const appName = (usePage().props as { appName?: string }).appName ?? 'Loara';
    const currentStep = 1;
    const totalSteps = 4;
    const progressPercentage = (currentStep / totalSteps) * 100;

    return (
        <>
            <Head title="Welcome" />
            <DashboardLayout
                title="ONBOARDING"
                subtitle="Let's get your clinic set up in just a few steps"
            >
                <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 py-4">
                    {/* Header Icon */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#22D3EE15]">
                        <Headphones size={28} className="text-[var(--primary)]" />
                    </div>

                    {/* Title & Description */}
                    <div className="flex flex-col items-center gap-3 text-center">
                        <h1 className="font-primary text-2xl font-bold text-[var(--foreground)]">
                            Set Up Your AI-Powered Clinic
                        </h1>
                        <p className="max-w-md font-primary text-[14px] leading-relaxed text-[var(--muted-foreground)]">
                            Complete these steps to configure {appName} for your practice. Your AI
                            assistant will be ready to handle calls, schedule appointments, and
                            triage patients automatically.
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex w-full max-w-md flex-col items-center gap-2">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                            <div
                                className="h-full rounded-full bg-[var(--primary)] transition-all"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                            Step {currentStep} of {totalSteps} — {progressPercentage}% complete
                        </span>
                    </div>

                    {/* Setup Cards Grid */}
                    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                        {setupSteps.map((step) => (
                            <StepCard key={step.id} step={step} />
                        ))}
                    </div>

                    {/* Skip Link */}
                    <a
                        href="/dashboard"
                        className="flex items-center gap-1.5 font-primary text-[13px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    >
                        Skip setup and explore the dashboard
                        <ArrowRight size={14} />
                    </a>
                </div>
            </DashboardLayout>
        </>
    );
}
