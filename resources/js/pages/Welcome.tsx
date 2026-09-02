import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Headphones,
    Phone,
    Calendar,
    Stethoscope,
    Shield,
    BarChart2,
    BookOpen,
    ArrowRight,
    Menu,
    X,
    CheckCircle2,
    Settings,
    Wifi,
    Zap,
    CalendarCheck,
    PhoneForwarded,
    MessageSquare,
    PhoneOff,
    Pencil,
    Play,
    HelpCircle,
    AlertTriangle,
    Users,
    Lock,
    Globe,
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
    Check,
    LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SharedProps, LandingPageContent, LandingPageFlowCard, PlanConfiguration } from '@/types';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

/* ─── Icon lookup ─────────────────────────────────────────────────── */

const iconMap: Record<string, LucideIcon> = {
    Phone, Calendar, Stethoscope, Shield, BarChart2, BookOpen, Settings,
    Wifi, Zap, Headphones, MessageSquare, CalendarCheck, PhoneOff,
    PhoneForwarded, CheckCircle2, Play, AlertTriangle, Users, Lock,
    Globe, Star, Heart, Bell, Search, Mail, MapPin, Clock, FileText,
    Database, Server, HelpCircle, Pencil,
};

function getIcon(name: string): LucideIcon {
    return iconMap[name] ?? HelpCircle;
}

/* ─── Static ──────────────────────────────────────────────────────── */

function getNavLinks(t: any) {
    return [
        { label: t('nav.features'), href: '#features' },
        { label: t('nav.product'), href: '#showcase' },
        { label: t('nav.pricing'), href: '#pricing' },
        { label: t('nav.reviews'), href: '#testimonials' },
        { label: t('nav.faq'), href: '#faq' },
    ];
}

/* ─── Flow types ───────────────────────────────────────────────────── */

function getFlowConfig(t: any): Record<string, { label: string; color: string }> {
    return {
        start: { label: t('flow.start').toUpperCase(), color: '#22D3EE' },
        conversation: { label: t('flow.conversation').toUpperCase(), color: '#3B82F6' },
        tool: { label: t('flow.tool').toUpperCase(), color: '#A78BFA' },
        end_call: { label: t('flow.end_call').toUpperCase(), color: '#EF4444' },
        transfer: { label: t('flow.transfer').toUpperCase(), color: '#22C55E' },
    };
}

/* ─── Feature labels ──────────────────────────────────────────────── */

function getFeatureLabels(t: any): Record<string, string> {
    return {
        ai_calls: t('features.ai_calls'),
        appointment_booking: t('features.appointment_booking'),
        basic_analytics: t('features.basic_analytics'),
        advanced_analytics: t('features.advanced_analytics'),
        sms: t('features.sms'),
        integrations: t('features.integrations'),
        triage: t('features.triage'),
        campaigns: t('features.campaigns'),
        custom_workflows: t('features.custom_workflows'),
        priority_support: t('features.priority_support'),
    };
}

/* ─── Animation hooks ─────────────────────────────────────────────── */

function useInView(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);

    return { ref, visible };
}

