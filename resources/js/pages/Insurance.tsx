import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { usePatientSearch } from '@/hooks/usePatientSearch';
import { Shield, FileText, CheckCircle, Clock, SlidersHorizontal, Download, Search, FilePlus, X, Loader2, AlertCircle, Send, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { InsuranceClaim, PriorAuthorization, EligibilityVerification, PatientInsurance } from '@/types';

interface PatientOption {
    id: number;
    first_name: string;
    last_name: string;
    insurance_policies?: (PatientInsurance & { insurance_provider?: { id: number; name: string; payer_id: string | null } })[];
}

interface InsuranceProviderOption {
    id: number;
    name: string;
}

interface InsuranceStats {
    totalClaims: number;
    pendingClaims: number;
    approvalRate: number;
    pendingAuthorizations: number;
    avgTurnaroundDays: number;
}

interface InsuranceProps {
    claims: InsuranceClaim[];
    priorAuthorizations: PriorAuthorization[];
    patients: PatientOption[];
    insuranceProviders: InsuranceProviderOption[];
    recentVerifications: EligibilityVerification[];
    stats: InsuranceStats;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function getClaimStatusLabel(status: InsuranceClaim['status'], t: any): string {
    switch (status) {
        case 'approved': return t('claimStatuses.approved');
        case 'pending': return t('claimStatuses.pending');
        case 'in_review': return t('claimStatuses.inReview');
        case 'denied': return t('claimStatuses.denied');
        case 'submitted': return t('claimStatuses.submitted');
        case 'appealed': return t('claimStatuses.appealed');
        default: return String(status);
    }
}

function getClaimBadgeVariant(status: InsuranceClaim['status']): 'success' | 'warning' | 'error' {
    switch (status) {
        case 'approved':
            return 'success';
        case 'pending':
        case 'in_review':
        case 'submitted':
        case 'appealed':
            return 'warning';
        case 'denied':
            return 'error';
    }
}

function getAuthStatusLabel(status: PriorAuthorization['status'], t: any): string {
    switch (status) {
        case 'approved': return t('authStatuses.approved');
        case 'pending': return t('authStatuses.pending');
        case 'denied': return t('authStatuses.denied');
        case 'expired': return t('authStatuses.expired');
        default: return String(status);
    }
}

function getAuthBadgeVariant(status: PriorAuthorization['status']): 'success' | 'warning' | 'error' {
    switch (status) {
        case 'approved':
            return 'success';
        case 'pending':
        case 'expired':
            return 'warning';
        case 'denied':
            return 'error';
    }
}

function NewClaimModal({
    patients,
    insuranceProviders,
    onClose,
}: {
    patients: PatientOption[];
    insuranceProviders: InsuranceProviderOption[];
    onClose: () => void;
}) {
    const { t } = useTranslation('insurance');
    const form = useForm({
        patient_id: '',
        insurance_provider_id: '',
        claim_number: '',
        amount: '',
        notes: '',
    });

    const { query: patientSearch, setQuery: setPatientSearch, results: filteredPatients } = usePatientSearch(patients);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/insurance', {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                        {t('modals.newClaim.title')}
                    </h2>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
                    {/* Patient */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.newClaim.patient')}</label>
                        <input
                            type="text"
                            placeholder={t("modals.newClaim.searchPatient")}
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                        {patientSearch && !form.data.patient_id && (
                            <div className="max-h-32 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)]">
                                {filteredPatients.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            form.setData('patient_id', p.id.toString());
                                            setPatientSearch(`${p.first_name} ${p.last_name}`);
                                        }}
                                        className="w-full px-3 py-2 text-start font-primary text-[13px] text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                                    >
                                        {p.first_name} {p.last_name}
                                    </button>
                                ))}
                            </div>
                        )}
                        {form.data.patient_id && (
                            <button
                                type="button"
                                onClick={() => { form.setData('patient_id', ''); setPatientSearch(''); }}
                                className="self-start font-primary text-[11px] text-[var(--primary)] hover:underline"
                            >
                                Change patient
                            </button>
                        )}
                        {form.errors.patient_id && <span className="font-primary text-[11px] text-red-500">{form.errors.patient_id}</span>}
                    </div>

                    {/* Insurance Provider + Claim Number */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.newClaim.insuranceProvider')}</label>
                            <select
                                value={form.data.insurance_provider_id}
                                onChange={(e) => form.setData('insurance_provider_id', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            >
                                <option value="">{t("modals.newClaim.select")}</option>
                                {insuranceProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {form.errors.insurance_provider_id && <span className="font-primary text-[11px] text-red-500">{form.errors.insurance_provider_id}</span>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.newClaim.claimNumber')}</label>
                            <input
                                type="text"
                                value={form.data.claim_number}
                                onChange={(e) => form.setData('claim_number', e.target.value)}
                                placeholder={t("modals.newClaim.claimNumberPlaceholder")}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                            {form.errors.claim_number && <span className="font-primary text-[11px] text-red-500">{form.errors.claim_number}</span>}
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.newClaim.amount')}</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={form.data.amount}
                            onChange={(e) => form.setData('amount', e.target.value)}
                            placeholder={t("modals.newClaim.amountPlaceholder")}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                        {form.errors.amount && <span className="font-primary text-[11px] text-red-500">{form.errors.amount}</span>}
                    </div>

                    {/* Notes */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.newClaim.notes')}</label>
                        <textarea
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            placeholder={t("modals.newClaim.notesPlaceholder")}
                            rows={2}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                            {form.processing ? t('modals.newClaim.creating') : t('modals.newClaim.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function getVerificationBadgeVariant(status: EligibilityVerification['status']): 'success' | 'warning' | 'error' {
    switch (status) {
        case 'active': return 'success';
        case 'inactive': return 'warning';
        case 'error': return 'error';
        case 'unknown': return 'warning';
    }
}

function getVerificationStatusLabel(status: EligibilityVerification['status'], t: any): string {
    switch (status) {
        case 'active': return t('verificationStatuses.active');
        case 'inactive': return t('verificationStatuses.inactive');
        case 'error': return t('verificationStatuses.error');
        case 'unknown': return t('verificationStatuses.unknown');
        default: return String(status);
    }
}

function ClaimActions({ claim }: { claim: InsuranceClaim }) {
    const { t } = useTranslation('insurance');
    const [submitting, setSubmitting] = useState(false);
    const [checking, setChecking] = useState(false);

    function handleSubmit() {
        setSubmitting(true);
        axios.post(`/insurance/${claim.id}/submit`)
            .then(() => router.reload())
            .catch((err) => alert(err.response?.data?.error ?? 'Submission failed'))
            .finally(() => setSubmitting(false));
    }

    function handleCheckStatus() {
        setChecking(true);
        axios.get(`/insurance/${claim.id}/status`)
            .then(() => router.reload())
            .catch((err) => alert(err.response?.data?.error ?? 'Status check failed'))
            .finally(() => setChecking(false));
    }

    if (!claim.claim_md_id) {
        return (
            <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--primary)] px-2.5 py-1.5 font-primary text-[11px] font-medium text-[var(--primary-foreground)] hover:opacity-80 disabled:opacity-50"
            >
                {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                {t('actions.submitToPayer')}
            </button>
        );
    }

    return (
        <div className="flex items-center justify-end gap-2">
            <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-2.5 py-1.5 font-primary text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] disabled:opacity-50"
            >
                {checking ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                {t('actions.checkStatus')}
            </button>
            {claim.claim_md_status && (
                <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                    {claim.claim_md_status}
                </span>
            )}
        </div>
    );
}

export default function Insurance({ claims, priorAuthorizations, patients, insuranceProviders, recentVerifications, stats }: InsuranceProps) {
    const { t } = useTranslation('insurance');
    const [showNewClaimModal, setShowNewClaimModal] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [selectedPolicyId, setSelectedPolicyId] = useState('');
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<EligibilityVerification | null>(null);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const { query: patientSearch, setQuery: setPatientSearchState, results: filteredPatientsForVerification } = usePatientSearch(patients);

    // The chosen patient may come from a remote search result that isn't in the
    // seeded `patients` prop, so track the selected object directly.
    const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
    const patientPolicies = selectedPatient?.insurance_policies ?? [];

    const handleVerify = async () => {
        if (!selectedPolicyId || !serviceDate) return;
        setVerifying(true);
        setVerificationResult(null);
        setVerificationError(null);

        try {
            const { data } = await axios.post('/insurance/verify', {
                patient_insurance_id: selectedPolicyId,
                service_date: serviceDate,
            });
            setVerificationResult(data.verification);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setVerificationError(error.response?.data?.error ?? t('verification.verificationFailed'));
        } finally {
            setVerifying(false);
        }
    };

    return (
        <>
            <Head title="Insurance" />
            <DashboardLayout
                title={t("title").toUpperCase()}
                subtitle={t("subtitle")}
                actions={
                    <Button variant="primary" icon={FilePlus} onClick={() => setShowNewClaimModal(true)}>
                        + {t("newClaim")}
                    </Button>
                }
            >
                <div className="flex flex-col gap-6">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t("stats.totalClaims")}
                            value={stats.totalClaims.toLocaleString()}
                            change=""
                            period={t("stats.allTime")}
                            icon={Shield}
                            iconColor="#22D3EE"
                            iconBgColor="#22D3EE15"
                        />
                        <StatCard
                            label={t("stats.pendingClaims")}
                            value={stats.pendingClaims.toLocaleString()}
                            change=""
                            changeColor="text-[var(--warning)]"
                            period={t("stats.awaitingResolution")}
                            icon={FileText}
                            iconColor="#F59E0B"
                            iconBgColor="#F59E0B15"
                        />
                        <StatCard
                            label={t("stats.approvalRate")}
                            value={`${stats.approvalRate}%`}
                            change=""
                            period={t("stats.allTime")}
                            icon={CheckCircle}
                            iconColor="#22C55E"
                            iconBgColor="#22C55E15"
                        />
                        <StatCard
                            label={t("stats.avgTurnaround")}
                            value={t('stats.days', { count: stats.avgTurnaroundDays })}
                            change={stats.avgTurnaroundDays <= 3 ? t('stats.withinSla') : t('stats.aboveSla')}
                            changeColor={stats.avgTurnaroundDays <= 3 ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}
                            period="target"
                            icon={Clock}
                            iconColor="#8B5CF6"
                            iconBgColor="#8B5CF615"
                        />
                    </div>

                    {/* Main Content: Claims Table + Right Sidebar */}
                    <div className="flex flex-col gap-4 lg:flex-row">
                        {/* Recent Claims Table */}
                        <div className="flex flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                                <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                                    RECENT_CLAIMS
                                </h3>
                                <div className="flex items-center gap-2">
                                    <Button variant="secondary" icon={SlidersHorizontal}>
                                        Filter
                                    </Button>
                                    <Button variant="secondary" icon={Download}>
                                        Export
                                    </Button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                                            <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                                Claim ID
                                            </th>
                                            <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                                Patient
                                            </th>
                                            <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                                Provider
                                            </th>
                                            <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                                Amount
                                            </th>
                                            <th className="px-5 py-3 text-start font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                                Status
                                            </th>
                                            <th className="px-5 py-3 text-end font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {claims.map((claim, index) => (
                                            <tr
                                                key={claim.id}
                                                className={`transition-colors hover:bg-[var(--card-hover)] ${index < claims.length - 1 ? 'border-b border-[var(--border)]' : ''
                                                    }`}
                                            >
                                                <td className="px-5 py-3">
                                                    <span className="font-mono text-[12px] font-medium text-[var(--primary)]">
                                                        {claim.claim_number}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="font-primary text-[13px] text-[var(--foreground)]">
                                                        {claim.patient?.first_name} {claim.patient?.last_name}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="font-primary text-[12px] text-[var(--muted-foreground)]">
                                                        {claim.insurance_provider?.name}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="font-mono text-[12px] font-medium text-[var(--foreground)]">
                                                        {formatCurrency(claim.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <Badge variant={getClaimBadgeVariant(claim.status)}>
                                                        {getClaimStatusLabel(claim.status, t)}
                                                    </Badge>
                                                </td>
                                                <td className="px-5 py-3 text-end">
                                                    <ClaimActions claim={claim} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="flex w-full flex-col gap-4 lg:w-[360px]">
                            {/* Coverage Verification */}
                            <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                                <div className="border-b border-[var(--border)] px-5 py-4">
                                    <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                                        COVERAGE_VERIFICATION
                                    </h3>
                                </div>
                                <div className="flex flex-col gap-3 p-5">
                                    {/* Patient Select */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modals.newClaim.patient')}</label>
                                        {!selectedPatientId ? (
                                            <>
                                                <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3">
                                                    <Search size={14} className="text-[var(--muted-foreground)]" />
                                                    <input
                                                        type="text"
                                                        placeholder={t("modals.newClaim.searchPatient")}
                                                        value={patientSearch}
                                                        onChange={(e) => setPatientSearchState(e.target.value)}
                                                        className="h-[36px] w-full bg-transparent font-primary text-[13px] text-[var(--foreground)] placeholder-[#52525B] outline-none"
                                                    />
                                                </div>
                                                {patientSearch && (
                                                    <div className="max-h-32 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)]">
                                                        {filteredPatientsForVerification.map((p) => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedPatient(p);
                                                                    setSelectedPatientId(p.id.toString());
                                                                    setSelectedPolicyId('');
                                                                    setPatientSearchState('');
                                                                    setVerificationResult(null);
                                                                    setVerificationError(null);
                                                                }}
                                                                className="w-full px-3 py-2 text-start font-primary text-[13px] text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                                                            >
                                                                {p.first_name} {p.last_name}
                                                            </button>
                                                        ))}
                                                        {filteredPatientsForVerification.length === 0 && (
                                                            <div className="px-3 py-2 font-primary text-[12px] text-[var(--muted-foreground)]">{t('verification.noPatientsFound')}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2">
                                                <span className="font-primary text-[13px] text-[var(--foreground)]">
                                                    {selectedPatient?.first_name} {selectedPatient?.last_name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => { setSelectedPatient(null); setSelectedPatientId(''); setSelectedPolicyId(''); setVerificationResult(null); setVerificationError(null); }}
                                                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Insurance Policy Select */}
                                    {selectedPatientId && (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('verification.insurancePolicy')}</label>
                                            {patientPolicies.length > 0 ? (
                                                <select
                                                    value={selectedPolicyId}
                                                    onChange={(e) => { setSelectedPolicyId(e.target.value); setVerificationResult(null); setVerificationError(null); }}
                                                    className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                                >
                                                    <option value="">{t('verification.selectPolicy')}</option>
                                                    {patientPolicies.map((policy) => (
                                                        <option key={policy.id} value={policy.id}>
                                                            {policy.insurance_provider?.name ?? 'Unknown'} — {policy.member_id} ({policy.plan_type})
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('verification.noPolicies')}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Service Date */}
                                    {selectedPolicyId && (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('verification.serviceDate')}</label>
                                            <input
                                                type="date"
                                                value={serviceDate}
                                                onChange={(e) => setServiceDate(e.target.value)}
                                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                            />
                                        </div>
                                    )}

                                    {/* Verify Button */}
                                    <button
                                        onClick={handleVerify}
                                        disabled={!selectedPolicyId || !serviceDate || verifying}
                                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
                                    >
                                        {verifying ? (
                                            <><Loader2 size={14} className="animate-spin" /> {t('verification.verifying')}</>
                                        ) : (
                                            <><CheckCircle size={14} /> Verify Coverage</>
                                        )}
                                    </button>

                                    {/* Verification Result */}
                                    {verificationResult && (
                                        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] p-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('verification.status')}</span>
                                                <Badge variant={getVerificationBadgeVariant(verificationResult.status)}>
                                                    {getVerificationStatusLabel(verificationResult.status, t)}
                                                </Badge>
                                            </div>
                                            {verificationResult.plan_details && (
                                                <>
                                                    {verificationResult.plan_details.plan_name && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('verification.plan')}</span>
                                                            <span className="font-primary text-[12px] font-medium text-[var(--foreground)]">{verificationResult.plan_details.plan_name}</span>
                                                        </div>
                                                    )}
                                                    {verificationResult.plan_details.group_number && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('verification.group')}</span>
                                                            <span className="font-mono text-[12px] text-[var(--foreground)]">{verificationResult.plan_details.group_number}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {verificationResult.coverages && (
                                                <>
                                                    {verificationResult.coverages.copay != null && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('verification.copay')}</span>
                                                            <span className="font-mono text-[12px] font-medium text-[var(--foreground)]">${verificationResult.coverages.copay}</span>
                                                        </div>
                                                    )}
                                                    {verificationResult.coverages.deductible != null && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('verification.deductible')}</span>
                                                            <span className="font-mono text-[12px] font-medium text-[var(--foreground)]">${verificationResult.coverages.deductible}</span>
                                                        </div>
                                                    )}
                                                    {verificationResult.coverages.coinsurance != null && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('verification.coinsurance')}</span>
                                                            <span className="font-mono text-[12px] font-medium text-[var(--foreground)]">{verificationResult.coverages.coinsurance}%</span>
                                                        </div>
                                                    )}
                                                    {verificationResult.coverages.out_of_pocket_max != null && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('verification.oopMax')}</span>
                                                            <span className="font-mono text-[12px] font-medium text-[var(--foreground)]">${verificationResult.coverages.out_of_pocket_max}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {verificationResult.error_message && (
                                                <p className="font-primary text-[12px] text-red-500">{verificationResult.error_message}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Verification Error */}
                                    {verificationError && (
                                        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/5 p-3">
                                            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
                                            <p className="font-primary text-[12px] text-red-500">{verificationError}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Verifications */}
                            {recentVerifications.length > 0 && (
                                <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                                    <div className="border-b border-[var(--border)] px-5 py-4">
                                        <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                                            RECENT_VERIFICATIONS
                                        </h3>
                                    </div>
                                    <div className="flex flex-col">
                                        {recentVerifications.map((v, index) => (
                                            <div
                                                key={v.id}
                                                className={`flex items-center justify-between px-5 py-3 ${index < recentVerifications.length - 1 ? 'border-b border-[var(--border)]' : ''
                                                    }`}
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                                        {v.patient?.first_name} {v.patient?.last_name}
                                                    </span>
                                                    <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                                        {v.insurance_provider?.name}
                                                    </span>
                                                </div>
                                                <Badge variant={getVerificationBadgeVariant(v.status)}>
                                                    {getVerificationStatusLabel(v.status, t)}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Prior Authorizations */}
                            <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                                    <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                                        PRIOR_AUTHORIZATIONS
                                    </h3>
                                </div>
                                <div className="flex flex-col">
                                    {priorAuthorizations.map((auth, index) => (
                                        <div
                                            key={auth.id}
                                            className={`flex items-start justify-between gap-3 px-5 py-3.5 ${index < priorAuthorizations.length - 1
                                                ? 'border-b border-[var(--border)]'
                                                : ''
                                                }`}
                                        >
                                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[11px] font-medium text-[var(--primary)]">
                                                        {auth.authorization_number}
                                                    </span>
                                                    <Badge variant={getAuthBadgeVariant(auth.status)}>
                                                        {getAuthStatusLabel(auth.status, t)}
                                                    </Badge>
                                                </div>
                                                <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                                    {auth.procedure_name}
                                                </span>
                                                <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                                    {auth.patient?.first_name} {auth.patient?.last_name} &middot; {auth.insurance_provider?.name}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>

            {showNewClaimModal && (
                <NewClaimModal
                    patients={patients}
                    insuranceProviders={insuranceProviders}
                    onClose={() => setShowNewClaimModal(false)}
                />
            )}
        </>
    );
}
