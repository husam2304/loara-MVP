import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { FormEvent, useState, useEffect } from 'react';
import {
    Save,
    Sparkles,
    LayoutGrid,
    ListOrdered,
    BarChart2,
    Megaphone,
    Globe,
    Workflow,
    Plus,
    Trash2,
    ExternalLink,
    Phone,
    Calendar,
    Stethoscope,
    Shield,
    BookOpen,
    Settings,
    Wifi,
    Zap,
    Headphones,
    MessageSquare,
    CalendarCheck,
    PhoneOff,
    PhoneForwarded,
    CheckCircle2,
    Play,
    AlertTriangle,
    Users,
    Lock,
    Star,
    Heart,
    Bell,
    Search,
    Mail,
    MapPin,
    Clock,
    FileText,
    Database,
    Server,
    DollarSign,
    Image,
    HelpCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FlashMessage } from '@/components/FlashMessage';
import type {
    LandingPageContent,
    LandingPageTrustBadge,
    LandingPageFeatureItem,
    LandingPageStep,
    LandingPageStatItem,
    LandingPageSocialLink,
    LandingPageFlowCard,
    LandingPageShowcaseItem,
    LandingPageSecurityItem,
    LandingPageTestimonialItem,
    LandingPageFaqItem,
} from '@/types';

interface LandingPageProps {
    content: LandingPageContent;
}

interface CmsTab {
    id: string;
    label: string;
    icon: React.ElementType;
}

const cmsTabIcons: Record<string, React.ElementType> = {
    hero: Sparkles,
    features: LayoutGrid,
    showcase: Image,
    'how-it-works': ListOrdered,
    security: Lock,
    stats: BarChart2,
    pricing: DollarSign,
    testimonials: Star,
    faq: HelpCircle,
    cta: Megaphone,
    footer: Globe,
    workflows: Workflow,
};

function getCmsTabs(t: (key: string) => string): CmsTab[] {
    return [
        { id: 'hero', label: t('editor.tabs.hero'), icon: cmsTabIcons.hero },
        { id: 'features', label: t('editor.tabs.features'), icon: cmsTabIcons.features },
        { id: 'showcase', label: t('editor.tabs.showcase'), icon: cmsTabIcons.showcase },
        { id: 'how-it-works', label: t('editor.tabs.howItWorks'), icon: cmsTabIcons['how-it-works'] },
        { id: 'security', label: t('editor.tabs.security'), icon: cmsTabIcons.security },
        { id: 'stats', label: t('editor.tabs.stats'), icon: cmsTabIcons.stats },
        { id: 'pricing', label: t('editor.tabs.pricing'), icon: cmsTabIcons.pricing },
        { id: 'testimonials', label: t('editor.tabs.testimonials'), icon: cmsTabIcons.testimonials },
        { id: 'faq', label: t('editor.tabs.faq'), icon: cmsTabIcons.faq },
        { id: 'cta', label: t('editor.tabs.cta'), icon: cmsTabIcons.cta },
        { id: 'footer', label: t('editor.tabs.footer'), icon: cmsTabIcons.footer },
        // { id: 'workflows', label: t('editor.tabs.workflows'), icon: cmsTabIcons.workflows },
    ];
}

const ICON_NAMES = [
    'Phone', 'Calendar', 'Stethoscope', 'Shield', 'BarChart2', 'BookOpen', 'Settings', 'Wifi',
    'Zap', 'Headphones', 'MessageSquare', 'CalendarCheck', 'PhoneOff', 'PhoneForwarded',
    'CheckCircle2', 'Play', 'AlertTriangle', 'Users', 'Lock', 'Globe', 'Star', 'Heart',
    'Bell', 'Search', 'Mail', 'MapPin', 'Clock', 'FileText', 'Database', 'Server',
] as const;

const FLOW_CARD_TYPES = [
    'conversation', 'start', 'tool', 'end_call', 'transfer', 'badge',
] as const;

const SOCIAL_PLATFORMS = [
    'twitter', 'linkedin', 'github', 'facebook', 'instagram',
] as const;

const inputClass =
    'h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]';
const selectClass =
    'h-10 appearance-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]';
const textareaClass =
    'rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2.5 font-primary text-[13px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]';

// ===================== SHARED COMPONENTS =====================