function AnimatedItem({ delay = 0, visible, children }: { delay?: number; visible: boolean; children: React.ReactNode }) {
    return (
        <div
            className="transition-all duration-700 ease-out"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transitionDelay: `${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}

function SectionReveal({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
    const { ref, visible } = useInView(0.1);
    return (
        <section
            ref={ref}
            id={id}
            className={`transition-all duration-700 ease-out ${className}`}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(32px)',
            }}
        >
            {children}
        </section>
    );
}

/* ─── Components ───────────────────────────────────────────────────── */

function FeatureCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
    return (
        <div className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 transition-all duration-300 hover:border-[var(--primary)]/30 hover:bg-[var(--card-hover)]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                <Icon size={20} className="text-[var(--primary)]" />
            </div>
            <h3 className="font-mono text-[15px] font-semibold text-[var(--foreground)]">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{desc}</p>
        </div>
    );
}

function StepCard({ num, title, desc, icon: Icon }: { num: string; title: string; desc: string; icon: LucideIcon }) {
    return (
        <div className="relative flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10">
                <Icon size={24} className="text-[var(--primary)]" />
            </div>
            <span className="font-mono text-xs font-bold tracking-widest text-[var(--primary)]">{num}</span>
            <h3 className="mt-1 font-mono text-lg font-semibold text-[var(--foreground)]">{title}</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--muted-foreground)]">{desc}</p>
        </div>
    );
}

function FlowCard({ type, icon: Icon, title, content, topLabel }: { type: string; icon: LucideIcon; title: string; content: string; topLabel?: string }) {
    const { t } = useTranslation('welcome');
    const flowConfig = getFlowConfig(t);
    const cfg = flowConfig[type] ?? flowConfig.conversation;
    return (
        <div className="relative">
            {topLabel && (
                <div className="mb-2 flex items-center gap-1.5 ps-1">
                    <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-[3px] font-mono text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: cfg.color, color: '#0A0C10' }}
                    >
                        {type === 'start' && <Play size={8} fill="currentColor" />}
                        {topLabel}
                    </span>
                </div>
            )}
            <div
                className="relative rounded-xl border p-4 transition-all duration-300 hover:translate-y-[-1px]"
                style={{
                    borderColor: cfg.color + '28',
                    background: `linear-gradient(145deg, ${cfg.color}0A, ${cfg.color}03)`,
                    boxShadow: `0 0 30px ${cfg.color}08, 0 2px 8px rgba(0,0,0,0.3)`,
                }}
            >
                {/* Connection dot top */}
                <div
                    className="absolute -top-[5px] start-1/2 h-[10px] w-[10px] -translate-x-1/2 rounded-full border-[2px] animate-pulse"
                    style={{ borderColor: cfg.color + '50', background: 'var(--background)' }}
                />
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: cfg.color + '1A' }}
                        >
                            <Icon size={14} style={{ color: cfg.color }} />
                        </div>
                        <span className="font-mono text-[13px] font-bold text-[var(--foreground)]">{title}</span>
                    </div>
                    <span
                        className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-[0.15em]"
                        style={{ color: cfg.color + '90' }}
                    >
                        {cfg.label}
                    </span>
                </div>
                {/* Content */}
                <p className="mt-2.5 text-[12px] leading-[1.65] text-[var(--muted-foreground)]">{content}</p>
                {/* Connection dot bottom */}
                <div
                    className="absolute -bottom-[5px] start-1/2 h-[10px] w-[10px] -translate-x-1/2 rounded-full border-[2px] animate-pulse"
                    style={{ borderColor: cfg.color + '50', background: 'var(--background)' }}
                />
            </div>
        </div>
    );
}

function FlowBadge({ text, color = '#F59E0B' }: { text: string; color?: string }) {
    return (
        <div className="flex ps-4">
            <div
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-[3px]"
                style={{ background: color + '10', borderColor: color + '20' }}
            >
                <span className="text-[11px] font-medium" style={{ color }}>{text}</span>
                <Pencil size={9} style={{ color: color + '70' }} />
            </div>
        </div>
    );
}

function FlowLine({ color = '#22D3EE', visible = true, delay = 0 }: { color?: string; visible?: boolean; delay?: number }) {
    return (
        <div className="flex justify-center">
            <div
                className="w-px origin-top transition-all duration-500 ease-out"
                style={{
                    background: `linear-gradient(to bottom, ${color}35, ${color}10)`,
                    height: visible ? 28 : 0,
                    opacity: visible ? 1 : 0,
                    transitionDelay: `${delay}ms`,
                }}
            />
        </div>
    );
}

/* ─── Hero Center Content (shared between layouts) ─────────────────── */

function VoiceDemoButton({ publicKey, assistantId, label }: { publicKey: string; assistantId: string; label: string }) {
    const { t } = useTranslation('welcome');
    const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vapiRef = useRef<any>(null);

    useEffect(() => () => { try { vapiRef.current?.stop(); } catch { /* noop */ } }, []);

    const toggle = useCallback(async () => {
        if (status === 'active' || status === 'connecting') {
            try { vapiRef.current?.stop(); } catch { /* noop */ }
            setStatus('idle');
            return;
        }
        try {
            setStatus('connecting');
            const VapiSDK = await import('@vapi-ai/web');
            const Vapi = VapiSDK.default;
            const vapi = new Vapi(publicKey);
            vapiRef.current = vapi;
            vapi.on('call-start', () => setStatus('active'));
            vapi.on('call-end', () => setStatus('idle'));
            vapi.on('error', () => setStatus('error'));
            await vapi.start(assistantId);
        } catch {
            setStatus('error');
        }
    }, [status, publicKey, assistantId]);

    const text =
        status === 'active' ? t('voiceDemo.tapToEnd')
            : status === 'connecting' ? t('voiceDemo.connecting')
                : status === 'error' ? t('voiceDemo.micNeeded')
                    : label;

    return (
        <button
            type="button"
            onClick={toggle}
            className={`inline-flex h-12 items-center gap-2 rounded-xl border px-7 font-mono text-sm font-semibold transition-colors ${status === 'active'
                ? 'border-[var(--success)] text-[var(--success)]'
                : 'border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/5'
                }`}
        >
            {status === 'active' ? (
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
                </span>
            ) : (
                <Phone size={16} />
            )}
            {text}
        </button>
    );
}

function HeroContent({ isAuth, size = 'lg', hero, vapiPublicKey, demoAssistantId }: { isAuth: boolean; size?: 'lg' | 'sm'; hero: LandingPageContent['hero']; vapiPublicKey?: string | null; demoAssistantId?: string | null }) {
    const { t } = useTranslation('welcome');
    const isLg = size === 'lg';
    const showVoiceDemo = hero.voice_demo_enabled && !!vapiPublicKey && !!demoAssistantId;
    return (
        <>
            <div className={`mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-1.5`}>
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
                </span>
                <span className="font-mono text-xs font-medium text-[var(--primary)]">{hero.badge_text}</span>
            </div>

            <h1 className={`font-mono font-bold leading-tight tracking-tight ${isLg ? 'text-[44px] xl:text-[52px]' : 'text-3xl sm:text-5xl'}`}>
                {hero.headline_line1}
                <br />
                {hero.headline_line2}{' '}
                <span className="text-[var(--primary)]">{hero.highlight_word}</span>
            </h1>

            <p className={`mx-auto mt-6 max-w-lg leading-relaxed text-[var(--muted-foreground)] ${isLg ? 'text-[17px]' : 'text-base sm:text-lg'}`}>
                {hero.description}
            </p>

            <div className={`flex items-center gap-4 ${isLg ? 'mt-10' : 'mt-8 flex-col sm:flex-row'}`}>
                <Link
                    href={isAuth ? '/dashboard' : '/register'}
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--primary)] px-7 font-mono text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
                >
                    {isAuth ? t('auth.dashboard') : hero.primary_cta_text}
                    <ArrowRight size={16} />
                </Link>
                {showVoiceDemo ? (
                    <VoiceDemoButton publicKey={vapiPublicKey!} assistantId={demoAssistantId!} label={hero.voice_demo_text} />
                ) : (
                    <a
                        href="#features"
                        className="inline-flex h-12 items-center gap-2 rounded-xl border border-[var(--border)] px-7 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--card)]"
                    >
                        {hero.secondary_cta_text}
                    </a>
                )}
            </div>

            <div className={`flex flex-wrap items-center justify-center gap-6 ${isLg ? 'mt-10 gap-10' : 'mt-8'}`}>
                {hero.trust_badges.map(({ icon, text }) => {
                    const BadgeIcon = getIcon(icon);
                    return (
                        <div key={text} className="flex items-center gap-2 text-[var(--muted-foreground)]">
                            <BadgeIcon size={16} className="text-[var(--primary)]" />
                            <span className="text-sm">{text}</span>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

/* ─── Dynamic Workflow Renderer ────────────────────────────────────── */

function DynamicFlow({ cards, visible = true }: { cards: LandingPageFlowCard[]; visible?: boolean }) {
    const { t } = useTranslation('welcome');
    const flowConfig = getFlowConfig(t);
    const d = useCallback((step: number) => step * 180, []);
    const elements: React.ReactNode[] = [];
    let stepIndex = 0;

    cards.forEach((card, i) => {
        if (card.type === 'badge') {
            // Add line before badge
            if (i > 0) {
                const prevColor = cards[i - 1]?.type === 'badge'
                    ? (card.color ?? '#F59E0B')
                    : (flowConfig[cards[i - 1]?.type ?? 'conversation']?.color ?? '#3B82F6');
                elements.push(<FlowLine key={`line-pre-${i}`} color={prevColor} visible={visible} delay={d(stepIndex++)} />);
            }
            elements.push(
                <AnimatedItem key={`badge-${i}`} delay={d(stepIndex++)} visible={visible}>
                    <FlowBadge text={card.text ?? ''} color={card.color ?? '#F59E0B'} />
                </AnimatedItem>,
            );
        } else {
            // Add line between flow cards (not before the first)
            if (i > 0) {
                const cfg = flowConfig[card.type] ?? flowConfig.conversation;
                elements.push(<FlowLine key={`line-${i}`} color={cfg.color} visible={visible} delay={d(stepIndex++)} />);
            }
            const Icon = getIcon(card.icon ?? 'MessageSquare');
            elements.push(
                <AnimatedItem key={`card-${i}`} delay={d(stepIndex++)} visible={visible}>
                    <FlowCard
                        type={card.type}
                        icon={Icon}
                        title={card.title ?? ''}
                        content={card.content ?? ''}
                        topLabel={card.top_label}
                    />
                </AnimatedItem>,
            );
        }
    });

    return <>{elements}</>;
}

/* ─── Social icon SVGs ─────────────────────────────────────────────── */

const socialIcons: Record<string, React.ReactNode> = {
    twitter: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
    linkedin: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
    github: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>,
    facebook: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
    instagram: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>,
};

/* ─── Page ──────────────────────────────────────────────────────────── */

interface WelcomeProps {
    content: LandingPageContent;
    plans: PlanConfiguration[];
    vapiPublicKey?: string | null;
    demoAssistantId?: string | null;
}

export default function Welcome({ content, plans, vapiPublicKey, demoAssistantId }: WelcomeProps) {
    const { t } = useTranslation('welcome');
    const navLinks = getNavLinks(t);
    const featureLabels = getFeatureLabels(t);
    const { auth } = usePage<SharedProps>().props;
    const appName = (usePage().props as { appName?: string }).appName ?? 'Loara';
    const [mobileOpen, setMobileOpen] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const isAuth = !!auth?.user;

    const { hero, features, how_it_works, stats, pricing, cta, footer, workflows, showcase, security, testimonials, faq } = content;
    const heroProps = { vapiPublicKey, demoAssistantId };

    // Workflow animation observers
    const heroDesktop = useInView(0.1);
    const heroTablet = useInView(0.1);
    const heroMobile = useInView(0.1);

    return (
        <>
            <Head title="Intelligent Clinic Assistant" />

            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
                {/* ── Navbar ─────────────────────────────────────────── */}
                <nav className="sticky top-0 z-50 border-b border-[var(--border)]/50 bg-[var(--background)]/80 backdrop-blur-xl">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
                        <a href="/" className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]">
                                <Headphones size={16} className="text-[var(--primary-foreground)]" />
                            </div>
                            <span className="font-mono text-[15px] font-bold">{appName}</span>
                        </a>

                        <div className="hidden items-center gap-8 md:flex">
                            {navLinks.map((l) => (
                                <a key={l.label} href={l.href} className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">{l.label}</a>
                            ))}
                        </div>

                        <div className="hidden items-center gap-3 md:flex">
                            {isAuth ? (<>
                                <Link href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 font-mono text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90">
                                    {t('auth.dashboard')} <ArrowRight size={14} />

                                </Link>
                                <LanguageSwitcher />
                                <button
                                    onClick={() => router.post('/logout')}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--sidebar-text)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--destructive)]"
                                    title={t('clinic.signOut')}
                                >
                                    <LogOut size={14} />
                                </button>
                            </>
                            ) : (
                                <>
                                    <LanguageSwitcher />

                                    <Link href="/login" className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">{t('auth.signIn')}</Link>
                                    <Link href="/register" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 font-mono text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90">
                                        {t('auth.getStarted')} <ArrowRight size={14} />
                                    </Link>
                                </>
                            )}
                        </div>

                        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card)] md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>

                    {mobileOpen && (
                        <div className="border-t border-[var(--border)]/50 bg-[var(--background)] px-5 pb-4 pt-3 md:hidden">
                            <div className="flex flex-col gap-3">
                                {navLinks.map((l) => (
                                    <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">{l.label}</a>
                                ))}
                                <div className="mt-2 flex flex-col gap-2">
                                    {isAuth ? (
                                        <Link href="/dashboard" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 font-mono text-sm font-semibold text-[var(--primary-foreground)]">
                                            {t('auth.dashboard')} <ArrowRight size={14} />
                                        </Link>
                                    ) : (
                                        <>
                                            <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">{t('auth.signIn')}</Link>
                                            <Link href="/register" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 font-mono text-sm font-semibold text-[var(--primary-foreground)]">
                                                {t('auth.getStarted')} <ArrowRight size={14} />
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </nav>

                {/* ── Hero — Workflow Canvas ─────────────────────────── */}
                <section className="relative overflow-hidden">
                    {/* Background */}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute start-1/2 top-1/3 h-[700px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--primary)]/4 blur-[140px]" />
                        <div
                            className="absolute inset-0 opacity-[0.04]"
                            style={{
                                backgroundImage: 'radial-gradient(circle, var(--muted-foreground) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        />
                    </div>

                    {/* ── Desktop: 3-column grid (xl+) ── */}
                    <div
                        ref={heroDesktop.ref}
                        className="relative mx-auto hidden max-w-[1440px] gap-12 px-8 py-16 xl:grid"
                        style={{ gridTemplateColumns: '280px 1fr 280px' }}
                    >
                        <div className="flex flex-col gap-0.5 pt-8">
                            <DynamicFlow cards={workflows.booking_flow} visible={heroDesktop.visible} />
                        </div>
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <HeroContent isAuth={isAuth} size="lg" hero={hero} {...heroProps} />
                        </div>
                        <div className="flex flex-col gap-0.5 pt-3">
                            <DynamicFlow cards={workflows.triage_flow} visible={heroDesktop.visible} />
                        </div>
                    </div>

                    {/* ── Tablet: headline then 2-col flows (lg to xl) ── */}
                    <div ref={heroTablet.ref} className="relative mx-auto hidden max-w-5xl px-6 py-16 lg:block xl:hidden">
                        <div className="mb-14 text-center">
                            <HeroContent isAuth={isAuth} size="lg" hero={hero} {...heroProps} />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="flex flex-col gap-0.5">
                                <DynamicFlow cards={workflows.booking_flow} visible={heroTablet.visible} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <DynamicFlow cards={workflows.triage_flow} visible={heroTablet.visible} />
                            </div>
                        </div>
                    </div>

                    {/* ── Mobile (< lg) ── */}
                    <div ref={heroMobile.ref} className="relative mx-auto max-w-2xl px-5 py-16 lg:hidden">
                        <div className="mb-12 text-center">
                            <HeroContent isAuth={isAuth} size="sm" hero={hero} {...heroProps} />
                        </div>
                        <div className="grid gap-8 sm:grid-cols-2">
                            <div className="flex flex-col gap-0.5">
                                <DynamicFlow cards={workflows.booking_flow} visible={heroMobile.visible} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <DynamicFlow cards={workflows.triage_flow} visible={heroMobile.visible} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Features ───────────────────────────────────────── */}
                <SectionReveal id="features" className="border-t border-[var(--border)]/50 py-24">
                    <div className="mx-auto max-w-6xl px-5">
                        <div className="mb-14 text-center">
                            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--primary)]">{features.label}</span>
                            <h2 className="mt-3 font-mono text-3xl font-bold sm:text-4xl">{features.heading}</h2>
                            <p className="mx-auto mt-4 max-w-xl text-[var(--muted-foreground)]">{features.description}</p>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {features.items.map((f) => (
                                <FeatureCard key={f.title} icon={getIcon(f.icon)} title={f.title} desc={f.description} />
                            ))}
                        </div>
                    </div>
                </SectionReveal>

                {/* ── Showcase ───────────────────────────────────────── */}
                <SectionReveal id="showcase" className="border-t border-[var(--border)]/50 py-24">
                    <div className="mx-auto max-w-6xl px-5">
                        <div className="mb-14 text-center">
                            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--primary)]">{showcase.label}</span>
                            <h2 className="mt-3 font-mono text-3xl font-bold sm:text-4xl">{showcase.heading}</h2>
                            <p className="mx-auto mt-4 max-w-xl text-[var(--muted-foreground)]">{showcase.description}</p>
                        </div>
                        <div className="flex flex-col gap-16">
                            {showcase.items.map((item, i) => (
                                <div key={item.title} className={`grid items-center gap-8 md:grid-cols-2 ${i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''}`}>
                                    <div>
                                        <h3 className="font-mono text-xl font-bold sm:text-2xl">{item.title}</h3>
                                        <p className="mt-3 text-[var(--muted-foreground)]">{item.description}</p>
                                        {item.bullets?.length > 0 && (
                                            <ul className="mt-5 flex flex-col gap-2.5">
                                                {item.bullets.map((b) => (
                                                    <li key={b} className="flex items-center gap-2.5 text-sm text-[var(--foreground)]">
                                                        <Check size={16} className="shrink-0 text-[var(--primary)]" /> {b}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                                        {item.image ? (
                                            <img src={item.image} alt={item.title} className="w-full" loading="lazy" />
                                        ) : (
                                            <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[var(--primary)]/5 to-transparent">
                                                <div className="flex flex-col items-center gap-2 text-[var(--muted-foreground)]">
                                                    <BarChart2 size={28} className="text-[var(--primary)]/40" />
                                                    <span className="font-mono text-xs">{item.title}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </SectionReveal>

                {/* ── How It Works ───────────────────────────────────── */}
                <SectionReveal id="how-it-works" className="border-t border-[var(--border)]/50 py-24">
                    <div className="mx-auto max-w-5xl px-5">
                        <div className="mb-14 text-center">
                            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--primary)]">{how_it_works.label}</span>
                            <h2 className="mt-3 font-mono text-3xl font-bold sm:text-4xl">{how_it_works.heading}</h2>
                        </div>
                        <div className="relative grid gap-12 md:grid-cols-3 md:gap-8">
                            <div className="pointer-events-none absolute start-0 end-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent md:block" />
                            {how_it_works.steps.map((s) => (
                                <StepCard key={s.number} num={s.number} icon={getIcon(s.icon)} title={s.title} desc={s.description} />
                            ))}
                        </div>
                    </div>
                </SectionReveal>

                {/* ── Stats ──────────────────────────────────────────── */}
                <SectionReveal id="stats" className="border-t border-[var(--border)]/50 py-24">
                    <div className="mx-auto max-w-5xl px-5">
                        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
                            {stats.items.map((s) => (
                                <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
                                    <div className="font-mono text-3xl font-bold text-[var(--primary)] sm:text-4xl">{s.value}</div>
                                    <div className="mt-1 text-sm text-[var(--muted-foreground)]">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </SectionReveal>

                {/* ── Security & Compliance ──────────────────────────── */}
                <SectionReveal id="security" className="border-t border-[var(--border)]/50 py-24">
                    <div className="mx-auto max-w-6xl px-5">
                        <div className="mb-14 text-center">
                            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--primary)]">{security.label}</span>
                            <h2 className="mt-3 font-mono text-3xl font-bold sm:text-4xl">{security.heading}</h2>
                            <p className="mx-auto mt-4 max-w-xl text-[var(--muted-foreground)]">{security.description}</p>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {security.items.map((item) => {
                                const Icon = getIcon(item.icon);
                                return (
                                    <div key={item.title} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                                            <Icon size={18} className="text-[var(--primary)]" />
                                        </div>
                                        <h3 className="font-mono text-sm font-bold">{item.title}</h3>
                                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </SectionReveal>

                {/* ── Pricing ────────────────────────────────────────── */}
                {/* {plans.length > 0 && (
                    <SectionReveal id="pricing" className="border-t border-[var(--border)]/50 py-24">
                        <div className="mx-auto max-w-6xl px-5">
                            <div className="mb-14 text-center">
                                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--primary)]">{pricing.label}</span>
                                <h2 className="mt-3 font-mono text-3xl font-bold sm:text-4xl">{pricing.heading}</h2>
                                <p className="mx-auto mt-4 max-w-xl text-[var(--muted-foreground)]">{pricing.description}</p>

                                {/* Billing toggle 
                                <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card)] p-1">
                                    <button
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`rounded-full px-5 py-2 font-mono text-sm font-medium transition-all ${billingCycle === 'monthly'
                                            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                                            }`}
                                    >
                                        {t('pricing.monthly')}
                                    </button>
                                    <button
                                        onClick={() => setBillingCycle('yearly')}
                                        className={`rounded-full px-5 py-2 font-mono text-sm font-medium transition-all ${billingCycle === 'yearly'
                                            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                                            }`}
                                    >
                                        {t('pricing.yearly')}
                                        <span className="ms-1.5 text-[10px] font-bold text-[var(--success)]">{t('pricing.save20')}</span>
                                    </button>
                                </div>
                            </div>

                            <div className={`grid gap-6 ${plans.length <= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} sm:grid-cols-2`}>
                                {plans.map((plan, index) => {
                                    const isPopular = index === 1 && plans.length > 1;
                                    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
                                    const monthlyEquivalent = billingCycle === 'yearly' ? (Number(plan.price_yearly) / 12).toFixed(0) : null;

                                    return (
                                        <div
                                            key={plan.slug}
                                            className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${isPopular
                                                ? 'border-[var(--primary)]/40 bg-[var(--card)] shadow-lg shadow-[var(--primary)]/5'
                                                : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/20'
                                                }`}
                                        >
                                            {isPopular && (
                                                <div className="absolute -top-3 start-1/2 -translate-x-1/2">
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--primary-foreground)]">
                                                        <Star size={10} fill="currentColor" /> {t('pricing.mostPopular')}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="mb-4">
                                                <h3 className="font-mono text-lg font-bold text-[var(--foreground)]">{plan.name}</h3>
                                                {plan.description && (
                                                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{plan.description}</p>
                                                )}
                                            </div>

                                            <div className="mb-6">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="font-mono text-4xl font-bold text-[var(--foreground)]">
                                                        ${billingCycle === 'yearly' ? monthlyEquivalent : Number(price).toFixed(0)}
                                                    </span>
                                                    <span className="text-sm text-[var(--muted-foreground)]">{t('pricing.perMonth')}</span>
                                                </div>
                                                {billingCycle === 'yearly' && (
                                                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                                        {t('pricing.billedYearly', { price: Number(price).toFixed(0) })}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mb-6 space-y-2 border-t border-[var(--border)] pt-4 text-sm">
                                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                                    <Check size={14} className="shrink-0 text-[var(--primary)]" />
                                                    <span>{plan.minutes_limit === -1 ? t('pricing.unlimited') : plan.minutes_limit.toLocaleString()} {t('pricing.aiMinutes')}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                                    <Check size={14} className="shrink-0 text-[var(--primary)]" />
                                                    <span>{plan.concurrent_limit === -1 ? t('pricing.unlimited') : plan.concurrent_limit} {plan.concurrent_limit !== 1 ? t('pricing.concurrentCalls') : t('pricing.concurrentCall')}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                                    <Check size={14} className="shrink-0 text-[var(--primary)]" />
                                                    <span>{plan.team_member_limit === -1 ? t('pricing.unlimited') : plan.team_member_limit} {plan.team_member_limit !== 1 ? t('pricing.teamMembers') : t('pricing.teamMember')}</span>
                                                </div>
                                                {plan.features.map((feature) => (
                                                    <div key={feature} className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                                        <Check size={14} className="shrink-0 text-[var(--primary)]" />
                                                        <span>{featureLabels[feature] ?? feature.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-auto">
                                                <Link
                                                    href="/register"
                                                    className={`flex h-11 w-full items-center justify-center rounded-xl font-mono text-sm font-semibold transition-all ${isPopular
                                                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90'
                                                        : 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)]'
                                                        }`}
                                                >
                                                    {t('pricing.getStarted')}
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </SectionReveal>
                )} */}

                {/* ── Testimonials ───────────────────────────────────── */}
                <SectionReveal id="testimonials" className="border-t border-[var(--border)]/50 py-24">
                    <div className="mx-auto max-w-6xl px-5">
                        <div className="mb-14 text-center">
                            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--primary)]">{testimonials.label}</span>
                            <h2 className="mt-3 font-mono text-3xl font-bold sm:text-4xl">{testimonials.heading}</h2>
                            <p className="mx-auto mt-4 max-w-xl text-[var(--muted-foreground)]">{testimonials.description}</p>
                        </div>
                        <div className="grid gap-5 md:grid-cols-3">
                            {testimonials.items.map((t) => (
                                <figure key={t.name} className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                                    <div className="mb-3 flex gap-0.5">
                                        {[0, 1, 2, 3, 4].map((s) => (
                                            <Star key={s} size={14} className="text-[var(--primary)]" fill="currentColor" />
                                        ))}
                                    </div>
                                    <blockquote className="flex-1 text-[15px] leading-relaxed text-[var(--foreground)]">“{t.quote}”</blockquote>
                                    <figcaption className="mt-5 border-t border-[var(--border)] pt-4">
                                        <div className="font-mono text-sm font-bold">{t.name}</div>
                                        <div className="text-xs text-[var(--muted-foreground)]">{t.role}</div>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    </div>
                </SectionReveal>

                {/* ── FAQ ────────────────────────────────────────────── */}
                <SectionReveal id="faq" className="border-t border-[var(--border)]/50 py-24">
                    <div className="mx-auto max-w-3xl px-5">
                        <div className="mb-12 text-center">
                            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--primary)]">{faq.label}</span>
                            <h2 className="mt-3 font-mono text-3xl font-bold sm:text-4xl">{faq.heading}</h2>
                            <p className="mx-auto mt-4 max-w-xl text-[var(--muted-foreground)]">{faq.description}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            {faq.items.map((item, i) => {
                                const isOpen = openFaq === i;
                                return (
                                    <div key={item.question} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaq(isOpen ? null : i)}
                                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                                            aria-expanded={isOpen}
                                        >
                                            <span className="font-mono text-sm font-semibold text-[var(--foreground)]">{item.question}</span>
                                            <ArrowRight size={16} className={`shrink-0 text-[var(--muted-foreground)] transition-transform ${isOpen ? 'rotate-90 text-[var(--primary)]' : ''}`} />
                                        </button>
                                        {isOpen && (
                                            <div className="border-t border-[var(--border)] px-5 py-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
                                                {item.answer}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </SectionReveal>

                {/* ── CTA ────────────────────────────────────────────── */}
                <SectionReveal className="border-t border-[var(--border)]/50 py-24">
                    <div className="mx-auto max-w-3xl px-5">
                        <div className="relative overflow-hidden rounded-2xl border border-[var(--primary)]/20 bg-[var(--card)] p-10 text-center sm:p-14">
                            <div className="pointer-events-none absolute start-1/2 top-0 h-40 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--primary)]/10 blur-[80px]" />
                            <h2 className="relative font-mono text-2xl font-bold sm:text-3xl">{cta.headline}</h2>
                            <p className="relative mt-4 text-[var(--muted-foreground)]">{cta.description}</p>
                            <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--primary)] px-7 font-mono text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90">
                                    {cta.primary_button_text} <ArrowRight size={16} />
                                </Link>
                                <a href="#features" className="inline-flex h-12 items-center gap-2 rounded-xl border border-[var(--border)] px-7 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--card-hover)]">
                                    {cta.secondary_button_text}
                                </a>
                            </div>
                        </div>
                    </div>
                </SectionReveal>

                {/* ── Footer ─────────────────────────────────────────── */}
                <footer className="relative overflow-hidden border-t border-[var(--border)]/50">
                    { }
                    <div className="pointer-events-none select-none overflow-hidden" aria-hidden="true">
                        <div className="flex items-center justify-center px-4 pt-20 pb-8 sm:pt-24 md:pt-28">
                            <pre
                                className="font-mono leading-none"
                                style={{
                                    color: 'var(--muted-foreground)',
                                    opacity: 0.2,
                                    fontSize: 'clamp(6px, 1.1vw, 14px)',
                                    letterSpacing: '0.15em',
                                }}
                            >{`##     ##  ####  #######    #######         ######    ####
##     ##   ##   ##     ##  ##     ##       ##    ##    ##
##     ##   ##   ##     ##  ##     ##       ##    ##    ##
#########   ##   #######    ##     ##       ########    ##
##     ##   ##   ##   ##    ##     ##       ##    ##    ##
##     ##   ##   ##    ##   ##     ##       ##    ##    ##
##     ##  ####  ##     ##  #######    ##   ##    ##   ####`}</pre>
                        </div>
                    </div>

                    {/* Footer Bar */}
                    <div className="relative mx-auto flex max-w-[1400px] items-center justify-between px-8 pb-8 pt-2">
                        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                            &copy; {new Date().getFullYear()} {footer.copyright_text}
                        </span>
                        <div className="flex items-center gap-4">
                            {footer.social_links.map((link) => (
                                <a key={link.platform} href={link.url} className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]" aria-label={link.platform}>
                                    {socialIcons[link.platform] ?? socialIcons.twitter}
                                </a>
                            ))}
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
