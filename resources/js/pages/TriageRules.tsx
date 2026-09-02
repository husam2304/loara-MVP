import { Head, router, useForm } from '@inertiajs/react';
import { ShieldCheck, GitFork, Timer, Target, Plus, Search, Filter, X, Pencil, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/Button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TriageRule, TriageKeyword, EscalationPath, TriageStaffMember } from '@/types';

interface TriageRulesProps {
    rules: (TriageRule & { keywords?: TriageKeyword[] })[];
    escalationPaths: EscalationPath[];
    keywords: TriageKeyword[];
    staff: TriageStaffMember[];
    stats: {
        activeRuleCount: number;
        totalRuleCount: number;
        escalationPathCount: number;
    };
}

const getPriorityStyles = (t: any): Record<string, { text: string; bg: string; label: string }> => ({
    critical: { text: 'text-[var(--destructive)]', bg: 'bg-[#EF44441A]', label: t('priorities.critical') },
    high: { text: 'text-[var(--warning)]', bg: 'bg-[#F59E0B1A]', label: t('priorities.high') },
    medium: { text: 'text-[#3B82F6]', bg: 'bg-[#3B82F61A]', label: t('priorities.medium') },
    low: { text: 'text-[var(--success)]', bg: 'bg-[#22C55E1A]', label: t('priorities.low') },
});

const getActionLabels = (t: any): Record<string, string> => ({
    transfer_immediately: t('actions.transfer_immediately'),
    transfer_nurse: t('actions.transfer_nurse'),
    queue_callback: t('actions.queue_callback'),
    send_alert: t('actions.send_alert'),
    route_to_voicemail: t('actions.route_to_voicemail'),
});

const escalationColors = ['#22D3EE', '#F59E0B', '#EF4444', '#8B5CF6', '#22C55E'];

const keywordCategoryColors: Record<string, { color: string; bgColor: string }> = {
    emergency: { color: '#EF4444', bgColor: '#EF444420' },
    clinical: { color: '#F59E0B', bgColor: '#F59E0B20' },
    billing: { color: '#3B82F6', bgColor: '#3B82F620' },
    general: { color: '#22C55E', bgColor: '#22C55E20' },
};

interface KeywordEntry {
    keyword: string;
    category: 'emergency' | 'clinical' | 'billing' | 'general';
}