function SectionCard({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-4">
                <Icon size={16} className="text-[var(--primary)]" />
                <div>
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">{title}</h2>
                    {description && (
                        <p className="text-xs text-[var(--muted-foreground)]">{description}</p>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}

function FormField({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                {label}
            </label>
            {children}
            {error && (
                <span className="font-primary text-[12px] text-[var(--destructive)]">{error}</span>
            )}
        </div>
    );
}

function SaveButton({ processing, t }: { processing: boolean, t: any }) {
    return (
        <div className="flex justify-end border-t border-[var(--border)] px-5 py-4">
            <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] px-3.5 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
            >
                <Save size={14} />
                {processing ? t('common.saving') : t('common.saveChanges')}
            </button>
        </div>
    );
}

function IconSelect({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
            {ICON_NAMES.map((name) => (
                <option key={name} value={name}>
                    {name}
                </option>
            ))}
        </select>
    );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-3 py-2 font-primary text-[13px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
            <Plus size={14} />
            {label}
        </button>
    );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
        >
            <Trash2 size={14} />
        </button>
    );
}

// ===================== TAB: HERO =====================

function HeroTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        badge_text: content.hero.badge_text,
        headline_line1: content.hero.headline_line1,
        headline_line2: content.hero.headline_line2,
        highlight_word: content.hero.highlight_word,
        description: content.hero.description,
        primary_cta_text: content.hero.primary_cta_text,
        secondary_cta_text: content.hero.secondary_cta_text,
        voice_demo_enabled: content.hero.voice_demo_enabled ?? true,
        voice_demo_text: content.hero.voice_demo_text ?? 'Talk to our AI',
        trust_badges: content.hero.trust_badges as LandingPageTrustBadge[],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/hero');
    }

    function addBadge() {
        form.setData('trust_badges', [
            ...form.data.trust_badges,
            { icon: 'Shield', text: '' },
        ]);
    }

    function removeBadge(index: number) {
        form.setData(
            'trust_badges',
            form.data.trust_badges.filter((_, i) => i !== index),
        );
    }

    function updateBadge(index: number, field: keyof LandingPageTrustBadge, value: string) {
        const updated = [...form.data.trust_badges];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('trust_badges', updated);
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={Sparkles} title={t('editor.hero.sectionTitle')} description={t('editor.hero.sectionDescription')}>
                <div className="flex flex-col gap-5 p-5">
                    <FormField label={t('editor.hero.badgeText')} error={form.errors.badge_text}>
                        <input
                            type="text"
                            value={form.data.badge_text}
                            onChange={(e) => form.setData('badge_text', e.target.value)}
                            placeholder={t('editor.hero.badgeTextExample')}
                            className={inputClass}
                        />
                    </FormField>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField label={t('editor.hero.headlineLine1')} error={form.errors.headline_line1}>
                            <input
                                type="text"
                                value={form.data.headline_line1}
                                onChange={(e) => form.setData('headline_line1', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label={t('editor.hero.headlineLine2')} error={form.errors.headline_line2}>
                            <input
                                type="text"
                                value={form.data.headline_line2}
                                onChange={(e) => form.setData('headline_line2', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                    </div>

                    <FormField label={t('editor.hero.highlightWord')} error={form.errors.highlight_word}>
                        <input
                            type="text"
                            value={form.data.highlight_word}
                            onChange={(e) => form.setData('highlight_word', e.target.value)}
                            placeholder={t('editor.hero.highlightWordPlaceholder')}
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label={t("common.description")} error={form.errors.description}>
                        <textarea
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            rows={3}
                            className={textareaClass}
                        />
                    </FormField>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField label={t('editor.hero.primaryCtaText')} error={form.errors.primary_cta_text}>
                            <input
                                type="text"
                                value={form.data.primary_cta_text}
                                onChange={(e) => form.setData('primary_cta_text', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label={t('editor.hero.secondaryCtaText')} error={form.errors.secondary_cta_text}>
                            <input
                                type="text"
                                value={form.data.secondary_cta_text}
                                onChange={(e) => form.setData('secondary_cta_text', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                    </div>

                    {/* Live AI voice demo */}
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4">
                        <label className="flex items-center gap-2.5">
                            <input
                                type="checkbox"
                                checked={form.data.voice_demo_enabled}
                                onChange={(e) => form.setData('voice_demo_enabled', e.target.checked)}
                                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                            />
                            <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                Show a live “Talk to our AI” button in the hero
                            </span>
                        </label>
                        <p className="mt-1.5 ps-7 text-[12px] text-[var(--muted-foreground)]">
                            Lets visitors call your AI agent from the browser. Requires a Vapi public key and a provisioned assistant; otherwise the secondary button is shown instead.
                        </p>
                        <div className="mt-3 ps-7">
                            <FormField label={t('editor.hero.buttonLabel')} error={form.errors.voice_demo_text}>
                                <input
                                    type="text"
                                    value={form.data.voice_demo_text}
                                    onChange={(e) => form.setData('voice_demo_text', e.target.value)}
                                    className={inputClass}
                                />
                            </FormField>
                        </div>
                    </div>

                    {/* Trust Badges */}
                    <div className="flex flex-col gap-3">
                        <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                            Trust Badges
                        </label>
                        {form.data.trust_badges.map((badge, index) => (
                            <div key={index} className="flex items-center gap-3">
                                <div className="w-[160px] shrink-0">
                                    <IconSelect
                                        value={badge.icon}
                                        onChange={(v) => updateBadge(index, 'icon', v)}
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={badge.text}
                                    onChange={(e) => updateBadge(index, 'text', e.target.value)}
                                    placeholder={t('editor.hero.badgeTextPlaceholder')}
                                    className={`${inputClass} flex-1`}
                                />
                                <RemoveButton onClick={() => removeBadge(index)} />
                            </div>
                        ))}
                        <AddButton onClick={addBadge} label={t("hero.addBadge")} />
                    </div>
                </div>

                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

// ===================== TAB: FEATURES =====================

function FeaturesTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        label: content.features.label,
        heading: content.features.heading,
        description: content.features.description,
        items: content.features.items as LandingPageFeatureItem[],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/features');
    }

    function addItem() {
        form.setData('items', [
            ...form.data.items,
            { icon: 'Zap', title: '', description: '' },
        ]);
    }

    function removeItem(index: number) {
        form.setData(
            'items',
            form.data.items.filter((_, i) => i !== index),
        );
    }

    function updateItem(index: number, field: keyof LandingPageFeatureItem, value: string) {
        const updated = [...form.data.items];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('items', updated);
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={LayoutGrid} title={t('editor.features.sectionTitle')} description={t('editor.features.sectionDescription')}>
                <div className="flex flex-col gap-5 p-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField label={t("common.sectionLabel")} error={form.errors.label}>
                            <input
                                type="text"
                                value={form.data.label}
                                onChange={(e) => form.setData('label', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label={t("common.heading")} error={form.errors.heading}>
                            <input
                                type="text"
                                value={form.data.heading}
                                onChange={(e) => form.setData('heading', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                    </div>

                    <FormField label={t("common.description")} error={form.errors.description}>
                        <textarea
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            rows={2}
                            className={textareaClass}
                        />
                    </FormField>

                    {/* Feature Items */}
                    <div className="flex flex-col gap-4">
                        <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                            Feature Items
                        </label>
                        {form.data.items.map((item, index) => (
                            <div
                                key={index}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4"
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="font-mono text-[12px] font-semibold text-[var(--muted-foreground)]">
                                        Feature {index + 1}
                                    </span>
                                    <RemoveButton onClick={() => removeItem(index)} />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <FormField label={t('editor.common.icon')}>
                                            <IconSelect
                                                value={item.icon}
                                                onChange={(v) => updateItem(index, 'icon', v)}
                                            />
                                        </FormField>
                                        <FormField label={t('editor.common.title')}>
                                            <input
                                                type="text"
                                                value={item.title}
                                                onChange={(e) =>
                                                    updateItem(index, 'title', e.target.value)
                                                }
                                                className={inputClass}
                                            />
                                        </FormField>
                                    </div>
                                    <FormField label={t("common.description")}>
                                        <textarea
                                            value={item.description}
                                            onChange={(e) =>
                                                updateItem(index, 'description', e.target.value)
                                            }
                                            rows={2}
                                            className={textareaClass}
                                        />
                                    </FormField>
                                </div>
                            </div>
                        ))}
                        <AddButton onClick={addItem} label={t("features.addFeature")} />
                    </div>
                </div>

                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

// ===================== TAB: HOW IT WORKS =====================

function HowItWorksTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        label: content.how_it_works.label,
        heading: content.how_it_works.heading,
        steps: content.how_it_works.steps as LandingPageStep[],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/how_it_works');
    }

    function addStep() {
        form.setData('steps', [
            ...form.data.steps,
            { number: String(form.data.steps.length + 1), icon: 'Play', title: '', description: '' },
        ]);
    }

    function removeStep(index: number) {
        form.setData(
            'steps',
            form.data.steps.filter((_, i) => i !== index),
        );
    }

    function updateStep(index: number, field: keyof LandingPageStep, value: string) {
        const updated = [...form.data.steps];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('steps', updated);
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={ListOrdered} title={t('editor.howItWorks.sectionTitle')} description={t('editor.howItWorks.sectionDescription')}>
                <div className="flex flex-col gap-5 p-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField label={t("common.sectionLabel")} error={form.errors.label}>
                            <input
                                type="text"
                                value={form.data.label}
                                onChange={(e) => form.setData('label', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label={t("common.heading")} error={form.errors.heading}>
                            <input
                                type="text"
                                value={form.data.heading}
                                onChange={(e) => form.setData('heading', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                    </div>

                    {/* Steps */}
                    <div className="flex flex-col gap-4">
                        <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                            Steps
                        </label>
                        {form.data.steps.map((step, index) => (
                            <div
                                key={index}
                                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4"
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="font-mono text-[12px] font-semibold text-[var(--muted-foreground)]">
                                        Step {index + 1}
                                    </span>
                                    <RemoveButton onClick={() => removeStep(index)} />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <FormField label={t('editor.howItWorks.number')}>
                                            <input
                                                type="text"
                                                value={step.number}
                                                onChange={(e) =>
                                                    updateStep(index, 'number', e.target.value)
                                                }
                                                className={inputClass}
                                            />
                                        </FormField>
                                        <FormField label={t('editor.common.icon')}>
                                            <IconSelect
                                                value={step.icon}
                                                onChange={(v) => updateStep(index, 'icon', v)}
                                            />
                                        </FormField>
                                        <FormField label={t('editor.common.title')}>
                                            <input
                                                type="text"
                                                value={step.title}
                                                onChange={(e) =>
                                                    updateStep(index, 'title', e.target.value)
                                                }
                                                className={inputClass}
                                            />
                                        </FormField>
                                    </div>
                                    <FormField label={t("common.description")}>
                                        <textarea
                                            value={step.description}
                                            onChange={(e) =>
                                                updateStep(index, 'description', e.target.value)
                                            }
                                            rows={2}
                                            className={textareaClass}
                                        />
                                    </FormField>
                                </div>
                            </div>
                        ))}
                        <AddButton onClick={addStep} label={t("howItWorks.addStep")} />
                    </div>
                </div>

                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

// ===================== TAB: STATS =====================

function StatsTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        items: content.stats.items as LandingPageStatItem[],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/stats');
    }

    function addItem() {
        form.setData('items', [...form.data.items, { value: '', label: '' }]);
    }

    function removeItem(index: number) {
        form.setData(
            'items',
            form.data.items.filter((_, i) => i !== index),
        );
    }

    function updateItem(index: number, field: keyof LandingPageStatItem, value: string) {
        const updated = [...form.data.items];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('items', updated);
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={BarChart2} title={t('editor.stats.sectionTitle')} description={t('editor.stats.sectionDescription')}>
                <div className="flex flex-col gap-4 p-5">
                    <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                        Stat Items
                    </label>
                    {form.data.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div className="flex flex-1 gap-3">
                                <input
                                    type="text"
                                    value={item.value}
                                    onChange={(e) => updateItem(index, 'value', e.target.value)}
                                    placeholder="e.g. 98%"
                                    className={`${inputClass} w-[120px] shrink-0`}
                                />
                                <input
                                    type="text"
                                    value={item.label}
                                    onChange={(e) => updateItem(index, 'label', e.target.value)}
                                    placeholder={t('editor.stats.labelExample')}
                                    className={`${inputClass} flex-1`}
                                />
                            </div>
                            <RemoveButton onClick={() => removeItem(index)} />
                        </div>
                    ))}
                    <AddButton onClick={addItem} label={t("stats.addStat")} />
                </div>

                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

// ===================== TAB: PRICING =====================

function PricingTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        label: content.pricing.label,
        heading: content.pricing.heading,
        description: content.pricing.description,
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/pricing');
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={DollarSign} title={t('editor.pricing.sectionTitle')} description={t('editor.pricing.sectionDescription')}>
                <div className="flex flex-col gap-5 p-5">
                    <FormField label={t("common.sectionLabel")} error={form.errors.label}>
                        <input
                            type="text"
                            value={form.data.label}
                            onChange={(e) => form.setData('label', e.target.value)}
                            placeholder={t('editor.pricing.labelExample')}
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label={t("common.heading")} error={form.errors.heading}>
                        <input
                            type="text"
                            value={form.data.heading}
                            onChange={(e) => form.setData('heading', e.target.value)}
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label={t("common.description")} error={form.errors.description}>
                        <textarea
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            rows={3}
                            className={textareaClass}
                        />
                    </FormField>

                    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--background)] p-4">
                        <p className="text-xs text-[var(--muted-foreground)]">
                            Plan cards are pulled from{' '}
                            <a href="/admin/pricing" className="font-medium text-[var(--primary)] hover:underline">
                                Admin &rarr; Pricing
                            </a>
                            . Only active plans appear on the landing page.
                        </p>
                    </div>
                </div>

                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

// ===================== TAB: CTA =====================

function CtaTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        headline: content.cta.headline,
        description: content.cta.description,
        primary_button_text: content.cta.primary_button_text,
        secondary_button_text: content.cta.secondary_button_text,
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/cta');
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={Megaphone} title={t('editor.cta.sectionTitle')} description={t('editor.cta.sectionDescription')}>
                <div className="flex flex-col gap-5 p-5">
                    <FormField label={t('editor.cta.headline')} error={form.errors.headline}>
                        <input
                            type="text"
                            value={form.data.headline}
                            onChange={(e) => form.setData('headline', e.target.value)}
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label={t("common.description")} error={form.errors.description}>
                        <textarea
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            rows={3}
                            className={textareaClass}
                        />
                    </FormField>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField label={t('editor.cta.primaryButtonText')} error={form.errors.primary_button_text}>
                            <input
                                type="text"
                                value={form.data.primary_button_text}
                                onChange={(e) => form.setData('primary_button_text', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label={t('editor.cta.secondaryButtonText')} error={form.errors.secondary_button_text}>
                            <input
                                type="text"
                                value={form.data.secondary_button_text}
                                onChange={(e) => form.setData('secondary_button_text', e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                    </div>
                </div>

                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

// ===================== TAB: FOOTER =====================

function FooterTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        copyright_text: content.footer.copyright_text,
        social_links: content.footer.social_links as LandingPageSocialLink[],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/footer');
    }

    function addLink() {
        form.setData('social_links', [
            ...form.data.social_links,
            { platform: 'twitter', url: '' },
        ]);
    }

    function removeLink(index: number) {
        form.setData(
            'social_links',
            form.data.social_links.filter((_, i) => i !== index),
        );
    }

    function updateLink(index: number, field: keyof LandingPageSocialLink, value: string) {
        const updated = [...form.data.social_links];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('social_links', updated);
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={Globe} title={t('editor.footer.sectionTitle')} description={t('editor.footer.sectionDescription')}>
                <div className="flex flex-col gap-5 p-5">
                    <FormField label={t('editor.footer.copyrightText')} error={form.errors.copyright_text}>
                        <input
                            type="text"
                            value={form.data.copyright_text}
                            onChange={(e) => form.setData('copyright_text', e.target.value)}
                            className={inputClass}
                        />
                    </FormField>

                    {/* Social Links */}
                    <div className="flex flex-col gap-3">
                        <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                            Social Links
                        </label>
                        {form.data.social_links.map((link, index) => (
                            <div key={index} className="flex items-center gap-3">
                                <div className="w-[160px] shrink-0">
                                    <select
                                        value={link.platform}
                                        onChange={(e) => updateLink(index, 'platform', e.target.value)}
                                        className={selectClass}
                                    >
                                        {SOCIAL_PLATFORMS.map((p) => (
                                            <option key={p} value={p}>
                                                {p.charAt(0).toUpperCase() + p.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <input
                                    type="url"
                                    value={link.url}
                                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                                    placeholder={t('editor.footer.urlPlaceholder')}
                                    className={`${inputClass} flex-1`}
                                />
                                <RemoveButton onClick={() => removeLink(index)} />
                            </div>
                        ))}
                        <AddButton onClick={addLink} label={t('editor.footer.addSocialLink')} />
                    </div>
                </div>

                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

// ===================== TAB: WORKFLOWS =====================

function FlowEditor({
    title,
    cards,
    onChange,
}: {
    title: string;
    cards: LandingPageFlowCard[];
    onChange: (cards: LandingPageFlowCard[]) => void;
}) {
    function addCard() {
        onChange([
            ...cards,
            { type: 'conversation', icon: 'MessageSquare', title: '', content: '' },
        ]);
    }

    function removeCard(index: number) {
        onChange(cards.filter((_, i) => i !== index));
    }

    function updateCard(index: number, field: string, value: string) {
        const updated = [...cards];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    }

    return (
        <div className="flex flex-col gap-4">
            <label className="font-mono text-[12px] font-semibold text-[var(--foreground)]">
                {title}
            </label>
            {cards.map((card, index) => (
                <div
                    key={index}
                    className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4"
                >
                    <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono text-[12px] font-semibold text-[var(--muted-foreground)]">
                            Card {index + 1}
                        </span>
                        <RemoveButton onClick={() => removeCard(index)} />
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <FormField label={t('editor.common.type')}>
                                <select
                                    value={card.type}
                                    onChange={(e) => updateCard(index, 'type', e.target.value)}
                                    className={selectClass}
                                >
                                    {FLOW_CARD_TYPES.map((t) => (
                                        <option key={t} value={t}>
                                            {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                            <FormField label={t('editor.common.icon')}>
                                <IconSelect
                                    value={card.icon || 'MessageSquare'}
                                    onChange={(v) => updateCard(index, 'icon', v)}
                                />
                            </FormField>
                            <FormField label={t('editor.common.title')}>
                                <input
                                    type="text"
                                    value={card.title || ''}
                                    onChange={(e) => updateCard(index, 'title', e.target.value)}
                                    className={inputClass}
                                />
                            </FormField>
                        </div>

                        <FormField label={t('editor.common.content')}>
                            <textarea
                                value={card.content || ''}
                                onChange={(e) => updateCard(index, 'content', e.target.value)}
                                rows={2}
                                className={textareaClass}
                            />
                        </FormField>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <FormField label={t('editor.workflows.topLabelOptional')}>
                                <input
                                    type="text"
                                    value={card.top_label || ''}
                                    onChange={(e) => updateCard(index, 'top_label', e.target.value)}
                                    className={inputClass}
                                />
                            </FormField>
                            {card.type === 'badge' && (
                                <>
                                    <FormField label={t('editor.workflows.badgeText')}>
                                        <input
                                            type="text"
                                            value={card.text || ''}
                                            onChange={(e) => updateCard(index, 'text', e.target.value)}
                                            className={inputClass}
                                        />
                                    </FormField>
                                    <FormField label={t('editor.workflows.badgeColor')}>
                                        <input
                                            type="text"
                                            value={card.color || ''}
                                            onChange={(e) => updateCard(index, 'color', e.target.value)}
                                            placeholder={t('editor.workflows.badgeColorExample')}
                                            className={inputClass}
                                        />
                                    </FormField>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            <AddButton onClick={addCard} label={t('editor.workflows.addCard')} />
        </div>
    );
}

function WorkflowsTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        booking_flow: content.workflows.booking_flow as LandingPageFlowCard[],
        triage_flow: content.workflows.triage_flow as LandingPageFlowCard[],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/workflows');
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={Workflow} title={t('editor.workflows.sectionTitle')} description={t('editor.workflows.sectionDescription')}>
                <div className="flex flex-col gap-8 p-5">
                    <FlowEditor
                        title={t('editor.workflows.bookingFlow')}
                        cards={form.data.booking_flow}
                        onChange={(cards) => form.setData('booking_flow', cards)}
                    />

                    <div className="border-t border-[var(--border)]" />

                    <FlowEditor
                        title={t('editor.workflows.triageFlow')}
                        cards={form.data.triage_flow}
                        onChange={(cards) => form.setData('triage_flow', cards)}
                    />
                </div>

                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

// ===================== MAIN PAGE =====================

// ===================== TAB: SHOWCASE =====================

function ShowcaseTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        label: content.showcase.label,
        heading: content.showcase.heading,
        description: content.showcase.description,
        items: content.showcase.items as LandingPageShowcaseItem[],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/showcase');
    }

    function addItem() {
        form.setData('items', [...form.data.items, { title: '', description: '', image: '', bullets: [] }]);
    }

    function removeItem(index: number) {
        form.setData('items', form.data.items.filter((_, i) => i !== index));
    }

    function updateItem(index: number, field: 'title' | 'description' | 'image', value: string) {
        const updated = [...form.data.items];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('items', updated);
    }

    function updateBullets(index: number, value: string) {
        const updated = [...form.data.items];
        updated[index] = { ...updated[index], bullets: value.split('\n').map((b) => b.trim()).filter(Boolean) };
        form.setData('items', updated);
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={Image} title={t('editor.showcase.sectionTitle')} description={t('editor.showcase.sectionDescription')}>
                <div className="flex flex-col gap-5 p-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField label={t("common.sectionLabel")} error={form.errors.label}>
                            <input type="text" value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label={t("common.heading")} error={form.errors.heading}>
                            <input type="text" value={form.data.heading} onChange={(e) => form.setData('heading', e.target.value)} className={inputClass} />
                        </FormField>
                    </div>
                    <FormField label={t("common.description")} error={form.errors.description}>
                        <textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={2} className={textareaClass} />
                    </FormField>

                    <div className="flex flex-col gap-4">
                        <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">{t('editor.showcase.items')}</label>
                        {form.data.items.map((item, index) => (
                            <div key={index} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="font-mono text-[12px] font-semibold text-[var(--muted-foreground)]">Item {index + 1}</span>
                                    <RemoveButton onClick={() => removeItem(index)} />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <FormField label={t('editor.common.title')}>
                                        <input type="text" value={item.title} onChange={(e) => updateItem(index, 'title', e.target.value)} className={inputClass} />
                                    </FormField>
                                    <FormField label={t("common.description")}>
                                        <textarea value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} rows={2} className={textareaClass} />
                                    </FormField>
                                    <FormField label={t('editor.showcase.imageUrlLabel')}>
                                        <input type="text" value={item.image} onChange={(e) => updateItem(index, 'image', e.target.value)} placeholder={t('editor.showcase.imageUrlPlaceholder')} className={inputClass} />
                                    </FormField>
                                    <FormField label={t('editor.showcase.bullets')}>
                                        <textarea value={(item.bullets ?? []).join('\n')} onChange={(e) => updateBullets(index, e.target.value)} rows={3} className={textareaClass} />
                                    </FormField>
                                </div>
                            </div>
                        ))}
                        <AddButton onClick={addItem} label={t('editor.showcase.addItem')} />
                    </div>
                </div>
                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

// ===================== TAB: SECURITY =====================

function SecurityTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        label: content.security.label,
        heading: content.security.heading,
        description: content.security.description,
        items: content.security.items as LandingPageSecurityItem[],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/security');
    }

    function addItem() {
        form.setData('items', [...form.data.items, { icon: 'Shield', title: '', description: '' }]);
    }

    function removeItem(index: number) {
        form.setData('items', form.data.items.filter((_, i) => i !== index));
    }

    function updateItem(index: number, field: keyof LandingPageSecurityItem, value: string) {
        const updated = [...form.data.items];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('items', updated);
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={Lock} title={t('editor.security.sectionTitle')} description={t('editor.security.sectionDescription')}>
                <div className="flex flex-col gap-5 p-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField label={t("common.sectionLabel")} error={form.errors.label}>
                            <input type="text" value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label={t("common.heading")} error={form.errors.heading}>
                            <input type="text" value={form.data.heading} onChange={(e) => form.setData('heading', e.target.value)} className={inputClass} />
                        </FormField>
                    </div>
                    <FormField label={t("common.description")} error={form.errors.description}>
                        <textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={2} className={textareaClass} />
                    </FormField>

                    <div className="flex flex-col gap-4">
                        <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">{t('editor.security.items')}</label>
                        {form.data.items.map((item, index) => (
                            <div key={index} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="font-mono text-[12px] font-semibold text-[var(--muted-foreground)]">Item {index + 1}</span>
                                    <RemoveButton onClick={() => removeItem(index)} />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <FormField label={t('editor.common.icon')}>
                                            <IconSelect value={item.icon} onChange={(v) => updateItem(index, 'icon', v)} />
                                        </FormField>
                                        <FormField label={t('editor.common.title')}>
                                            <input type="text" value={item.title} onChange={(e) => updateItem(index, 'title', e.target.value)} className={inputClass} />
                                        </FormField>
                                    </div>
                                    <FormField label={t("common.description")}>
                                        <textarea value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} rows={2} className={textareaClass} />
                                    </FormField>
                                </div>
                            </div>
                        ))}
                        <AddButton onClick={addItem} label={t('editor.security.addItem')} />
                    </div>
                </div>
                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

// ===================== TAB: TESTIMONIALS =====================

function TestimonialsTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        label: content.testimonials.label,
        heading: content.testimonials.heading,
        description: content.testimonials.description,
        items: content.testimonials.items as LandingPageTestimonialItem[],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/testimonials');
    }

    function addItem() {
        form.setData('items', [...form.data.items, { quote: '', name: '', role: '' }]);
    }

    function removeItem(index: number) {
        form.setData('items', form.data.items.filter((_, i) => i !== index));
    }

    function updateItem(index: number, field: keyof LandingPageTestimonialItem, value: string) {
        const updated = [...form.data.items];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('items', updated);
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={Star} title={t('editor.testimonials.sectionTitle')} description={t('editor.testimonials.sectionDescription')}>
                <div className="flex flex-col gap-5 p-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField label={t("common.sectionLabel")} error={form.errors.label}>
                            <input type="text" value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label={t("common.heading")} error={form.errors.heading}>
                            <input type="text" value={form.data.heading} onChange={(e) => form.setData('heading', e.target.value)} className={inputClass} />
                        </FormField>
                    </div>
                    <FormField label={t("common.description")} error={form.errors.description}>
                        <textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={2} className={textareaClass} />
                    </FormField>

                    <div className="flex flex-col gap-4">
                        <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">{t('editor.testimonials.items')}</label>
                        {form.data.items.map((item, index) => (
                            <div key={index} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="font-mono text-[12px] font-semibold text-[var(--muted-foreground)]">Testimonial {index + 1}</span>
                                    <RemoveButton onClick={() => removeItem(index)} />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <FormField label={t('editor.testimonials.quote')}>
                                        <textarea value={item.quote} onChange={(e) => updateItem(index, 'quote', e.target.value)} rows={3} className={textareaClass} />
                                    </FormField>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <FormField label={t('editor.common.name')}>
                                            <input type="text" value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} className={inputClass} />
                                        </FormField>
                                        <FormField label={t('editor.testimonials.role')}>
                                            <input type="text" value={item.role} onChange={(e) => updateItem(index, 'role', e.target.value)} className={inputClass} />
                                        </FormField>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <AddButton onClick={addItem} label={t("testimonials.add")} />
                    </div>
                </div>
                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

// ===================== TAB: FAQ =====================

function FaqTab({ content }: { content: LandingPageContent }) {
    const { t } = useTranslation('landingPage');
    const form = useForm({
        label: content.faq.label,
        heading: content.faq.heading,
        description: content.faq.description,
        items: content.faq.items as LandingPageFaqItem[],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/landing-page/faq');
    }

    function addItem() {
        form.setData('items', [...form.data.items, { question: '', answer: '' }]);
    }

    function removeItem(index: number) {
        form.setData('items', form.data.items.filter((_, i) => i !== index));
    }

    function updateItem(index: number, field: keyof LandingPageFaqItem, value: string) {
        const updated = [...form.data.items];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('items', updated);
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={HelpCircle} title={t('editor.faq.sectionTitle')} description={t('editor.faq.sectionDescription')}>
                <div className="flex flex-col gap-5 p-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField label={t("common.sectionLabel")} error={form.errors.label}>
                            <input type="text" value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label={t("common.heading")} error={form.errors.heading}>
                            <input type="text" value={form.data.heading} onChange={(e) => form.setData('heading', e.target.value)} className={inputClass} />
                        </FormField>
                    </div>
                    <FormField label={t("common.description")} error={form.errors.description}>
                        <textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={2} className={textareaClass} />
                    </FormField>

                    <div className="flex flex-col gap-4">
                        <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">{t('editor.faq.questions')}</label>
                        {form.data.items.map((item, index) => (
                            <div key={index} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="font-mono text-[12px] font-semibold text-[var(--muted-foreground)]">Question {index + 1}</span>
                                    <RemoveButton onClick={() => removeItem(index)} />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <FormField label={t('editor.faq.question')}>
                                        <input type="text" value={item.question} onChange={(e) => updateItem(index, 'question', e.target.value)} className={inputClass} />
                                    </FormField>
                                    <FormField label={t('editor.faq.answer')}>
                                        <textarea value={item.answer} onChange={(e) => updateItem(index, 'answer', e.target.value)} rows={3} className={textareaClass} />
                                    </FormField>
                                </div>
                            </div>
                        ))}
                        <AddButton onClick={addItem} label={t('editor.faq.addQuestion')} />
                    </div>
                </div>
                <SaveButton processing={form.processing} t={t} />
            </SectionCard>
        </form>
    );
}

export default function LandingPage({ content }: LandingPageProps) {
    const { t } = useTranslation('landingPage');
    const cmsTabs = getCmsTabs(t);
    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return cmsTabs.some((tab) => tab.id === hash) ? hash : 'hero';
    });

    useEffect(() => {
        window.location.hash = activeTab;
    }, [activeTab]);

    function renderTabContent() {
        switch (activeTab) {
            case 'hero':
                return <HeroTab content={content} />;
            case 'features':
                return <FeaturesTab content={content} />;
            case 'showcase':
                return <ShowcaseTab content={content} />;
            case 'how-it-works':
                return <HowItWorksTab content={content} />;
            case 'security':
                return <SecurityTab content={content} />;
            case 'stats':
                return <StatsTab content={content} />;
            case 'pricing':
                return <PricingTab content={content} />;
            case 'testimonials':
                return <TestimonialsTab content={content} />;
            case 'faq':
                return <FaqTab content={content} />;
            case 'cta':
                return <CtaTab content={content} />;
            case 'footer':
                return <FooterTab content={content} />;
            case 'workflows':
                return <WorkflowsTab content={content} />;
            default:
                return null;
        }
    }

    return (
        <>
            <Head title={t('editor.pageTitle')} />
            <FlashMessage />
            <DashboardLayout
                title={t('editor.sidebarTitle')}
                subtitle={t('editor.sidebarSubtitle')}
            >
                {/* View Landing Page link */}
                <div className="mb-4 flex justify-end">
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-primary text-[13px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    >
                        <ExternalLink size={14} />
                        View Landing Page
                    </a>
                </div>

                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Tab Navigation */}
                    <div className="w-full shrink-0 lg:w-[240px]">
                        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-2">
                            <nav className="flex flex-col gap-0.5">
                                {cmsTabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-start transition-colors ${isActive
                                                ? 'bg-[var(--accent)] text-[var(--foreground)]'
                                                : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
                                                }`}
                                        >
                                            <Icon
                                                size={16}
                                                className={
                                                    isActive
                                                        ? 'text-[var(--primary)]'
                                                        : 'text-[var(--muted-foreground)]'
                                                }
                                            />
                                            <span className="font-primary text-[13px] font-medium">
                                                {tab.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex flex-1 flex-col gap-6">{renderTabContent()}</div>
                </div>
            </DashboardLayout>
        </>
    );
}
