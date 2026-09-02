import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { Bot, Plus, Star, Trash2, Pencil, ArrowRight, Rocket, PowerOff, Workflow as WorkflowIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';

interface ToolOption {
    value: string;
    label: string;
}

interface WorkflowNode {
    id: number;
    name: string;
    role: string | null;
    system_prompt: string | null;
    greeting_message: string | null;
    model: string;
    temperature: number;
    voice_provider: string;
    voice_name: string;
    tool_names: string[];
    is_entry_point: boolean;
}

interface WorkflowEdge {
    id: number;
    source_node_id: number;
    target_node_id: number;
    condition: string;
    description: string | null;
    context_plan: string;
    source_node?: { id: number; name: string };
    target_node?: { id: number; name: string };
}

interface SquadWorkflow {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    deployed_at: string | null;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

interface WorkflowProps {
    workflow: SquadWorkflow | null;
    availableTools: ToolOption[];
}

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
const VOICE_PROVIDERS = ['vapi', 'elevenlabs', 'azure'];
const getContextPlans = (t: any) => [
    { value: 'all', label: t('contextPlans.all') },
    { value: 'lastNMessages', label: t('contextPlans.lastNMessages') },
    { value: 'none', label: t('contextPlans.none') },
];

const inputClass =
    'h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]';
const labelClass = 'font-mono text-[11px] font-medium text-[var(--muted-foreground)]';

type NodeFormState = {
    name: string;
    role: string;
    system_prompt: string;
    greeting_message: string;
    model: string;
    temperature: number;
    voice_provider: string;
    voice_name: string;
    tool_names: string[];
};

function emptyNode(): NodeFormState {
    return {
        name: '',
        role: '',
        system_prompt: '',
        greeting_message: '',
        model: 'gpt-4o',
        temperature: 0.7,
        voice_provider: 'vapi',
        voice_name: 'jessica',
        tool_names: [],
    };
}

export default function Workflow({ workflow, availableTools }: WorkflowProps) {
    const { t } = useTranslation('workflow');
    const errors = (usePage().props as { errors?: Record<string, string> }).errors ?? {};
    const [nodeModalOpen, setNodeModalOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<WorkflowNode | null>(null);
    const [edgeModalOpen, setEdgeModalOpen] = useState(false);

    // ── Create workflow (empty state) ──────────────────────────────
    const createForm = useForm({ name: 'Clinic Squad', description: '' });

    function handleCreate(e: FormEvent) {
        e.preventDefault();
        createForm.post('/workflow', { preserveScroll: true });
    }

    // ── Node form (add / edit) ─────────────────────────────────────
    const nodeForm = useForm<NodeFormState>(emptyNode());

    function openAddNode() {
        setEditingNode(null);
        nodeForm.setData(emptyNode());
        nodeForm.clearErrors();
        setNodeModalOpen(true);
    }

    function openEditNode(node: WorkflowNode) {
        setEditingNode(node);
        nodeForm.setData({
            name: node.name,
            role: node.role ?? '',
            system_prompt: node.system_prompt ?? '',
            greeting_message: node.greeting_message ?? '',
            model: node.model,
            temperature: Number(node.temperature),
            voice_provider: node.voice_provider,
            voice_name: node.voice_name,
            tool_names: node.tool_names ?? [],
        });
        nodeForm.clearErrors();
        setNodeModalOpen(true);
    }

    function submitNode(e: FormEvent) {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => setNodeModalOpen(false) };
        if (editingNode) {
            nodeForm.patch(`/workflow/nodes/${editingNode.id}`, opts);
        } else {
            nodeForm.post('/workflow/nodes', opts);
        }
    }

    function toggleTool(tool: string) {
        const current = nodeForm.data.tool_names;
        nodeForm.setData('tool_names', current.includes(tool) ? current.filter((t) => t !== tool) : [...current, tool]);
    }

    function setEntryPoint(node: WorkflowNode) {
        router.patch(`/workflow/nodes/${node.id}/entry-point`, {}, { preserveScroll: true });
    }

    function deleteNode(node: WorkflowNode) {
        if (!confirm(t('assistants.deleteConfirm').replace('{{name}}', node.name))) return;
        router.delete(`/workflow/nodes/${node.id}`, { preserveScroll: true });
    }

    // ── Edge form ──────────────────────────────────────────────────
    const edgeForm = useForm({
        source_node_id: '',
        target_node_id: '',
        condition: '',
        description: '',
        context_plan: 'all',
    });

    function openAddEdge() {
        edgeForm.reset();
        edgeForm.clearErrors();
        setEdgeModalOpen(true);
    }

    function submitEdge(e: FormEvent) {
        e.preventDefault();
        edgeForm.post('/workflow/edges', { preserveScroll: true, onSuccess: () => setEdgeModalOpen(false) });
    }

    function deleteEdge(edge: WorkflowEdge) {
        if (!confirm(t('transitions.removeConfirm'))) return;
        router.delete(`/workflow/edges/${edge.id}`, { preserveScroll: true });
    }

    // ── Deploy / undeploy ──────────────────────────────────────────
    function deploy() {
        router.post('/workflow/deploy', {}, { preserveScroll: true });
    }
    function undeploy() {
        if (!confirm(t('undeployConfirm'))) return;
        router.post('/workflow/undeploy', {}, { preserveScroll: true });
    }

    // ── Empty state ────────────────────────────────────────────────
    if (!workflow) {
        return (
            <DashboardLayout title={t('title')} subtitle={t('subtitle')}>
                <Head title="Workflow" />
                <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                        <WorkflowIcon className="h-6 w-6 text-[var(--primary)]" />
                    </div>
                    <h2 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">{t('emptyState.title')}</h2>
                    <p className="font-primary text-[13px] text-[var(--muted-foreground)]">
                        {t('emptyState.description')}
                    </p>
                    <form onSubmit={handleCreate} className="flex w-full flex-col gap-3 text-start">
                        <div className="flex flex-col gap-1.5">
                            <label className={labelClass}>{t('emptyState.workflowName')}</label>
                            <input className={inputClass} value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} />
                            {createForm.errors.name && <p className="text-[11px] text-red-400">{createForm.errors.name}</p>}
                        </div>
                        <button
                            type="submit"
                            disabled={createForm.processing}
                            className="mt-1 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-80 disabled:opacity-50"
                        >
                            <Plus size={14} /> Create workflow
                        </button>
                    </form>
                </div>
            </DashboardLayout>
        );
    }

    const nodes = workflow.nodes ?? [];
    const edges = workflow.edges ?? [];

    return (
        <DashboardLayout
            title={t('title')}
            subtitle={t('subtitle')}
            actions={
                workflow.is_active ? (
                    <Button variant="secondary" icon={PowerOff} onClick={undeploy}>{t('actions.disableSquad')}</Button>
                ) : (
                    <Button variant="primary" icon={Rocket} onClick={deploy}>{t('actions.deploySquad')}</Button>
                )
            }
        >
            <Head title="Workflow" />
            <div className="mx-auto flex max-w-4xl flex-col gap-6">
                {/* Status + deploy errors */}
                <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-5 py-4">
                    <div>
                        <h2 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">{workflow.name}</h2>
                        {workflow.description && <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{workflow.description}</p>}
                    </div>
                    <Badge variant={workflow.is_active ? 'success' : 'warning'}>
                        {workflow.is_active ? t('status.deployed') : t('status.draft')}
                    </Badge>
                </div>

                {errors.deploy && (
                    <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 font-primary text-[12px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        {errors.deploy}
                    </div>
                )}

                {/* Assistants */}
                <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-mono text-[13px] font-semibold text-[var(--foreground)]">{t('assistants.title')} ({nodes.length})</h3>
                        <Button variant="secondary" icon={Plus} onClick={openAddNode}>{t('assistants.addBtn')}</Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {nodes.map((node) => (
                            <div key={node.id} className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Bot className="h-4 w-4 text-[var(--primary)]" />
                                        <span className="font-mono text-[13px] font-semibold text-[var(--foreground)]">{node.name}</span>
                                    </div>
                                    {node.is_entry_point && <Badge variant="success">{t('assistants.entryBadge')}</Badge>}
                                </div>
                                {node.role && <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{node.role}</p>}
                                <p className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                    {node.model} · {(node.tool_names ?? []).length} {t('assistants.tools')}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                    {!node.is_entry_point && (
                                        <button onClick={() => setEntryPoint(node)} title={t('assistants.makeEntryPoint')} className="flex items-center gap-1 font-primary text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                                            <Star size={12} /> Set entry
                                        </button>
                                    )}
                                    <button onClick={() => openEditNode(node)} title="Edit" className="flex items-center gap-1 font-primary text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                                        <Pencil size={12} /> Edit
                                    </button>
                                    {!node.is_entry_point && (
                                        <button onClick={() => deleteNode(node)} title="Delete" className="flex items-center gap-1 font-primary text-[11px] text-red-400 hover:text-red-500">
                                            <Trash2 size={12} /> Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Transitions */}
                <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-mono text-[13px] font-semibold text-[var(--foreground)]">{t('transitions.title')} ({edges.length})</h3>
                        <Button variant="secondary" icon={Plus} onClick={openAddEdge}>{t('transitions.addBtn')}</Button>
                    </div>
                    {edges.length === 0 ? (
                        <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-4 py-6 text-center font-primary text-[12px] text-[var(--muted-foreground)]">
                            No transitions yet. Add a transition so the entry assistant can hand off to others.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {edges.map((edge) => (
                                <div key={edge.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                                    <div className="flex items-center gap-2 font-primary text-[12px] text-[var(--foreground)]">
                                        <span className="font-medium">{edge.source_node?.name ?? `#${edge.source_node_id}`}</span>
                                        <ArrowRight size={14} className="text-[var(--muted-foreground)]" />
                                        <span className="font-medium">{edge.target_node?.name ?? `#${edge.target_node_id}`}</span>
                                        <span className="text-[var(--muted-foreground)]">— {edge.condition}</span>
                                    </div>
                                    <button onClick={() => deleteEdge(edge)} title={t('transitions.remove')} className="text-red-400 hover:text-red-500">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Node modal */}
            <Modal open={nodeModalOpen} onClose={() => setNodeModalOpen(false)} title={editingNode ? t('modals.assistant.editTitle') : t('modals.assistant.addTitle')}>
                <form onSubmit={submitNode} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pe-1">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className={labelClass}>{t('modals.assistant.nameLabel')}</label>
                            <input className={inputClass} value={nodeForm.data.name} onChange={(e) => nodeForm.setData('name', e.target.value)} />
                            {nodeForm.errors.name && <p className="text-[11px] text-red-400">{nodeForm.errors.name}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className={labelClass}>{t('modals.assistant.roleLabel')}</label>
                            <input className={inputClass} value={nodeForm.data.role} onChange={(e) => nodeForm.setData('role', e.target.value)} placeholder={t('modals.assistant.rolePlaceholder')} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('modals.assistant.greetingLabel')}</label>
                        <input className={inputClass} value={nodeForm.data.greeting_message} onChange={(e) => nodeForm.setData('greeting_message', e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('modals.assistant.systemPromptLabel')}</label>
                        <textarea
                            rows={4}
                            value={nodeForm.data.system_prompt}
                            onChange={(e) => nodeForm.setData('system_prompt', e.target.value)}
                            className="resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2.5 font-primary text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className={labelClass}>{t('modals.assistant.modelLabel')}</label>
                            <select className={inputClass} value={nodeForm.data.model} onChange={(e) => nodeForm.setData('model', e.target.value)}>
                                {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className={labelClass}>{t('modals.assistant.temperatureLabel')}</label>
                            <input type="number" step="0.1" min="0" max="1" className={inputClass} value={nodeForm.data.temperature} onChange={(e) => nodeForm.setData('temperature', parseFloat(e.target.value))} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className={labelClass}>{t('modals.assistant.voiceProviderLabel')}</label>
                            <select className={inputClass} value={nodeForm.data.voice_provider} onChange={(e) => nodeForm.setData('voice_provider', e.target.value)}>
                                {VOICE_PROVIDERS.map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('modals.assistant.voiceNameLabel')}</label>
                        <input className={inputClass} value={nodeForm.data.voice_name} onChange={(e) => nodeForm.setData('voice_name', e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('modals.assistant.toolsLabel')}</label>
                        <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] p-2">
                            {availableTools.map((tool) => (
                                <label key={tool.value} className="flex items-center gap-2 font-primary text-[12px] text-[var(--foreground)]">
                                    <input type="checkbox" checked={nodeForm.data.tool_names.includes(tool.value)} onChange={() => toggleTool(tool.value)} className="accent-[var(--primary)]" />
                                    {tool.label}
                                </label>
                            ))}
                        </div>
                        {nodeForm.errors.tool_names && <p className="text-[11px] text-red-400">{nodeForm.errors.tool_names}</p>}
                    </div>
                    <button type="submit" disabled={nodeForm.processing} className="mt-1 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-80 disabled:opacity-50">
                        {editingNode ? t('modals.assistant.saveBtn') : t('modals.assistant.addBtn')}
                    </button>
                </form>
            </Modal>

            {/* Edge modal */}
            <Modal open={edgeModalOpen} onClose={() => setEdgeModalOpen(false)} title={t('modals.transition.title')}>
                <form onSubmit={submitEdge} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('modals.transition.fromLabel')}</label>
                        <select className={inputClass} value={edgeForm.data.source_node_id} onChange={(e) => edgeForm.setData('source_node_id', e.target.value)}>
                            <option value="">{t('modals.transition.selectOption')}</option>
                            {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                        {edgeForm.errors.source_node_id && <p className="text-[11px] text-red-400">{edgeForm.errors.source_node_id}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('modals.transition.toLabel')}</label>
                        <select className={inputClass} value={edgeForm.data.target_node_id} onChange={(e) => edgeForm.setData('target_node_id', e.target.value)}>
                            <option value="">{t('modals.transition.selectOption')}</option>
                            {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                        {edgeForm.errors.target_node_id && <p className="text-[11px] text-red-400">{edgeForm.errors.target_node_id}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('modals.transition.conditionLabel')}</label>
                        <input className={inputClass} value={edgeForm.data.condition} onChange={(e) => edgeForm.setData('condition', e.target.value)} placeholder={t('modals.transition.conditionPlaceholder')} />
                        {edgeForm.errors.condition && <p className="text-[11px] text-red-400">{edgeForm.errors.condition}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('modals.transition.handoffLabel')}</label>
                        <input className={inputClass} value={edgeForm.data.description} onChange={(e) => edgeForm.setData('description', e.target.value)} placeholder={t('modals.transition.handoffPlaceholder')} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('modals.transition.contextLabel')}</label>
                        <select className={inputClass} value={edgeForm.data.context_plan} onChange={(e) => edgeForm.setData('context_plan', e.target.value)}>
                            {getContextPlans(t).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    <button type="submit" disabled={edgeForm.processing} className="mt-1 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-80 disabled:opacity-50">
                        Add transition
                    </button>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