function RuleModal({ rule, staff, onClose }: { rule?: TriageRule & { keywords?: TriageKeyword[] }; staff: TriageStaffMember[]; onClose: () => void }) {
    const { t } = useTranslation('triageRules');
    const isEdit = !!rule;
    const form = useForm<{
        name: string;
        description: string;
        priority: string;
        action: string;
        target_role: string;
        target_user_id: string;
        keywords: KeywordEntry[];
    }>({
        name: rule?.name ?? '',
        description: rule?.description ?? '',
        priority: rule?.priority ?? 'medium',
        action: rule?.action ?? 'queue_callback',
        target_role: rule?.target_role ?? '',
        target_user_id: rule?.target_user_id ? String(rule.target_user_id) : '',
        keywords: (rule?.keywords ?? []).map((kw) => ({
            keyword: kw.keyword,
            category: kw.category as KeywordEntry['category'],
        })),
    });

    const [newKeyword, setNewKeyword] = useState('');
    const [newCategory, setNewCategory] = useState<KeywordEntry['category']>('general');

    const addKeyword = () => {
        if (!newKeyword.trim()) return;
        form.setData('keywords', [...form.data.keywords, { keyword: newKeyword.trim(), category: newCategory }]);
        setNewKeyword('');
    };

    const removeKeyword = (index: number) => {
        form.setData('keywords', form.data.keywords.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => onClose() };
        // Empty-string selects mean "no explicit target" — send null so the
        // backend's `nullable` validation rules treat it as unset rather
        // than trying to validate "" as a role string or a user id.
        form.transform((data) => ({
            ...data,
            target_role: data.target_role || null,
            target_user_id: data.target_user_id || null,
        }));
        if (isEdit && rule) {
            form.patch(`/triage-rules/${rule.id}`, opts);
        } else {
            form.post('/triage-rules', opts);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                        {isEdit ? t('modal.editTitle') : t('modal.newTitle')}
                    </h2>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-5">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modal.nameLabel')}</label>
                        <input
                            type="text"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            placeholder={t('modal.namePlaceholder')}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                        {form.errors.name && <span className="font-primary text-[11px] text-red-500">{form.errors.name}</span>}
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modal.descLabel')}</label>
                        <textarea
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            placeholder={t('modal.descPlaceholder')}
                            rows={2}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                    </div>

                    {/* Priority + Action */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modal.priorityLabel')}</label>
                            <select
                                value={form.data.priority}
                                onChange={(e) => form.setData('priority', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            >
                                <option value="critical">{t('priorities.critical')}</option>
                                <option value="high">{t('priorities.high')}</option>
                                <option value="medium">{t('priorities.medium')}</option>
                                <option value="low">{t('priorities.low')}</option>
                            </select>
                            {form.errors.priority && <span className="font-primary text-[11px] text-red-500">{form.errors.priority}</span>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modal.actionLabel')}</label>
                            <select
                                value={form.data.action}
                                onChange={(e) => form.setData('action', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            >
                                <option value="transfer_immediately">{t('actions.transfer_immediately')}</option>
                                <option value="transfer_nurse">{t('actions.transfer_nurse')}</option>
                                <option value="queue_callback">{t('actions.queue_callback')}</option>
                                <option value="send_alert">{t('actions.send_alert')}</option>
                                <option value="route_to_voicemail">{t('actions.route_to_voicemail')}</option>
                            </select>
                            {form.errors.action && <span className="font-primary text-[11px] text-red-500">{form.errors.action}</span>}
                        </div>
                    </div>

                    {/* Target role + target user */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modal.targetRoleLabel')}</label>
                            <input
                                type="text"
                                value={form.data.target_role}
                                onChange={(e) => form.setData('target_role', e.target.value)}
                                placeholder={t('modal.targetRolePlaceholder')}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                            {form.errors.target_role && <span className="font-primary text-[11px] text-red-500">{form.errors.target_role}</span>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modal.targetUserLabel')}</label>
                            <select
                                value={form.data.target_user_id}
                                onChange={(e) => form.setData('target_user_id', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            >
                                <option value="">{t('modal.targetUserNone')}</option>
                                {staff.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                            {form.errors.target_user_id && <span className="font-primary text-[11px] text-red-500">{form.errors.target_user_id}</span>}
                        </div>
                    </div>

                    {/* Keywords */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('modal.keywordsLabel')}</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                                placeholder={t('modal.addKeywordPlaceholder')}
                                className="flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                            <select
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value as KeywordEntry['category'])}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-2 py-2 font-primary text-[12px] text-[var(--foreground)] outline-none"
                            >
                                <option value="emergency">{t('categories.emergency')}</option>
                                <option value="clinical">{t('categories.clinical')}</option>
                                <option value="billing">{t('categories.billing')}</option>
                                <option value="general">{t('categories.general')}</option>
                            </select>
                            <button
                                type="button"
                                onClick={addKeyword}
                                className="rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-2 font-primary text-[12px] font-medium text-[var(--primary-foreground)] hover:opacity-80"
                            >
                                {t('modal.addBtn')}
                            </button>
                        </div>
                        {form.data.keywords.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {form.data.keywords.map((kw, i) => {
                                    const colors = keywordCategoryColors[kw.category] || keywordCategoryColors.general;
                                    return (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium"
                                            style={{ color: colors.color, backgroundColor: colors.bgColor }}
                                        >
                                            {kw.keyword}
                                            <button
                                                type="button"
                                                onClick={() => removeKeyword(i)}
                                                className="ms-0.5 hover:opacity-60"
                                            >
                                                <X size={10} />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                        >
                            {t('modal.cancelBtn')}
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                            {form.processing ? t('modal.savingBtn') : (isEdit ? t('modal.saveBtn') : t('modal.createBtn'))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EscalationPathModal({ path, onClose }: { path?: EscalationPath; onClose: () => void }) {
    const { t } = useTranslation('triageRules');
    const isEdit = !!path;
    const form = useForm<{
        name: string;
        description: string;
        level: string;
        target_role: string;
        timeout_seconds: string;
    }>({
        name: path?.name ?? '',
        description: path?.description ?? '',
        level: path ? String(path.level) : '',
        target_role: path?.target_role ?? '',
        timeout_seconds: path ? String(path.timeout_seconds) : '60',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => onClose() };
        if (isEdit && path) {
            form.patch(`/escalation-paths/${path.id}`, opts);
        } else {
            form.post('/escalation-paths', opts);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">
                        {isEdit ? t('escalationModal.editTitle') : t('escalationModal.newTitle')}
                    </h2>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('escalationModal.levelLabel')}</label>
                            <input
                                type="number"
                                min={1}
                                value={form.data.level}
                                onChange={(e) => form.setData('level', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                            {form.errors.level && <span className="font-primary text-[11px] text-red-500">{form.errors.level}</span>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('escalationModal.timeoutLabel')}</label>
                            <input
                                type="number"
                                min={5}
                                value={form.data.timeout_seconds}
                                onChange={(e) => form.setData('timeout_seconds', e.target.value)}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                            {form.errors.timeout_seconds && <span className="font-primary text-[11px] text-red-500">{form.errors.timeout_seconds}</span>}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('escalationModal.nameLabel')}</label>
                        <input
                            type="text"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                        {form.errors.name && <span className="font-primary text-[11px] text-red-500">{form.errors.name}</span>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('escalationModal.targetRoleLabel')}</label>
                        <input
                            type="text"
                            value={form.data.target_role}
                            onChange={(e) => form.setData('target_role', e.target.value)}
                            placeholder={t('modal.targetRolePlaceholder')}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                        {form.errors.target_role && <span className="font-primary text-[11px] text-red-500">{form.errors.target_role}</span>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('escalationModal.descLabel')}</label>
                        <textarea
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            rows={2}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 font-primary text-[13px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                        >
                            {t('modal.cancelBtn')}
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                            {form.processing ? t('modal.savingBtn') : (isEdit ? t('modal.saveBtn') : t('modal.createBtn'))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function TriageRules({ rules, escalationPaths, keywords, staff, stats }: TriageRulesProps) {
    const { t } = useTranslation('triageRules');
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewRuleModal, setShowNewRuleModal] = useState(false);
    const [editingRule, setEditingRule] = useState<(TriageRule & { keywords?: TriageKeyword[] }) | null>(null);
    const [showNewPathModal, setShowNewPathModal] = useState(false);
    const [editingPath, setEditingPath] = useState<EscalationPath | null>(null);

    const filteredRules = rules.filter((rule) =>
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const toggleRule = (rule: TriageRule) => {
        router.patch(`/triage-rules/${rule.id}/toggle`, {}, { preserveScroll: true });
    };

    const deleteRule = (rule: TriageRule) => {
        if (!confirm(t('table.deleteConfirm').replace('{{name}}', rule.name))) return;
        router.delete(`/triage-rules/${rule.id}`, { preserveScroll: true });
    };

    const togglePath = (path: EscalationPath) => {
        router.patch(`/escalation-paths/${path.id}/toggle`, {}, { preserveScroll: true });
    };

    const deletePath = (path: EscalationPath) => {
        if (!confirm(t('table.deleteConfirm').replace('{{name}}', path.name))) return;
        router.delete(`/escalation-paths/${path.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Triage Rules" />
            <DashboardLayout title={t('title')} subtitle={t('subtitle')}>
                <div className="flex flex-col gap-6">
                    {/* Header action */}
                    <div className="flex justify-end">
                        <Button variant="primary" icon={Plus} onClick={() => setShowNewRuleModal(true)}>
                            {t('newRule')}
                        </Button>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t('stats.activeRules')}
                            value={stats.activeRuleCount.toString()}
                            change={`${t('stats.of')} ${stats.totalRuleCount}`}
                            period={t('stats.total')}
                            icon={ShieldCheck}
                            iconColor="#22D3EE"
                            iconBgColor="#22D3EE15"
                        />
                        <StatCard
                            label={t('stats.escalationPaths')}
                            value={stats.escalationPathCount.toString()}
                            change=""
                            period={t('stats.configured')}
                            icon={GitFork}
                            iconColor="#22C55E"
                            iconBgColor="#22C55E15"
                        />
                        <StatCard
                            label={t('stats.avgTriageTime')}
                            value="8.2s"
                            change="-1.4s"
                            changeColor="text-[var(--primary)]"
                            period={t('stats.improvement')}
                            icon={Timer}
                            iconColor="#8B5CF6"
                            iconBgColor="#8B5CF615"
                        />
                        <StatCard
                            label={t('stats.accuracy')}
                            value="97.1%"
                            change={t('stats.aboveTarget')}
                            period=""
                            icon={Target}
                            iconColor="#F59E0B"
                            iconBgColor="#F59E0B15"
                        />
                    </div>

                    {/* Main content */}
                    <div className="flex flex-col gap-4 lg:flex-row">
                        {/* Rules Table */}
                        <div className="flex flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                                <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">
                                    {t('activeRules')}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button className="flex h-[34px] w-[34px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)]">
                                        <Filter size={14} className="text-[var(--muted-foreground)]" />
                                    </button>
                                    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3">
                                        <Search size={14} className="text-[var(--muted-foreground)]" />
                                        <input
                                            type="text"
                                            placeholder={t('searchRules')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-[34px] w-[160px] bg-transparent font-primary text-[13px] text-[var(--foreground)] placeholder-[#52525B] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Table header */}
                            <div className="grid grid-cols-[1fr_90px_110px_130px_60px_70px] gap-3 border-b border-[var(--border)] bg-[var(--secondary)] px-5 py-2.5">
                                <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--muted-foreground)]">{t('table.name')}</span>
                                <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--muted-foreground)]">{t('table.priority')}</span>
                                <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--muted-foreground)]">{t('table.keywords')}</span>
                                <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--muted-foreground)]">{t('table.action')}</span>
                                <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--muted-foreground)]">{t('table.status')}</span>
                                <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--muted-foreground)]">{t('table.actions')}</span>
                            </div>

                            {/* Table rows */}
                            <div className="flex flex-col">
                                {filteredRules.map((rule, i) => {
                                    const pStyle = getPriorityStyles(t)[rule.priority] || getPriorityStyles(t).low;
                                    return (
                                        <div
                                            key={rule.id}
                                            className={`grid grid-cols-[1fr_90px_110px_130px_60px_70px] items-center gap-3 px-5 py-3 ${i < filteredRules.length - 1 ? 'border-b border-[var(--border)]' : ''
                                                }`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                                    {rule.name}
                                                </span>
                                                <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                                    {rule.description || '\u2014'}
                                                </span>
                                            </div>
                                            <span className={`inline-flex w-fit items-center rounded-full px-2 py-[2px] font-mono text-[11px] font-medium ${pStyle.text} ${pStyle.bg}`}>
                                                {pStyle.label}
                                            </span>
                                            <span className="font-primary text-[12px] text-[var(--muted-foreground)]">
                                                {rule.keywords && rule.keywords.length > 0 ? `${rule.keywords.length} ${t('table.keywordsCount')}` : '\u2014'}
                                            </span>
                                            <span className="font-primary text-[12px] font-medium text-[var(--foreground)]">
                                                {getActionLabels(t)[rule.action] || rule.action}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => toggleRule(rule)}
                                                title={rule.is_active ? t('table.deactivate') : t('table.activate')}
                                                className={`relative h-5 w-9 rounded-full transition-colors ${rule.is_active ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
                                                    }`}
                                            >
                                                <span
                                                    className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${rule.is_active ? 'start-[18px]' : 'start-[2px]'
                                                        }`}
                                                />
                                            </button>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingRule(rule)}
                                                    title={t('table.edit')}
                                                    className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteRule(rule)}
                                                    title={t('table.delete')}
                                                    className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--destructive)]"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredRules.length === 0 && (
                                    <div className="px-5 py-8 text-center">
                                        <p className="font-primary text-[13px] text-[var(--muted-foreground)]">{t('table.noRules')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right column */}
                        <div className="flex w-full flex-col gap-4 lg:w-[320px]">
                            {/* Escalation Paths */}
                            <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                                    <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">{t('escalationPaths')}</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPathModal(true)}
                                        title={t('escalationModal.newTitle')}
                                        className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <div className="flex flex-col gap-3 p-5">
                                    {escalationPaths.length > 0 ? escalationPaths.map((path, i) => {
                                        const color = escalationColors[i % escalationColors.length];
                                        return (
                                            <div key={path.id} className={`flex items-start gap-3 ${path.is_active ? '' : 'opacity-50'}`}>
                                                <div
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
                                                    style={{ backgroundColor: `${color}15` }}
                                                >
                                                    <span className="font-mono text-[11px] font-bold" style={{ color }}>
                                                        {path.level}
                                                    </span>
                                                </div>
                                                <div className="flex flex-1 flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-primary text-[13px] font-semibold text-[var(--foreground)]">{path.name}</span>
                                                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">&mdash; {path.target_role}</span>
                                                    </div>
                                                    <span className="font-primary text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                                                        {path.description || '\u2014'}
                                                    </span>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePath(path)}
                                                        title={path.is_active ? t('table.deactivate') : t('table.activate')}
                                                        className={`relative h-4 w-7 rounded-full transition-colors ${path.is_active ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'}`}
                                                    >
                                                        <span
                                                            className={`absolute top-[2px] h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${path.is_active ? 'start-[14px]' : 'start-[2px]'}`}
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingPath(path)}
                                                        title={t('table.edit')}
                                                        className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deletePath(path)}
                                                        title={t('table.delete')}
                                                        className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--destructive)]"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('empty.noEscalationPaths')}</p>
                                    )}
                                </div>
                            </div>

                            {/* Alert Keywords */}
                            <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
                                <div className="border-b border-[var(--border)] px-5 py-4">
                                    <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">{t('alertKeywords')}</h3>
                                </div>
                                <div className="flex flex-wrap gap-2 p-5">
                                    {keywords.length > 0 ? keywords.map((keyword) => {
                                        const colors = keywordCategoryColors[keyword.category] || keywordCategoryColors.general;
                                        return (
                                            <span
                                                key={keyword.id}
                                                className="inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[11px] font-medium"
                                                style={{ color: colors.color, backgroundColor: colors.bgColor }}
                                            >
                                                {keyword.keyword}
                                            </span>
                                        );
                                    }) : (
                                        <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('empty.noKeywords')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>

            {showNewRuleModal && (
                <RuleModal staff={staff} onClose={() => setShowNewRuleModal(false)} />
            )}
            {editingRule && (
                <RuleModal rule={editingRule} staff={staff} onClose={() => setEditingRule(null)} />
            )}
            {showNewPathModal && (
                <EscalationPathModal onClose={() => setShowNewPathModal(false)} />
            )}
            {editingPath && (
                <EscalationPathModal path={editingPath} onClose={() => setEditingPath(null)} />
            )}
        </>
    );
}
