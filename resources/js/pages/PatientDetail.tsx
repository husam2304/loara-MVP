import { Head, Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
    Edit,
    CalendarPlus,
    Stethoscope,
    Phone,
    FlaskConical,
    Pill,
    Heart,
    Thermometer,
    Weight,
    Activity,
    Shield,
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { EditPatientModal } from '@/components/EditPatientModal';
import { ScheduleAppointmentModal } from '@/components/ScheduleAppointmentModal';
import type { Patient, PatientAllergy, PatientMedication, PatientInsurance, Appointment, Provider, AppointmentType, SharedProps } from '@/types';

type TabId = 'all' | 'medical' | 'calls';

interface TimelineEntry {
    id: number | string;
    date: string;
    date_formatted: string;
    date_long: string;
    type: 'visit' | 'ai-call' | 'lab';
    title: string;
    subtitle: string;
}

interface VitalsData {
    heart_rate: number | null;
    blood_pressure_systolic: number | null;
    blood_pressure_diastolic: number | null;
    temperature: number | null;
    weight: number | null;
    oxygen_saturation: number | null;
}

interface PatientDetailProps {
    patient: Patient;
    timeline: TimelineEntry[];

    upcomingAppointments: Appointment[];

    medications: PatientMedication[];

    vitals: VitalsData | null;
    allergies: PatientAllergy[];

    insurance: PatientInsurance | null;
    providers: Pick<Provider, 'id' | 'first_name' | 'last_name' | 'title' | 'specialty'>[];

    appointmentTypes: Pick<AppointmentType, 'id' | 'name' | 'duration_minutes'>[];

}

const getTabs = (t: any): { id: TabId; label: string }[] => [
    { id: 'all', label: t('tabs.all') },
    { id: 'medical', label: t('tabs.medical') },
    { id: 'calls', label: t('tabs.calls') },
];


function getTimelineColor(type: string): string {
    switch (type) {
        case 'visit': return '#22C55E';
        case 'ai-call': return '#22D3EE';
        case 'lab': return '#8B5CF6';
        default: return '#22D3EE';
    }
}

function TimelineIcon({ type }: { type: string }) {
    switch (type) {
        case 'visit':
            return <Stethoscope size={14} />;
        case 'ai-call':
            return <Phone size={14} />;
        case 'lab':
            return <FlaskConical size={14} />;
        default:
            return <Phone size={14} />;
    }
}

function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatShortDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PatientDetail({ patient, timeline, upcomingAppointments, medications, vitals, allergies, insurance, providers, appointmentTypes }: PatientDetailProps) {
    const [activeTab, setActiveTab] = useState<TabId>('all');
    const [editOpen, setEditOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const { t } = useTranslation('patientDetail');
    const { props } = usePage<SharedProps>();

    const filteredTimeline = timeline.filter((entry) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'medical') return entry.type === 'visit';
        if (activeTab === 'calls') return entry.type === 'ai-call';
        return true;
    });

    const headerActions = (
        <div className="flex items-center gap-2">
            <Link href="/patients">
                <Button variant="secondary" icon={ArrowLeft}>
                    Back
                </Button>
            </Link>
            <Button variant="secondary" icon={Edit} onClick={() => setEditOpen(true)}>
                Edit
            </Button>
            <Button variant="primary" icon={CalendarPlus} onClick={() => setScheduleOpen(true)}>
                Schedule
            </Button>
        </div>
    );

    const avatarBg = patient.avatar_color ? `${patient.avatar_color}20` : '#22C55E20';
    const avatarColor = patient.avatar_color || 'var(--success)';

    return (
        <>
            <Head title={`${patient.first_name} ${patient.last_name}`} />
            <DashboardLayout
                title={`PATIENTS / ${patient.first_name.toUpperCase()}_${patient.last_name.toUpperCase()}`}
                subtitle=""
                actions={headerActions}
            >
                {/* Flash Messages */}
                {props.flash?.success && (
                    <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-green-500/20 bg-green-500/10 px-3 py-2">
                        <CheckCircle2 size={14} className="shrink-0 text-green-400" />
                        <p className="font-primary text-[12px] text-green-400">{props.flash.success}</p>
                    </div>
                )}

                <div className="flex flex-col gap-6">
                    {/* Patient Header */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                            <div
                                className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full"
                                style={{ backgroundColor: avatarBg }}
                            >
                                <span className="font-primary text-2xl font-bold" style={{ color: avatarColor }}>
                                    {getInitials(patient.first_name, patient.last_name)}
                                </span>
                            </div>
                            <div className="flex flex-1 flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <h2 className="font-primary text-xl font-bold text-[var(--foreground)]">
                                        {patient.first_name} {patient.last_name}
                                    </h2>
                                    <Badge variant={patient.status === 'active' ? 'success' : 'error'}>
                                        {patient.status === 'active' ? t('status.active') : patient.status === 'inactive' ? t('status.inactive') : t('status.deceased')}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-mono text-[10px] font-medium text-[var(--muted-foreground)]">
                                            DATE OF BIRTH
                                        </span>
                                        <span className="font-primary text-[13px] text-[var(--foreground)]">
                                            {formatDate(patient.date_of_birth)} ({calculateAge(patient.date_of_birth)})
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-mono text-[10px] font-medium text-[var(--muted-foreground)]">
                                            PHONE
                                        </span>
                                        <span className="font-primary text-[13px] text-[var(--foreground)]">
                                            {patient.phone}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-mono text-[10px] font-medium text-[var(--muted-foreground)]">
                                            EMAIL
                                        </span>
                                        <span className="font-primary text-[13px] text-[var(--foreground)]">
                                            {patient.email || '—'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-mono text-[10px] font-medium text-[var(--muted-foreground)]">
                                            ADDRESS
                                        </span>
                                        <span className="font-primary text-[13px] text-[var(--foreground)]">
                                            {[patient.address, patient.city, patient.state].filter(Boolean).join(', ') || '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tab Bar */}
                    <div className="flex items-center gap-1 self-start rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] p-0.5">
                        {getTabs(t).map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`rounded-[var(--radius-sm)] px-4 py-1.5 font-primary text-[12px] font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-[var(--accent)] text-[var(--foreground)]'
                                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Main Content */}
                    <div className="flex flex-col gap-6 lg:flex-row">
                        {/* Left: Medical Timeline */}
                        <div className="flex-1">
                            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                                <div className="border-b border-[var(--border)] px-5 py-4">
                                    <h3 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                                        MEDICAL_TIMELINE
                                    </h3>
                                </div>
                                <div className="p-5">
                                    {filteredTimeline.length > 0 ? (
                                        <div className="relative">
                                            <div className="absolute start-[15px] top-2 bottom-2 w-px bg-[var(--border)]" />
                                            <div className="flex flex-col gap-6">
                                                {filteredTimeline.map((entry) => {
                                                    const color = getTimelineColor(entry.type);
                                                    return (
                                                        <div key={entry.id} className="relative flex gap-4 ps-0">
                                                            <div
                                                                className="relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
                                                                style={{ backgroundColor: `${color}20` }}
                                                            >
                                                                <div style={{ color }}>
                                                                    <TimelineIcon type={entry.type} />
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-1 flex-col gap-1 pt-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-primary text-[13px] font-semibold text-[var(--foreground)]">
                                                                        {entry.title}
                                                                    </span>
                                                                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                                                                        {entry.date_formatted}
                                                                    </span>
                                                                </div>
                                                                <span className="font-primary text-[12px] text-[var(--muted-foreground)]">
                                                                    {entry.subtitle}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="py-8 text-center font-primary text-[13px] text-[var(--muted-foreground)]">
                                            No timeline entries found
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="flex w-full flex-col gap-5 lg:w-[340px]">
                            {/* Upcoming Appointments */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                                <div className="border-b border-[var(--border)] px-5 py-4">
                                    <h3 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                                        UPCOMING_APPOINTMENTS
                                    </h3>
                                </div>
                                <div className="flex flex-col divide-y divide-[var(--border)]">
                                    {upcomingAppointments.length > 0 ? upcomingAppointments.map((appt) => (
                                        <div key={appt.id} className="flex items-center gap-3 px-5 py-3.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[#22D3EE15]">
                                                <CalendarPlus size={16} className="text-[var(--primary)]" />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                                    {appt.appointment_type?.name || t('appointments.defaultName')}
                                                </span>
                                                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                                                    {formatShortDate(appt.scheduled_at)} {t('appointments.at')} {formatTime(appt.scheduled_at)}
                                                    {appt.provider ? ` — ${appt.provider.full_name}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="px-5 py-6 text-center font-primary text-[12px] text-[var(--muted-foreground)]">
                                            No upcoming appointments
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Current Medications */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                                <div className="border-b border-[var(--border)] px-5 py-4">
                                    <h3 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                                        CURRENT_MEDICATIONS
                                    </h3>
                                </div>
                                <div className="flex flex-col divide-y divide-[var(--border)]">
                                    {medications.length > 0 ? medications.map((med) => (
                                        <div key={med.id} className="flex items-center gap-3 px-5 py-3.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[#8B5CF615]">
                                                <Pill size={16} className="text-[#8B5CF6]" />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                                    {med.medication_name}
                                                </span>
                                                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                                                    {med.dosage}, {med.frequency}
                                                    {med.refill_date ? ` — ${t('medications.refill')} ${formatShortDate(med.refill_date)}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="px-5 py-6 text-center font-primary text-[12px] text-[var(--muted-foreground)]">
                                            No active medications
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Vitals Summary */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                                <div className="border-b border-[var(--border)] px-5 py-4">
                                    <h3 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                                        VITALS_SUMMARY
                                    </h3>
                                </div>
                                {vitals ? (
                                    <div className="grid grid-cols-2 gap-0">
                                        {[
                                            { label: t('vitals.bloodPressure'), value: vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic}` : '—', unit: 'mmHg', icon: Heart, color: '#EF4444' },
                                            { label: t('vitals.heartRate'), value: vitals.heart_rate ?? '—', unit: 'bpm', icon: Activity, color: '#22C55E' },
                                            { label: t('vitals.temperature'), value: vitals.temperature ?? '—', unit: '\u00B0F', icon: Thermometer, color: '#F59E0B' },
                                            { label: t('vitals.weight'), value: vitals.weight ?? '—', unit: 'Lb', icon: Weight, color: '#8B5CF6' },
                                        ].map((vital, index) => {
                                            const Icon = vital.icon;
                                            return (
                                                <div
                                                    key={vital.label}
                                                    className={`flex flex-col items-center gap-1.5 p-4 ${index < 2 ? 'border-b border-[var(--border)]' : ''
                                                        } ${index % 2 === 0 ? 'border-e border-[var(--border)]' : ''}`}
                                                >
                                                    <Icon size={16} style={{ color: vital.color }} />
                                                    <span className="font-mono text-[18px] font-bold text-[var(--foreground)]">
                                                        {vital.value}
                                                    </span>
                                                    <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                                                        {vital.unit}
                                                    </span>
                                                    <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                                        {vital.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="px-5 py-6 text-center font-primary text-[12px] text-[var(--muted-foreground)]">
                                        No vitals recorded
                                    </p>
                                )}
                            </div>

                            {/* Allergies & Alerts */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                                <div className="border-b border-[var(--border)] px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-[var(--warning)]" />
                                        <h3 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                                            ALLERGIES_&_ALERTS
                                        </h3>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 p-5">
                                    {allergies.length > 0 ? allergies.map((allergy) => (
                                        <span
                                            key={allergy.id}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-[#EF44441A] px-3 py-1.5"
                                        >
                                            <AlertTriangle size={12} className="text-[var(--destructive)]" />
                                            <span className="font-primary text-[12px] font-medium text-[var(--destructive)]">
                                                {allergy.allergen}
                                                {allergy.severity === 'severe' ? ` ${t('allergies.severe')}` : ''}
                                            </span>
                                        </span>
                                    )) : (
                                        <p className="font-primary text-[12px] text-[var(--muted-foreground)]">
                                            No known allergies
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>

            <EditPatientModal open={editOpen} onClose={() => setEditOpen(false)} patient={patient} />
            <ScheduleAppointmentModal
                open={scheduleOpen}
                onClose={() => setScheduleOpen(false)}
                patient={patient}
                providers={providers}
                appointmentTypes={appointmentTypes}
            />
        </>
    );
}
