import { Head, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Save,
    Building2,
    Bot,
    Users,
    Bell,
    ShieldCheck,
    Clock,
    Mic,
    Volume2,
    MessageSquare,
    Plus,
    Pencil,
    Trash2,
    BellRing,
    Moon,
    Key,
    ScrollText,
    Lock,
    Shield,
    Download,
    CheckCircle2,
    AlertCircle,
    Phone,
    PhoneCall,
    PhoneOff,
    Loader2,
    XCircle,
    FileText,
    Upload,
    File,
    ChevronDown,
    Copy,
    Cpu,
    AudioLines,
    Sparkles,
    Send,
    RotateCcw,
    MessageCircle,
    X,
    Radio,
    Import,
    Server,
    ArrowLeft,
    Eye,
    EyeOff,
    GitBranch,
    Mail,
    ImageIcon,
    Palette,
    Globe,
    Zap,
    CreditCard,
    Check,
    Circle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { FlashMessage } from '@/components/FlashMessage';
import type {
    Clinic,
    VapiConfiguration,
    User,
    NotificationSetting,
    ClinicReminderSetting,
    AuditLog,
    KnowledgeBaseFile,
    GatewayConfiguration,
} from '@/types';

interface SettingsProps {
    clinic: Clinic | null;
    vapiConfiguration: VapiConfiguration | null;
    vapiKeyConfigured: boolean;
    vapiPublicKey: string;
    knowledgeBaseFiles: KnowledgeBaseFile[];
    teamMembers: User[];
    notificationSetting: NotificationSetting | null;
    reminderSetting: ClinicReminderSetting | null;
    auditLogs: AuditLog[];
}

interface SettingsTab {
    id: string;
    label: string;
    icon: React.ElementType;
}

function useBaseTabs(): SettingsTab[] {
    const { t } = useTranslation('settings');
    return [
        { id: 'general', label: t('tabs.general'), icon: Building2 },
        { id: 'ai-assistant', label: t('tabs.aiAssistant'), icon: Mic },
        { id: 'user-access', label: t('tabs.userAccess'), icon: Users },
        { id: 'notifications', label: t('tabs.notifications'), icon: Bell },
        { id: 'security', label: t('tabs.security'), icon: ShieldCheck },
    ];
}

function useDayNames(): string[] {
    const { t } = useTranslation('settings');
    return [
        t('days.sunday'), t('days.monday'), t('days.tuesday'), t('days.wednesday'),
        t('days.thursday'), t('days.friday'), t('days.saturday'),
    ];
}

const defaultHours = Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    open_time: i >= 1 && i <= 5 ? '08:00' : i === 6 ? '09:00' : '00:00',
    close_time: i >= 1 && i <= 4 ? '18:00' : i === 5 ? '17:00' : i === 6 ? '13:00' : '00:00',
    is_closed: i === 0,
}));

function formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${enabled ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
                }`}
        >
            <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    );
}

function SectionCard({ icon: Icon, title, subtitle, children }: { icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-4">
                <Icon size={16} className="text-[var(--primary)]" />
                <div className="flex flex-col gap-0.5">
                    <h2 className="font-mono text-sm font-semibold text-[var(--foreground)]">{title}</h2>
                    {subtitle && <p className="font-primary text-[11px] text-[var(--muted-foreground)]">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">{label}</label>
            {children}
            {error && <span className="font-primary text-[12px] text-[var(--destructive)]">{error}</span>}
        </div>
    );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between px-5 py-4">
            <div className="flex flex-col gap-0.5">
                <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">{label}</span>
                <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{description}</span>
            </div>
            {children}
        </div>
    );
}

function SaveButton({ processing, label }: { processing: boolean; label?: string }) {
    const { t } = useTranslation('settings');
    const defaultLabel = t('saveButtons.saveChanges');
    return (
        <div className="flex justify-end border-t border-[var(--border)] px-5 py-4">
            <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] px-3.5 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
            >
                <Save size={14} />
                {processing ? t('common.saving') : (label ?? defaultLabel)}
            </button>
        </div>
    );
}

// ===================== BRANDING CARD =====================

function BrandingCard({ clinic }: { clinic: Clinic }) {
    const logoInput = useRef<HTMLInputElement>(null);
    const faviconInput = useRef<HTMLInputElement>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [faviconUploading, setFaviconUploading] = useState(false);

    function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        router.post('/settings/clinic/logo', { logo: file }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setLogoUploading(false),
        });
    }

    function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setFaviconUploading(true);
        router.post('/settings/clinic/favicon', { favicon: file }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setFaviconUploading(false),
        });
    }

    function removeLogo() {
        router.delete('/settings/clinic/logo', { preserveScroll: true });
    }

    function removeFavicon() {
        router.delete('/settings/clinic/favicon', { preserveScroll: true });
    }

    const { t } = useTranslation('settings');
    return (
        <SectionCard icon={Palette} title={t('branding.title')} subtitle={t('branding.subtitle')}>
            <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2">
                {/* Logo */}
                <div className="flex flex-col gap-3">
                    <label className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t('branding.clinicLogo')}</label>
                    <div className="flex items-center gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--secondary)]">
                            {clinic.logo_url ? (
                                <img src={`/storage/${clinic.logo_url}`} alt={t('branding.logoAlt')} className="h-full w-full object-contain p-1" />
                            ) : (
                                <ImageIcon size={24} className="text-[var(--muted-foreground)]" />
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <input ref={logoInput} type="file" accept="image/jpeg,image/png,image/svg+xml,image/webp" onChange={handleLogoUpload} className="hidden" />
                            <button
                                type="button"
                                onClick={() => logoInput.current?.click()}
                                disabled={logoUploading}
                                className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-1.5 font-primary text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] disabled:opacity-50"
                            >
                                {logoUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                {clinic.logo_url ? t('common.change') : t('common.upload')}
                            </button>
                            {clinic.logo_url && (
                                <button type="button" onClick={removeLogo} className="flex items-center gap-1.5 font-primary text-[11px] text-[var(--destructive)] hover:underline">
                                    <Trash2 size={11} /> {t('common.remove')}
                                </button>
                            )}
                            <span className="font-primary text-[10px] text-[var(--muted-foreground)]">{t('branding.logoHint')}</span>
                        </div>
                    </div>
                </div>

                {/* Favicon */}
                <div className="flex flex-col gap-3">
                    <label className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t('branding.favicon')}</label>
                    <div className="flex items-center gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--secondary)]">
                            {clinic.favicon_url ? (
                                <img src={`/storage/${clinic.favicon_url}`} alt={t('branding.faviconAlt')} className="h-10 w-10 object-contain" />
                            ) : (
                                <Globe size={24} className="text-[var(--muted-foreground)]" />
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <input ref={faviconInput} type="file" accept="image/x-icon,image/png,image/svg+xml" onChange={handleFaviconUpload} className="hidden" />
                            <button
                                type="button"
                                onClick={() => faviconInput.current?.click()}
                                disabled={faviconUploading}
                                className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-1.5 font-primary text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)] disabled:opacity-50"
                            >
                                {faviconUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                {clinic.favicon_url ? t('common.change') : t('common.upload')}
                            </button>
                            {clinic.favicon_url && (
                                <button type="button" onClick={removeFavicon} className="flex items-center gap-1.5 font-primary text-[11px] text-[var(--destructive)] hover:underline">
                                    <Trash2 size={11} /> {t('common.remove')}
                                </button>
                            )}
                            <span className="font-primary text-[10px] text-[var(--muted-foreground)]">{t('branding.faviconHint')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}

const inputClass = 'h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]';
const selectClass = 'h-10 appearance-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]';

// ===================== TAB: GENERAL =====================

function GeneralTab({ clinic }: { clinic: Clinic }) {
    const { t } = useTranslation('settings');
    const clinicForm = useForm({
        name: clinic.name,
        phone: clinic.phone,
        email: clinic.email,
        address: clinic.address ?? '',
        city: clinic.city ?? '',
        state: clinic.state ?? '',
        zip_code: clinic.zip_code ?? '',
        timezone: clinic.timezone,
        website: clinic.website ?? '',
        after_hours_ai_enabled: clinic.after_hours_ai_enabled,
    });

    const existingHours = clinic.operating_hours && clinic.operating_hours?.length === 7
        ? [...clinic.operating_hours].sort((a, b) => a.day_of_week - b.day_of_week).map(h => ({
            day_of_week: h.day_of_week,
            open_time: h.open_time?.substring(0, 5) ?? '08:00',
            close_time: h.close_time?.substring(0, 5) ?? '17:00',
            is_closed: h.is_closed,
        }))
        : defaultHours;

    const hoursForm = useForm({
        hours: existingHours,
    });

    function handleClinicSubmit(e: FormEvent) {
        e.preventDefault();
        clinicForm.put('/settings/clinic');
    }

    function handleHoursSubmit(e: FormEvent) {
        e.preventDefault();
        hoursForm.put('/settings/operating-hours');
    }

    function updateHour(index: number, field: string, value: string | boolean) {
        const updated = [...hoursForm.data.hours];
        updated[index] = { ...updated[index], [field]: value };
        hoursForm.setData('hours', updated);
    }

    const dayNames = useDayNames();
    // Sort for display: Mon-Sat, then Sunday
    const displayOrder = [1, 2, 3, 4, 5, 6, 0];
    const sortedHoursForDisplay = displayOrder.map(d => {
        const idx = hoursForm.data.hours.findIndex(h => h.day_of_week === d);
        return { hour: hoursForm.data.hours[idx], index: idx };
    });

    return (
        <>
            <BrandingCard clinic={clinic} />

            <form onSubmit={handleClinicSubmit}>
                <SectionCard icon={Building2} title={t('general.clinicInformation')}>
                    <div className="flex flex-col gap-5 p-5">
                        <FormField label={t('general.clinicName')} error={clinicForm.errors.name}>
                            <input type="text" value={clinicForm.data.name} onChange={e => clinicForm.setData('name', e.target.value)} className={inputClass} />
                        </FormField>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <FormField label={t('general.phoneNumber')} error={clinicForm.errors.phone}>
                                <input type="text" value={clinicForm.data.phone} onChange={e => clinicForm.setData('phone', e.target.value)} className={inputClass} />
                            </FormField>
                            <FormField label={t('general.email')} error={clinicForm.errors.email}>
                                <input type="email" value={clinicForm.data.email} onChange={e => clinicForm.setData('email', e.target.value)} className={inputClass} />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <FormField label={t('general.address')} error={clinicForm.errors.address}>
                                <input type="text" value={clinicForm.data.address} onChange={e => clinicForm.setData('address', e.target.value)} className={inputClass} />
                            </FormField>
                            <FormField label={t('general.city')} error={clinicForm.errors.city}>
                                <input type="text" value={clinicForm.data.city} onChange={e => clinicForm.setData('city', e.target.value)} className={inputClass} />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                            <FormField label={t('general.state')} error={clinicForm.errors.state}>
                                <input type="text" value={clinicForm.data.state} onChange={e => clinicForm.setData('state', e.target.value)} className={inputClass} maxLength={2} />
                            </FormField>
                            <FormField label={t('general.zipCode')} error={clinicForm.errors.zip_code}>
                                <input type="text" value={clinicForm.data.zip_code} onChange={e => clinicForm.setData('zip_code', e.target.value)} className={inputClass} maxLength={10} />
                            </FormField>
                            <FormField label={t('general.timezone')} error={clinicForm.errors.timezone}>
                                <select value={clinicForm.data.timezone} onChange={e => clinicForm.setData('timezone', e.target.value)} className={selectClass}>
                                    <option value="America/New_York">{t('general.timezones.eastern')}</option>
                                    <option value="America/Chicago">{t('general.timezones.central')}</option>
                                    <option value="America/Denver">{t('general.timezones.mountain')}</option>
                                    <option value="America/Los_Angeles">{t('general.timezones.pacific')}</option>
                                    <option value="America/Anchorage">{t('general.timezones.alaska')}</option>
                                    <option value="Pacific/Honolulu">{t('general.timezones.hawaii')}</option>
                                </select>
                            </FormField>
                        </div>
                        <FormField label={t('general.website')} error={clinicForm.errors.website}>
                            <input type="url" value={clinicForm.data.website} onChange={e => clinicForm.setData('website', e.target.value)} className={inputClass} placeholder={t('general.websitePlaceholder')} />
                        </FormField>
                    </div>
                    <div className="border-t border-[var(--border)] px-5 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">{t('general.afterHoursAI')}</span>
                                <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('general.afterHoursAIDesc')}</span>
                            </div>
                            <ToggleSwitch enabled={clinicForm.data.after_hours_ai_enabled} onToggle={() => clinicForm.setData('after_hours_ai_enabled', !clinicForm.data.after_hours_ai_enabled)} />
                        </div>
                    </div>
                    <SaveButton processing={clinicForm.processing} label={t('saveButtons.saveClinicInfo')} />
                </SectionCard>
            </form>

            <form onSubmit={handleHoursSubmit}>
                <SectionCard icon={Clock} title={t('general.operatingHours')}>
                    <div className="flex flex-col gap-0 p-5">
                        <div className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
                            {sortedHoursForDisplay.map(({ hour, index }) => (
                                <div key={hour.day_of_week} className="flex items-center justify-between gap-4 px-4 py-3">
                                    <span className="w-24 shrink-0 font-primary text-[13px] font-medium text-[var(--foreground)]">
                                        {dayNames[hour.day_of_week]}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        {!hour.is_closed && (
                                            <>
                                                <input
                                                    type="time"
                                                    value={hour.open_time}
                                                    onChange={e => updateHour(index, 'open_time', e.target.value)}
                                                    className={`${inputClass} w-[130px]`}
                                                />
                                                <span className="font-mono text-[12px] text-[var(--muted-foreground)]">{t('common.to')}</span>
                                                <input
                                                    type="time"
                                                    value={hour.close_time}
                                                    onChange={e => updateHour(index, 'close_time', e.target.value)}
                                                    className={`${inputClass} w-[130px]`}
                                                />
                                            </>
                                        )}
                                        {hour.is_closed && (
                                            <span className="font-mono text-[12px] text-[var(--destructive)]">{t('common.closed')}</span>
                                        )}
                                        <ToggleSwitch
                                            enabled={!hour.is_closed}
                                            onToggle={() => updateHour(index, 'is_closed', !hour.is_closed)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <SaveButton processing={hoursForm.processing} label={t('saveButtons.saveHours')} />
                </SectionCard>
            </form>
        </>
    );
}

// ===================== TAB: VAPI =====================

const textareaClass = 'rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2.5 font-primary text-[13px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]';

// --- Card 1: AI Assistant Config (connection status) ---

function VapiConfigCard({ config, vapiKeyConfigured, vapiPublicKey }: { config: VapiConfiguration | null; vapiKeyConfigured: boolean; vapiPublicKey: string }) {
    const { t } = useTranslation('settings');
    const isConnected = !!config?.vapi_assistant_id;
    const assistantId = config?.vapi_assistant_id;

    const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
    const [callDuration, setCallDuration] = useState(0);
    const vapiRef = useRef<any>(null);
    const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    // Chat test state
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [previousChatId, setPreviousChatId] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const canTest = isConnected && !!vapiPublicKey;
    const canChat = isConnected;

    const cleanup = useCallback(() => {
        if (durationRef.current) {
            clearInterval(durationRef.current);
            durationRef.current = null;
        }
        setCallDuration(0);
        setCallStatus('idle');
    }, []);

    useEffect(() => {
        return () => {
            if (vapiRef.current) {
                try { vapiRef.current.stop(); } catch { }
                vapiRef.current = null;
            }
            if (durationRef.current) clearInterval(durationRef.current);
        };
    }, []);

    async function handleTestCall() {
        if (callStatus === 'active' || callStatus === 'connecting') {
            if (vapiRef.current) {
                try { vapiRef.current.stop(); } catch { }
            }
            cleanup();
            return;
        }

        if (!assistantId || !vapiPublicKey) return;

        setCallStatus('connecting');
        setCallDuration(0);

        try {
            const VapiSDK = await import('@vapi-ai/web');
            const Vapi = VapiSDK.default;
            const vapi = new Vapi(vapiPublicKey);
            vapiRef.current = vapi;

            vapi.on('call-start', () => {
                setCallStatus('active');
                durationRef.current = setInterval(() => {
                    setCallDuration(prev => prev + 1);
                }, 1000);
            });

            vapi.on('call-end', () => {
                cleanup();
                vapiRef.current = null;
            });

            vapi.on('error', () => {
                cleanup();
                vapiRef.current = null;
            });

            await vapi.start(assistantId);
        } catch {
            cleanup();
            vapiRef.current = null;
        }
    }

    function formatDuration(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, chatLoading]);

    async function handleChatSend() {
        if (!chatInput.trim() || chatLoading) return;
        const userMsg = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatLoading(true);

        try {
            const res = await axios.post('/settings/vapi/chat', {
                input: userMsg,
                previous_chat_id: previousChatId,
            });
            setPreviousChatId(res.data.chat_id);
            setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.output }]);
        } catch (err: any) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: err.response?.data?.error || 'Failed to get response.' }]);
        } finally {
            setChatLoading(false);
        }
    }

    function clearChat() {
        setChatMessages([]);
        setChatInput('');
        setPreviousChatId(null);
    }

    return (
        <SectionCard icon={Key} title={t('aiAssistant.configTitle')}>
            <div className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500' : vapiKeyConfigured ? 'bg-amber-500' : 'bg-[var(--muted-foreground)]'}`} />
                        <div className="flex flex-col gap-0.5">
                            <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                {isConnected ? t('aiAssistant.connected') : vapiKeyConfigured ? t('aiAssistant.apiKeyConfigured') : t('aiAssistant.notConnected')}
                            </span>
                            {isConnected && (
                                <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                    {t('aiAssistant.assistantLive')}
                                </span>
                            )}
                        </div>
                    </div>
                    {assistantId && (
                        <button
                            type="button"
                            onClick={() => setShowDetails(!showDetails)}
                            className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 font-primary text-[11px] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        >
                            {t('common.details')}
                            <ChevronDown size={12} className={`transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>

                {showDetails && assistantId && (
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)]/50 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <span className="font-primary text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t('aiAssistant.assistantId')}</span>
                                <span className="break-all font-mono text-[11px] text-[var(--foreground)]">{assistantId}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(assistantId)}
                                className="rounded-[var(--radius-md)] p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                                title={t('common.copyToClipboard')}
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                    </div>
                )}

                {canTest && (
                    <div className={`flex items-center justify-between rounded-[var(--radius-md)] border p-4 ${callStatus === 'active'
                        ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
                        : callStatus === 'connecting'
                            ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950'
                            : 'border-[var(--border)] bg-[var(--secondary)]'
                        }`}>
                        <div className="flex items-center gap-3">
                            {callStatus === 'active' && (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                                    <PhoneCall size={16} className="text-green-600 dark:text-green-400" />
                                </div>
                            )}
                            {callStatus === 'connecting' && (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                                    <Loader2 size={16} className="animate-spin text-amber-600 dark:text-amber-400" />
                                </div>
                            )}
                            {callStatus === 'idle' && (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted)]">
                                    <Mic size={16} className="text-[var(--muted-foreground)]" />
                                </div>
                            )}
                            <div className="flex flex-col gap-0.5">
                                <span className={`font-primary text-[13px] font-medium ${callStatus === 'active'
                                    ? 'text-green-800 dark:text-green-200'
                                    : callStatus === 'connecting'
                                        ? 'text-amber-800 dark:text-amber-200'
                                        : 'text-[var(--foreground)]'
                                    }`}>
                                    {callStatus === 'active' ? t('aiAssistant.callTest.inProgress') : callStatus === 'connecting' ? t('aiAssistant.callTest.connecting') : t('aiAssistant.callTest.testAssistant')}
                                </span>
                                <span className={`font-primary text-[11px] ${callStatus === 'active'
                                    ? 'text-green-600 dark:text-green-400'
                                    : callStatus === 'connecting'
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-[var(--muted-foreground)]'
                                    }`}>
                                    {callStatus === 'active'
                                        ? t('aiAssistant.callTest.duration', { time: formatDuration(callDuration) })
                                        : callStatus === 'connecting'
                                            ? t('aiAssistant.callTest.connectingDesc')
                                            : t('aiAssistant.callTest.testDesc')}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleTestCall}
                            className={`inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 font-primary text-[13px] font-medium transition-colors ${callStatus === 'active' || callStatus === 'connecting'
                                ? 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900'
                                : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-80'
                                }`}
                        >
                            {callStatus === 'active' || callStatus === 'connecting' ? (
                                <>
                                    <PhoneOff size={14} />
                                    {t('aiAssistant.callTest.endCall')}
                                </>
                            ) : (
                                <>
                                    <PhoneCall size={14} />
                                    {t('aiAssistant.callTest.testCall')}
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Chat Test - Trigger Button */}
                {canChat && (
                    <button
                        type="button"
                        onClick={() => setChatOpen(true)}
                        className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-3 transition-colors hover:bg-[var(--accent)]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted)]">
                                <MessageCircle size={16} className="text-[var(--muted-foreground)]" />
                            </div>
                            <div className="flex flex-col gap-0.5 text-start">
                                <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                    {t('aiAssistant.chat.trigger')}
                                </span>
                                <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                    {t('aiAssistant.chat.triggerDesc')}
                                </span>
                            </div>
                        </div>
                        <MessageCircle size={16} className="text-[var(--primary)]" />
                    </button>
                )}

                {/* Chat Drawer */}
                {chatOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40 bg-black/50 transition-opacity"
                            onClick={() => setChatOpen(false)}
                        />

                        {/* Drawer */}
                        <div className="fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col bg-[var(--card)] shadow-2xl sm:max-w-[420px]">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/10">
                                        <MessageCircle size={18} className="text-[var(--primary)]" />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-mono text-sm font-semibold text-[var(--foreground)]">{t('aiAssistant.chat.title')}</span>
                                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                            {chatMessages?.length > 0 ? t('aiAssistant.chat.messageCount', { count: chatMessages?.length }) : t('aiAssistant.chat.triggerDesc')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {chatMessages?.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={clearChat}
                                            className="rounded-[var(--radius-md)] p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                                            title={t('aiAssistant.chat.clearConversation')}
                                        >
                                            <RotateCcw size={15} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setChatOpen(false)}
                                        className="rounded-[var(--radius-md)] p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
                                {chatMessages?.length === 0 && !chatLoading && (
                                    <div className="flex flex-1 flex-col items-center justify-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)]">
                                            <MessageCircle size={24} className="text-[var(--muted-foreground)]" />
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="font-primary text-[13px] font-medium text-[var(--foreground)]">{t('aiAssistant.chat.startConversation')}</p>
                                            <p className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                                {t('aiAssistant.chat.startDesc')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === 'user'
                                            ? 'rounded-ee-md bg-[var(--primary)] text-[var(--primary-foreground)]'
                                            : 'rounded-es-md bg-[var(--muted)] text-[var(--foreground)]'
                                            }`}>
                                            <p className="whitespace-pre-wrap font-primary text-[13px] leading-relaxed">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="flex justify-start">
                                        <div className="flex items-center gap-1.5 rounded-2xl rounded-es-md bg-[var(--muted)] px-4 py-3">
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted-foreground)]/60" style={{ animationDelay: '0ms' }} />
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted-foreground)]/60" style={{ animationDelay: '150ms' }} />
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted-foreground)]/60" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            <div className="border-t border-[var(--border)] px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                                        placeholder={t('aiAssistant.chat.placeholder')}
                                        disabled={chatLoading}
                                        autoFocus
                                        className="h-10 flex-1 rounded-full border border-[var(--border)] bg-[var(--secondary)] px-4 font-primary text-[13px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] disabled:opacity-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleChatSend}
                                        disabled={!chatInput.trim() || chatLoading}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-40"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {!isConnected && (
                    <div className={`flex items-center gap-2 rounded-[var(--radius-md)] border p-3 ${vapiKeyConfigured ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950'}`}>
                        <AlertCircle size={16} className={`shrink-0 ${vapiKeyConfigured ? 'text-blue-500' : 'text-amber-500'}`} />
                        <p className={`font-primary text-[13px] ${vapiKeyConfigured ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {vapiKeyConfigured
                                ? t('aiAssistant.notConnectedWarning')
                                : t('aiAssistant.addApiKeyWarning')}
                        </p>
                    </div>
                )}
            </div>
        </SectionCard>
    );
}

// --- Card 2: Phone Numbers ---

type ProviderType = 'vapi_number' | 'vapi_sip' | 'twilio' | 'vonage' | 'telnyx' | 'byo_sip_trunk';

const PROVIDER_OPTIONS: { type: ProviderType; label: string; description: string; icon: typeof Phone; badge?: string }[] = [
    { type: 'vapi_number', label: 'Free Number', description: 'Get a free phone number', icon: Phone },
    { type: 'vapi_sip', label: 'Free SIP', description: 'Get a free SIP endpoint', icon: Radio },
    { type: 'twilio', label: 'Import Twilio', description: 'Use your existing Twilio number', icon: Import },
    { type: 'vonage', label: 'Import Vonage', description: 'Use your existing Vonage number', icon: Import },
    { type: 'telnyx', label: 'Import Telnyx', description: 'Use your existing Telnyx number', icon: Import },
    { type: 'byo_sip_trunk', label: 'BYO SIP Trunk', description: 'Bring your own SIP trunk provider', icon: Server },
];

const PROVIDER_LABELS: Record<string, string> = {
    vapi: 'AI Assistant',
    twilio: 'Twilio',
    vonage: 'Vonage',
    telnyx: 'Telnyx',
    'byo-phone-number': 'BYO SIP Trunk',
};

const inputClasses = 'w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 font-mono text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]';

function PhoneNumberCard({ config }: { config: VapiConfiguration | null }) {
    const { t } = useTranslation('settings');
    const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
    const [provisioning, setProvisioning] = useState(false);
    const [releasing, setReleasing] = useState(false);
    const [showPhoneDetails, setShowPhoneDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [pollingStatus, setPollingStatus] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Provider-specific form fields
    const [areaCode, setAreaCode] = useState('');
    const [sipUsername, setSipUsername] = useState('');
    const [sipPassword, setSipPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [twilioAccountSid, setTwilioAccountSid] = useState('');
    const [twilioAuthToken, setTwilioAuthToken] = useState('');
    const [twilioUseApiKey, setTwilioUseApiKey] = useState(false);
    const [twilioApiKey, setTwilioApiKey] = useState('');
    const [twilioApiSecret, setTwilioApiSecret] = useState('');
    const [credentialId, setCredentialId] = useState('');

    const ACTIVATION_DURATION = 180; // 3 minutes
    const isProvisioned = !!config?.vapi_phone_number_id;
    const hasAssistant = !!config?.vapi_assistant_id;
    const isActivating = config?.vapi_phone_number_status === 'activating' && (countdown === null || countdown > 0);
    const isActive = config?.vapi_phone_number_status === 'active';

    // Calculate countdown from updated_at timestamp (persists across reloads)
    useEffect(() => {
        if (!isProvisioned || isActive) {
            setCountdown(null);
            return;
        }
        if (config?.vapi_phone_number_status !== 'activating') return;

        const updatedAt = config?.updated_at;
        if (!updatedAt) {
            setCountdown(ACTIVATION_DURATION);
            return;
        }

        const elapsedSeconds = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000);
        const remaining = Math.max(0, ACTIVATION_DURATION - elapsedSeconds);
        setCountdown(remaining);
    }, [config?.vapi_phone_number_status, config?.updated_at, isProvisioned, isActive]);

    // Tick down every second
    useEffect(() => {
        if (countdown === null || countdown <= 0) return;

        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    // Poll every 15 seconds during activation
    useEffect(() => {
        if (config?.vapi_phone_number_status !== 'activating') return;
        if (!isProvisioned) return;

        const interval = setInterval(() => {
            axios.get('/settings/vapi/phone-number/status')
                .then((res: any) => {
                    const phone = res.data.phone;
                    setPollingStatus(phone.status);
                    if (phone.status === 'active') {
                        setCountdown(null);
                        setSuccessMsg(t('aiAssistant.phoneNumbers.phoneNumberActive'));
                        router.reload({ only: ['vapiConfiguration'] });
                    }
                })
                .catch(() => { });
        }, 15000);

        return () => clearInterval(interval);
    }, [config?.vapi_phone_number_status, isProvisioned]);

    function resetForm() {
        setAreaCode('');
        setSipUsername('');
        setSipPassword('');
        setPhoneNumber('');
        setTwilioAccountSid('');
        setTwilioAuthToken('');
        setTwilioUseApiKey(false);
        setTwilioApiKey('');
        setTwilioApiSecret('');
        setCredentialId('');
        setShowPassword(false);
    }

    function buildPayload(): Record<string, string> {
        const base: Record<string, string> = { provider_type: selectedProvider! };

        switch (selectedProvider) {
            case 'vapi_number':
                if (areaCode) base.area_code = areaCode;
                break;
            case 'vapi_sip':
                base.sip_username = sipUsername;
                base.sip_password = sipPassword;
                break;
            case 'twilio':
                base.phone_number = phoneNumber;
                base.twilio_account_sid = twilioAccountSid;
                if (twilioUseApiKey) {
                    base.twilio_api_key = twilioApiKey;
                    base.twilio_api_secret = twilioApiSecret;
                } else {
                    base.twilio_auth_token = twilioAuthToken;
                }
                break;
            case 'vonage':
                base.phone_number = phoneNumber;
                base.credential_id = credentialId;
                break;
            case 'telnyx':
                base.phone_number = phoneNumber;
                base.credential_id = credentialId;
                break;
            case 'byo_sip_trunk':
                base.credential_id = credentialId;
                base.phone_number = phoneNumber;
                break;
        }

        return base;
    }

    function isFormValid(): boolean {
        if (!selectedProvider || !hasAssistant) return false;

        switch (selectedProvider) {
            case 'vapi_number':
                return true; // area code is optional
            case 'vapi_sip':
                return sipUsername?.length > 0 && sipPassword?.length > 0;
            case 'twilio':
                if (!phoneNumber) return false;
                if (twilioUseApiKey) return twilioAccountSid?.length > 0 && twilioApiKey?.length > 0 && twilioApiSecret?.length > 0;
                return twilioAccountSid?.length > 0 && twilioAuthToken?.length > 0;
            case 'vonage':
            case 'telnyx':
                return phoneNumber?.length > 0 && credentialId?.length > 0;
            case 'byo_sip_trunk':
                return credentialId?.length > 0 && phoneNumber?.length > 0;
            default:
                return false;
        }
    }

    function handleProvision() {
        setError(null);
        setSuccessMsg(null);
        setProvisioning(true);

        axios
            .post('/settings/vapi/phone-number', buildPayload())
            .then((res: any) => {
                setSuccessMsg(res.data.message);
                setCountdown(180);
                resetForm();
                setSelectedProvider(null);
                router.reload({ only: ['vapiConfiguration'] });
            })
            .catch((err: any) => {
                setError(err.response?.data?.error || err.response?.data?.message || t('aiAssistant.phoneNumbers.provisionFailed'));
            })
            .finally(() => setProvisioning(false));
    }

    function handleRelease() {
        if (!confirm(t('aiAssistant.phoneNumbers.releaseConfirm'))) return;
        setError(null);
        setSuccessMsg(null);
        setReleasing(true);

        axios
            .delete('/settings/vapi/phone-number')
            .then((res: any) => {
                setSuccessMsg(res.data.message);
                setCountdown(null);
                setPollingStatus(null);
                router.reload({ only: ['vapiConfiguration'] });
            })
            .catch((err: any) => {
                setError(err.response?.data?.error || t('aiAssistant.phoneNumbers.releaseFailed'));
            })
            .finally(() => setReleasing(false));
    }

    function formatCountdown(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    const providerLabel = config?.vapi_phone_number_provider ? PROVIDER_LABELS[config.vapi_phone_number_provider] ?? config.vapi_phone_number_provider : 'AI Assistant';
    const isImportType = selectedProvider && !['vapi_number', 'vapi_sip'].includes(selectedProvider);

    return (
        <SectionCard icon={Phone} title={t('aiAssistant.phoneNumbers.title')}>
            <div className="flex flex-col gap-4 p-5">
                {error && (
                    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                        <XCircle size={16} className="shrink-0 text-red-500" />
                        <p className="font-primary text-[13px] text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}
                {successMsg && !isActivating && (
                    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                        <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                        <p className="font-primary text-[13px] text-green-600 dark:text-green-400">{successMsg}</p>
                    </div>
                )}

                {/* Activating State */}
                {isProvisioned && isActivating && (
                    <div className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                                    <Loader2 size={20} className="animate-spin text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-primary text-[14px] font-semibold text-amber-800 dark:text-amber-200">
                                        {t('aiAssistant.phoneNumbers.activating')}
                                    </span>
                                    <span className="font-primary text-[12px] text-amber-600 dark:text-amber-400">
                                        {countdown !== null && countdown > 0
                                            ? t('aiAssistant.phoneNumbers.activatingDesc')
                                            : t('aiAssistant.phoneNumbers.stillActivating')}
                                    </span>
                                </div>
                            </div>
                            {countdown !== null && countdown > 0 && (
                                <div className="flex flex-col items-center">
                                    <span className="font-mono text-[22px] font-bold text-amber-700 dark:text-amber-300">
                                        {formatCountdown(countdown)}
                                    </span>
                                    <span className="font-primary text-[10px] uppercase tracking-wider text-amber-500">{t('common.remaining')}</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-800">
                            <div
                                className="h-full rounded-full bg-amber-500 transition-all duration-1000"
                                style={{ width: `${((ACTIVATION_DURATION - (countdown ?? 0)) / ACTIVATION_DURATION) * 100}%` }}
                            />
                        </div>
                        <div className="mt-3 flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">ID: {config?.vapi_phone_number_id}</span>
                        </div>
                    </div>
                )}

                {/* Active State */}
                {isProvisioned && isActive && (
                    <div className="rounded-[var(--radius-md)] border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                                    <Phone size={20} className="text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-primary text-[14px] font-semibold text-green-800 dark:text-green-200">
                                        {config?.vapi_phone_number || 'SIP Endpoint'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-mono text-[10px] font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                            {t('common.active')}
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-mono text-[10px] font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                                            {providerLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPhoneDetails(!showPhoneDetails)}
                                    className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 font-primary text-[11px] text-green-600 transition-colors hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900"
                                >
                                    {t('common.details')}
                                    <ChevronDown size={12} className={`transition-transform ${showPhoneDetails ? 'rotate-180' : ''}`} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRelease}
                                    disabled={releasing}
                                    className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 font-primary text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                                >
                                    {releasing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    {t('aiAssistant.phoneNumbers.release')}
                                </button>
                            </div>
                        </div>

                        {showPhoneDetails && (
                            <div className="border-t border-green-200 px-4 py-3 dark:border-green-800">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-primary text-[10px] font-medium uppercase tracking-wider text-green-600 dark:text-green-400">{t('aiAssistant.phoneNumbers.phoneNumberId')}</span>
                                        <span className="break-all font-mono text-[11px] text-green-800 dark:text-green-200">{config?.vapi_phone_number_id}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-primary text-[10px] font-medium uppercase tracking-wider text-green-600 dark:text-green-400">{t('aiAssistant.phoneNumbers.provider')}</span>
                                        <span className="break-all font-mono text-[11px] text-green-800 dark:text-green-200">{providerLabel}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-primary text-[10px] font-medium uppercase tracking-wider text-green-600 dark:text-green-400">{t('aiAssistant.phoneNumbers.assistant')}</span>
                                        <span className="break-all font-mono text-[11px] text-green-800 dark:text-green-200">{config?.vapi_assistant_id}</span>
                                    </div>
                                    {config?.vapi_phone_number_sip_uri && (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-primary text-[10px] font-medium uppercase tracking-wider text-green-600 dark:text-green-400">{t('aiAssistant.phoneNumbers.sipUri')}</span>
                                            <span className="break-all font-mono text-[11px] text-green-800 dark:text-green-200">{config?.vapi_phone_number_sip_uri}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Not Provisioned — Provider Selection + Form */}
                {!isProvisioned && (
                    <>
                        {!hasAssistant && (
                            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                                <AlertCircle size={16} className="shrink-0 text-amber-500" />
                                <p className="font-primary text-[13px] text-amber-600 dark:text-amber-400">
                                    {t('aiAssistant.phoneNumbers.saveAgentFirst')}
                                </p>
                            </div>
                        )}

                        {/* Provider Selection Grid */}
                        {!selectedProvider && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {PROVIDER_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    return (
                                        <button
                                            key={option.type}
                                            type="button"
                                            disabled={!hasAssistant}
                                            onClick={() => { resetForm(); setSelectedProvider(option.type); setError(null); }}
                                            className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4 text-center transition-all hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Icon size={20} className="text-[var(--muted-foreground)]" />
                                            <span className="font-primary text-[12px] font-medium text-[var(--foreground)]">{option.label}</span>
                                            <span className="font-primary text-[10px] text-[var(--muted-foreground)]">{option.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Dynamic Form based on selected provider */}
                        {selectedProvider && (
                            <div className="flex flex-col gap-4">
                                <button
                                    type="button"
                                    onClick={() => { setSelectedProvider(null); resetForm(); setError(null); }}
                                    className="flex w-fit items-center gap-1.5 font-primary text-[12px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                                >
                                    <ArrowLeft size={14} />
                                    {t('aiAssistant.phoneNumbers.backToOptions')}
                                </button>

                                <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                                    <h4 className="mb-3 font-primary text-[13px] font-semibold text-[var(--foreground)]">
                                        {PROVIDER_OPTIONS.find(p => p.type === selectedProvider)?.label}
                                    </h4>

                                    <div className="flex flex-col gap-3">
                                        {/* Free Number — area code only */}
                                        {selectedProvider === 'vapi_number' && (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                    {t('aiAssistant.phoneNumbers.fields.areaCode')} <span className="text-[var(--muted-foreground)]">{t('aiAssistant.phoneNumbers.fields.areaCodeOptional')}</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={areaCode}
                                                    onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                                    placeholder="e.g. 415"
                                                    maxLength={3}
                                                    className={`${inputClasses} !w-[140px]`}
                                                />
                                                <p className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                                    {t('aiAssistant.phoneNumbers.fields.areaCodeHint')}
                                                </p>
                                            </div>
                                        )}

                                        {/* Free SIP — username + password */}
                                        {selectedProvider === 'vapi_sip' && (
                                            <>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                        {t('aiAssistant.phoneNumbers.fields.sipUsername')} <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={sipUsername}
                                                        onChange={(e) => setSipUsername(e.target.value)}
                                                        placeholder={t('aiAssistant.phoneNumbers.fields.sipUsernamePlaceholder')}
                                                        className={inputClasses}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                        {t('aiAssistant.phoneNumbers.fields.sipPassword')} <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type={showPassword ? 'text' : 'password'}
                                                            value={sipPassword}
                                                            onChange={(e) => setSipPassword(e.target.value)}
                                                            placeholder={t('aiAssistant.phoneNumbers.fields.sipPasswordPlaceholder')}
                                                            className={inputClasses}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                                        >
                                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Twilio — phone + account SID + auth token or API key */}
                                        {selectedProvider === 'twilio' && (
                                            <>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                        Phone Number <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={phoneNumber}
                                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                                        placeholder="+14155551234"
                                                        className={inputClasses}
                                                    />
                                                    <p className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('aiAssistant.phoneNumbers.fields.phoneE164')}</p>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                        Account SID <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={twilioAccountSid}
                                                        onChange={(e) => setTwilioAccountSid(e.target.value)}
                                                        placeholder={t('aiAssistant.phoneNumbers.fields.accountSidPlaceholder')}
                                                        className={inputClasses}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="flex cursor-pointer items-center gap-2 font-primary text-[12px] text-[var(--muted-foreground)]">
                                                        <input
                                                            type="checkbox"
                                                            checked={twilioUseApiKey}
                                                            onChange={(e) => setTwilioUseApiKey(e.target.checked)}
                                                            className="rounded border-[var(--border)]"
                                                        />
                                                        Use API Key &amp; Secret instead of Auth Token
                                                    </label>
                                                </div>
                                                {!twilioUseApiKey ? (
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                            Auth Token <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showPassword ? 'text' : 'password'}
                                                                value={twilioAuthToken}
                                                                onChange={(e) => setTwilioAuthToken(e.target.value)}
                                                                placeholder={t('aiAssistant.phoneNumbers.fields.authTokenPlaceholder')}
                                                                className={inputClasses}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                                            >
                                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                                API Key <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={twilioApiKey}
                                                                onChange={(e) => setTwilioApiKey(e.target.value)}
                                                                placeholder={t('aiAssistant.phoneNumbers.fields.apiKeyPlaceholder')}
                                                                className={inputClasses}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                                API Secret <span className="text-red-500">*</span>
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type={showPassword ? 'text' : 'password'}
                                                                    value={twilioApiSecret}
                                                                    onChange={(e) => setTwilioApiSecret(e.target.value)}
                                                                    placeholder={t('aiAssistant.phoneNumbers.fields.apiSecretPlaceholder')}
                                                                    className={inputClasses}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowPassword(!showPassword)}
                                                                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                                                >
                                                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {/* Vonage — phone + credential ID */}
                                        {selectedProvider === 'vonage' && (
                                            <>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                        Phone Number <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={phoneNumber}
                                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                                        placeholder="+14155551234"
                                                        className={inputClasses}
                                                    />
                                                    <p className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('aiAssistant.phoneNumbers.fields.phoneE164')}</p>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                        Vonage Credential ID <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={credentialId}
                                                        onChange={(e) => setCredentialId(e.target.value)}
                                                        placeholder={t('aiAssistant.phoneNumbers.fields.credentialIdPlaceholder')}
                                                        className={inputClasses}
                                                    />
                                                    <p className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                                        Create Vonage credentials in your provider dashboard
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        {/* Telnyx — phone + credential ID */}
                                        {selectedProvider === 'telnyx' && (
                                            <>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                        Phone Number <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={phoneNumber}
                                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                                        placeholder="+14155551234"
                                                        className={inputClasses}
                                                    />
                                                    <p className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('aiAssistant.phoneNumbers.fields.phoneE164')}</p>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                        Telnyx Credential ID <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={credentialId}
                                                        onChange={(e) => setCredentialId(e.target.value)}
                                                        placeholder={t('aiAssistant.phoneNumbers.fields.credentialIdPlaceholder')}
                                                        className={inputClasses}
                                                    />
                                                    <p className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                                        Create Telnyx credentials in your provider dashboard
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        {/* BYO SIP Trunk — credential ID + phone number */}
                                        {selectedProvider === 'byo_sip_trunk' && (
                                            <>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                        SIP Trunk Credential ID <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={credentialId}
                                                        onChange={(e) => setCredentialId(e.target.value)}
                                                        placeholder={t('aiAssistant.phoneNumbers.fields.credentialIdPlaceholder')}
                                                        className={inputClasses}
                                                    />
                                                    <p className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                                        Create BYO SIP trunk credentials in your provider dashboard
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">
                                                        Phone Number <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={phoneNumber}
                                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                                        placeholder="+14155551234"
                                                        className={inputClasses}
                                                    />
                                                    <p className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('aiAssistant.phoneNumbers.fields.phoneE164')}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="mt-2">
                                        <button
                                            type="button"
                                            onClick={handleProvision}
                                            disabled={provisioning || !isFormValid()}
                                            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary)]/90 disabled:opacity-50"
                                        >
                                            {provisioning ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                                            {provisioning ? t('aiAssistant.phoneNumbers.provisioning') : isImportType ? t('aiAssistant.phoneNumbers.importing') : t('aiAssistant.phoneNumbers.provision')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </SectionCard>
    );
}

// --- Card 3: Agent (all config — save creates/updates AI assistant) ---

function VapiConfigTab({ vapiConfiguration }: { vapiConfiguration: VapiConfiguration | null }) {
    const { t } = useTranslation('settings');
    const config = vapiConfiguration;

    const form = useForm({
        model_provider: config?.model_provider ?? 'openai',
        model: config?.model ?? 'gpt-4o',
        temperature: String(config?.temperature ?? 0.3),
        confidence_threshold: String(config?.confidence_threshold ?? 0.85),
        max_response_time_ms: String(Math.round((config?.max_response_time_ms ?? 3000) / 1000)),
        voice_provider: config?.voice_provider ?? 'vapi',
        voice_id: config?.voice_id ?? '',
        voice_name: config?.voice_id ? 'custom' : (config?.voice_name ?? 'Elliot'),
        speaking_rate: String(config?.speaking_rate ?? 1.0),
        transcriber_provider: config?.transcriber_provider ?? 'openai-whisper',
        transcriber_model: config?.transcriber_model ?? '',
        language: config?.language ?? 'en',
        first_message_mode: config?.first_message_mode ?? 'assistant-speaks-first',
        greeting_message: config?.greeting_message ?? '',
        greeting_message_ar: config?.greeting_message_ar ?? '',
        end_call_message: config?.end_call_message ?? '',
        end_call_message_ar: config?.end_call_message_ar ?? '',
        after_hours_message: config?.after_hours_message ?? '',
        after_hours_message_ar: config?.after_hours_message_ar ?? '',
        system_prompt: config?.system_prompt ?? '',
        system_prompt_ar: config?.system_prompt_ar ?? '',
        max_call_duration_seconds: String((config?.max_call_duration_seconds ?? 1800) / 60),
        silence_timeout_seconds: String(config?.silence_timeout_seconds ?? 30),
        interruptions_enabled: config?.interruptions_enabled ?? true,
        backchanneling_enabled: config?.backchanneling_enabled ?? false,
        background_sound: config?.background_sound ?? 'office',
        voicemail_detection_enabled: config?.voicemail_detection_enabled ?? false,
        hipaa_enabled: config?.hipaa_enabled ?? false,
        enable_recording: config?.enable_recording ?? true,
        sentiment_analysis_enabled: config?.sentiment_analysis_enabled ?? true,
        auto_escalation_enabled: config?.auto_escalation_enabled ?? true,
        multi_language_enabled: config?.multi_language_enabled ?? false,
        continuous_learning_enabled: config?.continuous_learning_enabled ?? false,
    });

    const modelOptions: Record<string, { value: string; label: string }[]> = {
        openai: [
            { value: 'gpt-4o', label: 'GPT-4o (~$0.04/m, 600ms)' },
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini (~$0.005/m, 400ms)' },
        ],
        anthropic: [
            { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (~$0.05/m, 800ms)' },
            { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (~$0.01/m, 500ms)' },
        ],
        google: [
            { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (~$0.001/m, 350ms) - Best Value!' },
            { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (~$0.001/m, 350ms)' },
        ],
        groq: [
            { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (~$0.003/m, 250ms)' },
            { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (~$0.002/m, 250ms)' },
        ],
        'together-ai': [
            { value: 'meta-llama/Llama-3-70b-chat-hf', label: 'Llama 3 70B (~$0.003/m, 300ms)' },
        ],
        'deep-seek': [
            { value: 'deepseek-chat', label: 'DeepSeek Chat (~$0.002/m, 400ms)' },
        ],
    };

    const isUpdate = !!config?.vapi_assistant_id;

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            temperature: parseFloat(data.temperature),
            confidence_threshold: parseFloat(data.confidence_threshold),
            max_response_time_ms: parseInt(data.max_response_time_ms) * 1000,
            speaking_rate: parseFloat(data.speaking_rate),
            max_call_duration_seconds: parseInt(data.max_call_duration_seconds) * 60,
            silence_timeout_seconds: parseInt(data.silence_timeout_seconds),
        }));
        form.put('/settings/vapi-configuration');
    }

    return (
        <form onSubmit={handleSubmit}>
            <SectionCard icon={Bot} title={t('aiAssistant.agent.title')}>
                {/* Model Configuration */}

                {/* <div className="flex flex-col gap-5 p-5">
                    <div className="flex flex-col gap-1 pb-1">
                        <h3 className="flex items-center gap-2 font-primary text-[13px] font-semibold text-[var(--foreground)]">
                            <Cpu size={14} className="text-[var(--primary)]" />
                            {t('aiAssistant.agent.modelConfig')}
                        </h3>
                        <p className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('aiAssistant.agent.modelConfigDesc')}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                        <FormField label={t('aiAssistant.agent.modelProvider')} error={form.errors.model_provider}>
                            <select value={form.data.model_provider} onChange={e => { form.setData('model_provider', e.target.value); const opts = modelOptions[e.target.value]; if (opts?.length) form.setData('model', opts[0].value); }} className={selectClass}>
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="google">Google</option>
                                <option value="groq">Groq</option>
                                <option value="together-ai">Together AI</option>
                                <option value="deep-seek">DeepSeek</option>
                            </select>
                        </FormField>
                        <FormField label={t('aiAssistant.agent.model')} error={form.errors.model}>
                            <input
                                type="text"
                                value={form.data.model}
                                onChange={e => form.setData('model', e.target.value)}
                                list="model-options"
                                className={selectClass}
                                placeholder={t('aiAssistant.agent.modelPlaceholder')}
                            />
                            <datalist id="model-options">
                                {(modelOptions[form.data.model_provider] ?? []).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </datalist>
                        </FormField>
                        <FormField label={t('aiAssistant.agent.temperature')} error={form.errors.temperature}>
                            <select value={form.data.temperature} onChange={e => form.setData('temperature', e.target.value)} className={selectClass}>
                                <option value="0.1">0.1</option>
                                <option value="0.3">0.3</option>
                                <option value="0.5">0.5</option>
                                <option value="0.7">0.7</option>
                            </select>
                        </FormField>
                    </div>
                </div> */}

                {/* Voice & Speech */}

                <div className="flex flex-col gap-5 border-t border-[var(--border)] p-5">
                    {/* <div className="flex flex-col gap-1 pb-1">
                        <h3 className="flex items-center gap-2 font-primary text-[13px] font-semibold text-[var(--foreground)]">
                            <AudioLines size={14} className="text-[var(--primary)]" />
                            {t('aiAssistant.agent.voiceSpeech')}
                        </h3>
                        <p className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('aiAssistant.agent.voiceSpeechDesc')}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField label={t('aiAssistant.agent.voice')} error={form.errors.voice_name}>
                            <select value={form.data.voice_name} onChange={e => {
                                form.setData('voice_name', e.target.value);
                                if (e.target.value !== 'custom') {
                                    form.setData('voice_id', '');
                                    form.setData('voice_provider', 'vapi');
                                } else {
                                    form.setData('voice_provider', 'cartesia');
                                }
                            }} className={selectClass}>
                                <option value="Elliot">Elliot</option>
                                <option value="Savannah">Savannah</option>
                                <option value="Rohan">Rohan</option>
                                <option value="Emma">Emma</option>
                                <option value="Clara">Clara</option>
                                <option value="Nico">Nico</option>
                                <option value="Kai">Kai</option>
                                <option value="Sagar">Sagar</option>
                                <option value="Godfrey">Godfrey</option>
                                <option value="Neil">Neil</option>
                                <option value="Naina">Naina</option>
                                <option value="Leah">Leah</option>
                                <option value="Tara">Tara</option>
                                <option value="Jess">Jess</option>
                                <option value="Leo">Leo</option>
                                <option value="Dan">Dan</option>
                                <option value="Mia">Mia</option>
                                <option value="Zac">Zac</option>
                                <option value="Zoe">Zoe</option>
                                <option value="custom">{t('aiAssistant.agent.customVoiceOption')}</option>
                            </select>
                        </FormField>
                        {form.data.voice_name === 'custom' && (
                            <>
                                <FormField label={t('aiAssistant.agent.voiceProvider')} error={form.errors.voice_provider}>
                                    <select value={form.data.voice_provider} onChange={e => form.setData('voice_provider', e.target.value)} className={selectClass}>
                                        <option value="cartesia">Cartesia</option>
                                        <option value="11labs">ElevenLabs</option>
                                        <option value="azure">Azure</option>
                                        <option value="playht">PlayHT</option>
                                        <option value="openai">OpenAI</option>
                                        <option value="rime-ai">Rime AI</option>
                                        <option value="neets">Neets</option>
                                    </select>
                                </FormField>
                                <FormField label={t('aiAssistant.agent.customVoiceId')} error={form.errors.voice_id}>
                                    <input
                                        type="text"
                                        value={form.data.voice_id ?? ''}
                                        onChange={e => form.setData('voice_id', e.target.value)}
                                        className={selectClass}
                                        placeholder={t('aiAssistant.agent.customVoiceIdPlaceholder')}
                                    />
                                </FormField>
                            </>
                        )}
                        <FormField label={t('aiAssistant.agent.speakingRate')} error={form.errors.speaking_rate}>
                            <select value={form.data.speaking_rate} onChange={e => form.setData('speaking_rate', e.target.value)} className={selectClass}>
                                <option value="0.8">0.8x</option>
                                <option value="1.0">1.0x</option>
                                <option value="1.1">1.1x</option>
                                <option value="1.25">1.25x</option>
                            </select>
                        </FormField>
                    </div> */}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                        {/* <FormField label={t('aiAssistant.agent.transcriber')} error={form.errors.transcriber_provider}>
                            <select value={form.data.transcriber_provider} onChange={e => form.setData('transcriber_provider', e.target.value)} className={selectClass}>
                                <option value="openai-whisper">OpenAI Transcribe</option>
                                <option value="soniox">Soniox</option>
                                <option value="deepgram">Deepgram</option>
                                <option value="gladia">Gladia</option>
                                <option value="assembly-ai">AssemblyAI</option>
                                <option value="azure">Azure Speech</option>
                            </select>
                        </FormField> */}
                        <FormField label={t('aiAssistant.agent.language')} error={form.errors.language}>
                            <select value={form.data.language} onChange={e => form.setData('language', e.target.value)} className={selectClass}>
                                <option value="en">English</option>
                                <option value="ar">العربية (Arabic)</option>
                            </select>
                        </FormField>
                        <FormField label={t('aiAssistant.agent.firstMessageMode')} error={form.errors.first_message_mode}>
                            <select value={form.data.first_message_mode} onChange={e => form.setData('first_message_mode', e.target.value)} className={selectClass}>
                                <option value="assistant-speaks-first">{t('aiAssistant.agent.speaksFirst')}</option>
                                <option value="assistant-waits-for-user">{t('aiAssistant.agent.waitsForUser')}</option>
                            </select>
                        </FormField>
                    </div>
                </div>

                {/* Conversation Messages */}
                <div className="border-t border-[var(--border)]">
                    <div className="flex flex-col gap-5 p-5">
                        <div className="flex flex-col gap-1 pb-1">
                            <h3 className="flex items-center gap-2 font-primary text-[13px] font-semibold text-[var(--foreground)]">
                                <MessageSquare size={14} className="text-[var(--primary)]" />
                                {t('aiAssistant.agent.conversationMessages')}
                            </h3>
                            <p className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('aiAssistant.agent.conversationMessagesDesc')}</p>
                        </div>
                        {form.data.language === 'ar' ? (
                            <>
                                <FormField label={t('aiAssistant.agent.greetingMessage')} error={form.errors.greeting_message_ar}>
                                    <textarea value={form.data.greeting_message_ar} onChange={e => form.setData('greeting_message_ar', e.target.value)} rows={2} className={textareaClass} placeholder="رسالة الترحيب" />
                                </FormField>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <FormField label={t('aiAssistant.agent.endCallMessage')} error={form.errors.end_call_message_ar}>
                                        <textarea value={form.data.end_call_message_ar} onChange={e => form.setData('end_call_message_ar', e.target.value)} rows={2} className={textareaClass} placeholder="رسالة إنهاء المكالمة" />
                                    </FormField>
                                    <FormField label={t('aiAssistant.agent.afterHoursMessage')} error={form.errors.after_hours_message_ar}>
                                        <textarea value={form.data.after_hours_message_ar} onChange={e => form.setData('after_hours_message_ar', e.target.value)} rows={2} className={textareaClass} placeholder="رسالة خارج أوقات العمل" />
                                    </FormField>
                                </div>
                                <FormField label={t('aiAssistant.agent.systemPrompt')} error={form.errors.system_prompt_ar}>
                                    <textarea value={form.data.system_prompt_ar} onChange={e => form.setData('system_prompt_ar', e.target.value)} rows={4} className={textareaClass} placeholder="التعليمات المخصصة للعيادة" />
                                </FormField>
                            </>
                        ) : (
                            <>
                                <FormField label={t('aiAssistant.agent.greetingMessage')} error={form.errors.greeting_message}>
                                    <textarea value={form.data.greeting_message} onChange={e => form.setData('greeting_message', e.target.value)} rows={2} className={textareaClass} placeholder={t('aiAssistant.agent.greetingPlaceholder')} />
                                </FormField>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <FormField label={t('aiAssistant.agent.endCallMessage')} error={form.errors.end_call_message}>
                                        <textarea value={form.data.end_call_message} onChange={e => form.setData('end_call_message', e.target.value)} rows={2} className={textareaClass} placeholder={t('aiAssistant.agent.endCallPlaceholder')} />
                                    </FormField>
                                    <FormField label={t('aiAssistant.agent.afterHoursMessage')} error={form.errors.after_hours_message}>
                                        <textarea value={form.data.after_hours_message} onChange={e => form.setData('after_hours_message', e.target.value)} rows={2} className={textareaClass} placeholder={t('aiAssistant.agent.afterHoursPlaceholder')} />
                                    </FormField>
                                </div>
                                <FormField label={t('aiAssistant.agent.systemPrompt')} error={form.errors.system_prompt}>
                                    <textarea value={form.data.system_prompt} onChange={e => form.setData('system_prompt', e.target.value)} rows={4} className={textareaClass} placeholder={t('aiAssistant.agent.systemPromptPlaceholder')} />
                                </FormField>
                            </>
                        )}
                    </div>
                </div>

                {/* Call Settings */}
                <div className="border-t border-[var(--border)]">
                    <div className="flex flex-col gap-5 p-5">
                        <div className="flex flex-col gap-1 pb-1">
                            <h3 className="flex items-center gap-2 font-primary text-[13px] font-semibold text-[var(--foreground)]">
                                <Clock size={14} className="text-[var(--primary)]" />
                                {t('aiAssistant.agent.callSettings')}
                            </h3>
                            <p className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('aiAssistant.agent.callSettingsDesc')}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                            <FormField label={t('aiAssistant.agent.maxCallDuration')} error={form.errors.max_call_duration_seconds}>
                                <select value={form.data.max_call_duration_seconds} onChange={e => form.setData('max_call_duration_seconds', e.target.value)} className={selectClass}>
                                    <option value="5">{t('aiAssistant.agent.minutesOption', { count: 5 })}</option>
                                    <option value="10">{t('aiAssistant.agent.minutesOption', { count: 10 })}</option>
                                    <option value="15">{t('aiAssistant.agent.minutesOption', { count: 15 })}</option>
                                    <option value="30">{t('aiAssistant.agent.minutesOption', { count: 30 })}</option>
                                    <option value="60">{t('aiAssistant.agent.minutesOption', { count: 60 })}</option>
                                </select>
                            </FormField>
                            <FormField label={t('aiAssistant.agent.silenceTimeout')} error={form.errors.silence_timeout_seconds}>
                                <select value={form.data.silence_timeout_seconds} onChange={e => form.setData('silence_timeout_seconds', e.target.value)} className={selectClass}>
                                    <option value="15">15s</option>
                                    <option value="30">30s</option>
                                    <option value="60">60s</option>
                                    <option value="120">120s</option>
                                </select>
                            </FormField>
                            <FormField label={t('aiAssistant.agent.backgroundSound')} error={form.errors.background_sound}>
                                <select value={form.data.background_sound} onChange={e => form.setData('background_sound', e.target.value)} className={selectClass}>
                                    <option value="office">{t('aiAssistant.agent.backgroundOffice')}</option>
                                    <option value="off">{t('aiAssistant.agent.backgroundOff')}</option>
                                </select>
                            </FormField>
                        </div>
                    </div>
                </div>

                {/* Compliance & Recording */}
                <div className="border-t border-[var(--border)]">
                    <div className="flex items-center gap-2 px-5 pb-1 pt-4">
                        <Shield size={13} className="text-[var(--muted-foreground)]" />
                        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t('aiAssistant.agent.compliance')}</span>
                    </div>
                    <div className="flex flex-col divide-y divide-[var(--border)]">
                        {/* <SettingRow label={t('aiAssistant.agent.hipaa')} description={t('aiAssistant.agent.hipaaDesc')}>
                            <ToggleSwitch enabled={form.data.hipaa_enabled} onToggle={() => form.setData('hipaa_enabled', !form.data.hipaa_enabled)} />
                        </SettingRow> */}
                        <SettingRow label={t('aiAssistant.agent.callRecording')} description={t('aiAssistant.agent.callRecordingDesc')}>
                            <ToggleSwitch enabled={form.data.enable_recording} onToggle={() => form.setData('enable_recording', !form.data.enable_recording)} />
                        </SettingRow>
                    </div>
                </div>

                {/* Conversation Features */}
                <div className="border-t border-[var(--border)]">
                    <div className="flex items-center gap-2 px-5 pb-1 pt-4">
                        <Mic size={13} className="text-[var(--muted-foreground)]" />
                        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t('aiAssistant.agent.conversation')}</span>
                    </div>
                    <div className="flex flex-col divide-y divide-[var(--border)]">
                        <SettingRow label={t('aiAssistant.agent.interruptions')} description={t('aiAssistant.agent.interruptionsDesc')}>
                            <ToggleSwitch enabled={form.data.interruptions_enabled} onToggle={() => form.setData('interruptions_enabled', !form.data.interruptions_enabled)} />
                        </SettingRow>
                        <SettingRow label={t('aiAssistant.agent.backchanneling')} description={t('aiAssistant.agent.backchannelingDesc')}>
                            <ToggleSwitch enabled={form.data.backchanneling_enabled} onToggle={() => form.setData('backchanneling_enabled', !form.data.backchanneling_enabled)} />
                        </SettingRow>
                        <SettingRow label={t('aiAssistant.agent.voicemailDetection')} description={t('aiAssistant.agent.voicemailDetectionDesc')}>
                            <ToggleSwitch enabled={form.data.voicemail_detection_enabled} onToggle={() => form.setData('voicemail_detection_enabled', !form.data.voicemail_detection_enabled)} />
                        </SettingRow>
                        {/* <SettingRow label={t('aiAssistant.agent.multiLanguage')} description={t('aiAssistant.agent.multiLanguageDesc')}>
                            <ToggleSwitch enabled={form.data.multi_language_enabled} onToggle={() => form.setData('multi_language_enabled', !form.data.multi_language_enabled)} />
                        </SettingRow> */}
                    </div>
                </div>

                {/* Intelligence */}
                {/* <div className="border-t border-[var(--border)]">
                    <div className="flex items-center gap-2 px-5 pb-1 pt-4">
                        <Sparkles size={13} className="text-[var(--muted-foreground)]" />
                        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t('aiAssistant.agent.intelligence')}</span>
                    </div>
                    <div className="flex flex-col divide-y divide-[var(--border)]">
                        <SettingRow label={t('aiAssistant.agent.sentimentAnalysis')} description={t('aiAssistant.agent.sentimentAnalysisDesc')}>
                            <ToggleSwitch enabled={form.data.sentiment_analysis_enabled} onToggle={() => form.setData('sentiment_analysis_enabled', !form.data.sentiment_analysis_enabled)} />
                        </SettingRow>
                        <SettingRow label={t('aiAssistant.agent.autoEscalation')} description={t('aiAssistant.agent.autoEscalationDesc')}>
                            <ToggleSwitch enabled={form.data.auto_escalation_enabled} onToggle={() => form.setData('auto_escalation_enabled', !form.data.auto_escalation_enabled)} />
                        </SettingRow>
                    </div>
                </div> */}

                {/* Sync error */}
                {(form.errors as Record<string, string>).vapi && (
                    <div className="mx-5 mt-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                        <XCircle size={16} className="shrink-0 text-red-500" />
                        <p className="font-primary text-[13px] text-red-600 dark:text-red-400">{(form.errors as Record<string, string>).vapi}</p>
                    </div>
                )}

                {/* Save */}
                <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-4">
                    {form.recentlySuccessful && (
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-green-500" />
                            <span className="font-primary text-[13px] text-green-600">{t('common.saved')}</span>
                        </div>
                    )}
                    {!form.recentlySuccessful && <div />}
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
                    >
                        <Save size={14} />
                        {form.processing ? t('common.saving') : isUpdate ? t('aiAssistant.agent.updateAgent') : t('aiAssistant.agent.createAgent')}
                    </button>
                </div>
            </SectionCard>
        </form>
    );
}

// --- Card 4: Knowledge Base ---

function KnowledgeBaseCard({ files, config }: { files: KnowledgeBaseFile[]; config: VapiConfiguration | null }) {
    const { t } = useTranslation('settings');
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const hasAssistant = !!config?.vapi_assistant_id;
    const acceptedTypes = '.txt,.pdf,.docx,.doc,.csv,.md,.json,.xml';

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function getFileIcon(mimeType: string): string {
        if (mimeType.includes('pdf')) return 'PDF';
        if (mimeType.includes('word') || mimeType.includes('docx')) return 'DOC';
        if (mimeType.includes('csv')) return 'CSV';
        if (mimeType.includes('json')) return 'JSON';
        if (mimeType.includes('xml')) return 'XML';
        if (mimeType.includes('markdown') || mimeType.includes('text/plain')) return 'TXT';
        return 'FILE';
    }

    function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setSuccessMsg(null);
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        axios
            .post('/settings/vapi/knowledge-base/files', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then((res: any) => {
                setSuccessMsg(res.data.message);
                router.reload({ only: ['knowledgeBaseFiles', 'vapiConfiguration'] });
            })
            .catch((err: any) => {
                setError(err.response?.data?.error || err.response?.data?.errors?.file?.[0] || 'Upload failed.');
            })
            .finally(() => {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            });
    }

    function handleDelete(fileId: number) {
        if (!confirm(t('aiAssistant.knowledgeBase.removeConfirm'))) return;
        setError(null);
        setSuccessMsg(null);
        setDeletingId(fileId);

        axios
            .delete(`/settings/vapi/knowledge-base/files/${fileId}`)
            .then((res: any) => {
                setSuccessMsg(res.data.message);
                router.reload({ only: ['knowledgeBaseFiles', 'vapiConfiguration'] });
            })
            .catch((err: any) => {
                setError(err.response?.data?.error || 'Delete failed.');
            })
            .finally(() => setDeletingId(null));
    }

    return (
        <SectionCard icon={FileText} title={t('aiAssistant.knowledgeBase.title')}>
            <div className="flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-1">
                    <p className="font-primary text-[12px] text-[var(--muted-foreground)]">
                        {t('aiAssistant.knowledgeBase.description')}
                    </p>
                    <p className="font-primary text-[11px] text-[var(--muted-foreground)]/60">
                        {t('aiAssistant.knowledgeBase.supportedFormats')}
                    </p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                        <XCircle size={16} className="shrink-0 text-red-500" />
                        <p className="font-primary text-[13px] text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}
                {successMsg && (
                    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                        <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                        <p className="font-primary text-[13px] text-green-600 dark:text-green-400">{successMsg}</p>
                    </div>
                )}

                {!hasAssistant && (
                    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                        <AlertCircle size={16} className="shrink-0 text-amber-500" />
                        <p className="font-primary text-[13px] text-amber-600 dark:text-amber-400">
                            Save your agent first before uploading knowledge base files.
                        </p>
                    </div>
                )}

                {/* File list */}
                {files?.length > 0 && (
                    <div className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
                        {files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--muted)]">
                                        <span className="font-mono text-[9px] font-bold text-[var(--muted-foreground)]">
                                            {getFileIcon(file.mime_type)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                                            {file.original_name}
                                        </span>
                                        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                                            {formatFileSize(file.file_size)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(file.id)}
                                    disabled={deletingId === file.id}
                                    className="rounded-[var(--radius-md)] p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--destructive)] disabled:opacity-50"
                                >
                                    {deletingId === file.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={14} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload area */}
                <div className="relative">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={acceptedTypes}
                        onChange={handleUpload}
                        disabled={uploading || !hasAssistant}
                        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    />
                    <div className={`flex flex-col items-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed px-6 py-8 transition-colors ${hasAssistant
                        ? 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--accent)]'
                        : 'border-[var(--muted)] opacity-50'
                        }`}>
                        {uploading ? (
                            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
                        ) : (
                            <Upload size={24} className="text-[var(--muted-foreground)]" />
                        )}
                        <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">
                            {uploading ? t('aiAssistant.knowledgeBase.uploading') : t('aiAssistant.knowledgeBase.clickToUpload')}
                        </span>
                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">
                            {t('aiAssistant.knowledgeBase.uploadHint')}
                        </span>
                    </div>
                </div>

                {config?.vapi_knowledge_base_tool_id && files?.length > 0 && (
                    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                        <CheckCircle2 size={14} className="shrink-0 text-green-500" />
                        <span className="font-primary text-[12px] text-green-600 dark:text-green-400">
                            {t('aiAssistant.knowledgeBase.active', { count: files?.length })}
                        </span>
                    </div>
                )}
            </div>
        </SectionCard>
    );
}

// ===================== TAB: USER ACCESS =====================

function useFormatLastActive() {
    const { t } = useTranslation('settings');
    return function formatLastActive(lastActiveAt: string | null): string {
        if (!lastActiveAt) return t('common.never');
        const now = new Date();
        const active = new Date(lastActiveAt);
        const diffMs = now.getTime() - active.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        if (diffMinutes < 1) return t('common.justNow');
        if (diffMinutes < 60) return t('common.minAgo', { count: diffMinutes });
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return t('common.hourAgo', { count: diffHours });
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return t('common.dayAgo', { count: diffDays });
        const diffWeeks = Math.floor(diffDays / 7);
        return t('common.weekAgo', { count: diffWeeks });
    };
}

function getRoleLabel(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
}

function UserAccessTab({ teamMembers }: { teamMembers: User[] }) {
    const { t } = useTranslation('settings');
    const formatLastActive = useFormatLastActive();
    const [showInvite, setShowInvite] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    const inviteForm = useForm({ name: '', email: '', role: 'staff' });
    const editForm = useForm({ name: '', email: '', role: '', is_active: true });

    function openEdit(member: User) {
        editForm.setData({ name: member.name, email: member.email, role: member.role, is_active: member.is_active });
        setEditingUser(member);
    }

    const roleCounts = teamMembers.reduce<Record<string, number>>((acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1;
        return acc;
    }, {});

    return (
        <>
            <SectionCard icon={Users} title={t('userAccess.teamMembers')}>
                <div className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <span className="font-primary text-[13px] text-[var(--muted-foreground)]">
                            {t('userAccess.memberCount', { count: teamMembers?.length })}
                        </span>
                        <Button variant="primary" icon={Plus} onClick={() => { inviteForm.reset(); setShowInvite(true); }}>{t('userAccess.inviteMember')}</Button>
                    </div>
                    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                                    <th className="px-4 py-3 text-start font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('userAccess.member')}</th>
                                    <th className="px-4 py-3 text-start font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('userAccess.role')}</th>
                                    <th className="hidden px-4 py-3 text-start font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] md:table-cell">{t('userAccess.status')}</th>
                                    <th className="hidden px-4 py-3 text-start font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] lg:table-cell">{t('userAccess.lastActive')}</th>
                                    <th className="px-4 py-3 text-end font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('userAccess.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {teamMembers.map((member) => (
                                    <tr key={member.id} className="transition-colors hover:bg-[var(--accent)]">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#22D3EE15]">
                                                    <span className="text-[10px] font-semibold text-[var(--primary)]">
                                                        {(member.name ?? '?').split(' ').map((n) => n[0]).join('')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">{member.name}</span>
                                                    <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{member.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 font-primary text-[11px] font-medium ${member.role === 'clinic_owner'
                                                ? 'bg-[#22D3EE15] text-[var(--primary)]'
                                                : member.role === 'provider'
                                                    ? 'bg-[#8B5CF615] text-[#A78BFA]'
                                                    : member.role === 'billing'
                                                        ? 'bg-[#F59E0B15] text-[var(--warning)]'
                                                        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                                                }`}>
                                                {getRoleLabel(member.role)}
                                            </span>
                                        </td>
                                        <td className="hidden px-4 py-3 md:table-cell">
                                            <Badge variant={member.is_active ? 'success' : 'error'}>
                                                {member.is_active ? t('common.active') : t('common.disabled')}
                                            </Badge>
                                        </td>
                                        <td className="hidden px-4 py-3 lg:table-cell">
                                            <span className="font-mono text-[12px] text-[var(--muted-foreground)]">{formatLastActive(member.last_active_at)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-end">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(member)} className="rounded-[var(--radius-md)] p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => setDeletingUser(member)} className="rounded-[var(--radius-md)] p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--destructive)]">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </SectionCard>

            <SectionCard icon={Shield} title={t('userAccess.rolePermissions')}>
                <div className="flex flex-col divide-y divide-[var(--border)]">
                    {[
                        { role: 'clinic_owner', label: t('userAccess.roles.clinic_owner'), permissions: t('userAccess.roles.clinic_ownerPerms') },
                        { role: 'provider', label: t('userAccess.roles.provider'), permissions: t('userAccess.roles.providerPerms') },
                        { role: 'staff', label: t('userAccess.roles.staff'), permissions: t('userAccess.roles.staffPerms') },
                        { role: 'billing', label: t('userAccess.roles.billing'), permissions: t('userAccess.roles.billingPerms') },
                    ].map((item) => (
                        <div key={item.role} className="flex items-center justify-between px-5 py-4">
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">{item.label}</span>
                                    <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
                                        {roleCounts[item.role] ?? 0}
                                    </span>
                                </div>
                                <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{item.permissions}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* Invite Modal */}
            {showInvite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowInvite(false)}>
                    <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                            <h3 className="font-mono text-sm font-semibold text-[var(--foreground)]">{t('userAccess.invite.title')}</h3>
                            <button onClick={() => setShowInvite(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><X size={16} /></button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); inviteForm.post('/settings/users', { onSuccess: () => setShowInvite(false) }); }}>
                            <div className="flex flex-col gap-4 p-5">
                                <FormField label={t('userAccess.invite.fullName')} error={inviteForm.errors.name}>
                                    <input type="text" value={inviteForm.data.name} onChange={e => inviteForm.setData('name', e.target.value)} className={inputClass} placeholder="John Doe" />
                                </FormField>
                                <FormField label={t('userAccess.invite.emailAddress')} error={inviteForm.errors.email}>
                                    <input type="email" value={inviteForm.data.email} onChange={e => inviteForm.setData('email', e.target.value)} className={inputClass} placeholder="john@clinic.com" />
                                </FormField>
                                <FormField label={t('userAccess.invite.role')} error={inviteForm.errors.role}>
                                    <select value={inviteForm.data.role} onChange={e => inviteForm.setData('role', e.target.value)} className={selectClass}>
                                        <option value="admin">{t('userAccess.roles.admin')}</option>
                                        <option value="provider">{t('userAccess.roles.provider')}</option>
                                        <option value="staff">{t('userAccess.roles.staff')}</option>
                                        <option value="billing">{t('userAccess.roles.billing')}</option>
                                    </select>
                                </FormField>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
                                <button type="button" onClick={() => setShowInvite(false)} className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 font-primary text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)]">{t('common.cancel')}</button>
                                <button type="submit" disabled={inviteForm.processing} className="rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-80 disabled:opacity-50">
                                    {inviteForm.processing ? t('userAccess.invite.inviting') : t('userAccess.invite.invite')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingUser(null)}>
                    <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                            <h3 className="font-mono text-sm font-semibold text-[var(--foreground)]">{t('userAccess.edit.title')}</h3>
                            <button onClick={() => setEditingUser(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><X size={16} /></button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); editForm.patch(`/settings/users/${editingUser.id}`, { onSuccess: () => setEditingUser(null) }); }}>
                            <div className="flex flex-col gap-4 p-5">
                                <FormField label={t('userAccess.invite.fullName')} error={editForm.errors.name}>
                                    <input type="text" value={editForm.data.name} onChange={e => editForm.setData('name', e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label={t('userAccess.invite.emailAddress')} error={editForm.errors.email}>
                                    <input type="email" value={editForm.data.email} onChange={e => editForm.setData('email', e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label={t('userAccess.invite.role')} error={editForm.errors.role}>
                                    <select value={editForm.data.role} onChange={e => editForm.setData('role', e.target.value)} className={selectClass}>
                                        <option value="admin">{t('userAccess.roles.admin')}</option>
                                        <option value="provider">{t('userAccess.roles.provider')}</option>
                                        <option value="staff">{t('userAccess.roles.staff')}</option>
                                        <option value="billing">{t('userAccess.roles.billing')}</option>
                                    </select>
                                </FormField>
                                <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-3">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">{t('userAccess.edit.activeStatus')}</span>
                                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('userAccess.edit.activeStatusDesc')}</span>
                                    </div>
                                    <ToggleSwitch enabled={editForm.data.is_active} onToggle={() => editForm.setData('is_active', !editForm.data.is_active)} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
                                <button type="button" onClick={() => setEditingUser(null)} className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 font-primary text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)]">{t('common.cancel')}</button>
                                <button type="submit" disabled={editForm.processing} className="rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-80 disabled:opacity-50">
                                    {editForm.processing ? t('userAccess.edit.saving') : t('userAccess.edit.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deletingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeletingUser(null)}>
                    <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-3 p-5">
                            <h3 className="font-mono text-sm font-semibold text-[var(--foreground)]">{t('userAccess.delete.title')}</h3>
                            <p className="font-primary text-[13px] text-[var(--muted-foreground)]">
                                {t('userAccess.delete.confirm', { name: deletingUser.name })}
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
                            <button onClick={() => setDeletingUser(null)} className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 font-primary text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--accent)]">{t('common.cancel')}</button>
                            <button onClick={() => router.delete(`/settings/users/${deletingUser.id}`, { onSuccess: () => setDeletingUser(null) })} className="rounded-[var(--radius-md)] bg-[var(--destructive)] px-3 py-2 font-primary text-[13px] font-medium text-white hover:opacity-80">{t('common.remove')}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ===================== TAB: NOTIFICATIONS =====================

function NotificationsTab({ notificationSetting, reminderSetting }: { notificationSetting: NotificationSetting | null; reminderSetting: ClinicReminderSetting | null }) {
    const { t } = useTranslation('settings');
    const ns = notificationSetting;

    const form = useForm({
        email_enabled: ns?.email_enabled ?? true,
        sms_enabled: ns?.sms_enabled ?? true,
        push_enabled: ns?.push_enabled ?? false,
        missed_call_alerts: ns?.missed_call_alerts ?? true,
        escalation_alerts: ns?.escalation_alerts ?? true,
        daily_digest: ns?.daily_digest ?? true,
        appointment_change_alerts: ns?.appointment_change_alerts ?? true,
        system_alerts: ns?.system_alerts ?? true,
        quiet_hours_enabled: ns?.quiet_hours_enabled ?? false,
        quiet_hours_start: ns?.quiet_hours_start?.substring(0, 5) ?? '22:00',
        quiet_hours_end: ns?.quiet_hours_end?.substring(0, 5) ?? '07:00',
    });

    const REMINDER_OPTIONS = [
        { value: 1, label: '1 hour before' },
        { value: 2, label: '2 hours before' },
        { value: 4, label: '4 hours before' },
        { value: 12, label: '12 hours before' },
        { value: 24, label: '24 hours before' },
        { value: 48, label: '48 hours before' },
    ];

    const reminderForm = useForm({
        reminders_enabled: reminderSetting?.reminders_enabled ?? true,
        reminder_hours: reminderSetting?.reminder_hours ?? [24, 1],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.put('/settings/notifications');
    }

    function handleReminderSubmit(e: FormEvent) {
        e.preventDefault();
        reminderForm.put('/settings/reminders');
    }

    function toggleReminderHour(hour: number) {
        const current = reminderForm.data.reminder_hours;
        if (current.includes(hour)) {
            if (current?.length > 1) {
                reminderForm.setData('reminder_hours', current.filter(h => h !== hour));
            }
        } else {
            reminderForm.setData('reminder_hours', [...current, hour].sort((a, b) => b - a));
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                    <SectionCard icon={Bell} title={t('notifications.channels')}>
                        <div className="flex flex-col divide-y divide-[var(--border)]">
                            <SettingRow label={t('notifications.email')} description={t('notifications.emailDesc')}>
                                <ToggleSwitch enabled={form.data.email_enabled} onToggle={() => form.setData('email_enabled', !form.data.email_enabled)} />
                            </SettingRow>
                            <SettingRow label={t('notifications.sms')} description={t('notifications.smsDesc')}>
                                <ToggleSwitch enabled={form.data.sms_enabled} onToggle={() => form.setData('sms_enabled', !form.data.sms_enabled)} />
                            </SettingRow>
                            <SettingRow label={t('notifications.push')} description={t('notifications.pushDesc')}>
                                <ToggleSwitch enabled={form.data.push_enabled} onToggle={() => form.setData('push_enabled', !form.data.push_enabled)} />
                            </SettingRow>
                        </div>
                    </SectionCard>

                    <SectionCard icon={BellRing} title={t('notifications.alertPreferences')}>
                        <div className="flex flex-col divide-y divide-[var(--border)]">
                            <SettingRow label={t('notifications.missedCalls')} description={t('notifications.missedCallsDesc')}>
                                <ToggleSwitch enabled={form.data.missed_call_alerts} onToggle={() => form.setData('missed_call_alerts', !form.data.missed_call_alerts)} />
                            </SettingRow>
                            <SettingRow label={t('notifications.escalation')} description={t('notifications.escalationDesc')}>
                                <ToggleSwitch enabled={form.data.escalation_alerts} onToggle={() => form.setData('escalation_alerts', !form.data.escalation_alerts)} />
                            </SettingRow>
                            <SettingRow label={t('notifications.dailyDigest')} description={t('notifications.dailyDigestDesc')}>
                                <ToggleSwitch enabled={form.data.daily_digest} onToggle={() => form.setData('daily_digest', !form.data.daily_digest)} />
                            </SettingRow>
                            <SettingRow label={t('notifications.appointmentChange')} description={t('notifications.appointmentChangeDesc')}>
                                <ToggleSwitch enabled={form.data.appointment_change_alerts} onToggle={() => form.setData('appointment_change_alerts', !form.data.appointment_change_alerts)} />
                            </SettingRow>
                            <SettingRow label={t('notifications.systemAlerts')} description={t('notifications.systemAlertsDesc')}>
                                <ToggleSwitch enabled={form.data.system_alerts} onToggle={() => form.setData('system_alerts', !form.data.system_alerts)} />
                            </SettingRow>
                        </div>
                    </SectionCard>

                    <SectionCard icon={Moon} title={t('notifications.quietHours')}>
                        <div className="p-5">
                            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">{t('notifications.enableQuietHours')}</span>
                                    <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('notifications.enableQuietHoursDesc')}</span>
                                </div>
                                <ToggleSwitch enabled={form.data.quiet_hours_enabled} onToggle={() => form.setData('quiet_hours_enabled', !form.data.quiet_hours_enabled)} />
                            </div>
                            {form.data.quiet_hours_enabled && (
                                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField label={t('notifications.startTime')} error={form.errors.quiet_hours_start}>
                                        <select value={form.data.quiet_hours_start} onChange={e => form.setData('quiet_hours_start', e.target.value)} className={selectClass}>
                                            <option value="20:00">8:00 PM</option>
                                            <option value="21:00">9:00 PM</option>
                                            <option value="22:00">10:00 PM</option>
                                            <option value="23:00">11:00 PM</option>
                                        </select>
                                    </FormField>
                                    <FormField label={t('notifications.endTime')} error={form.errors.quiet_hours_end}>
                                        <select value={form.data.quiet_hours_end} onChange={e => form.setData('quiet_hours_end', e.target.value)} className={selectClass}>
                                            <option value="05:00">5:00 AM</option>
                                            <option value="06:00">6:00 AM</option>
                                            <option value="07:00">7:00 AM</option>
                                            <option value="08:00">8:00 AM</option>
                                        </select>
                                    </FormField>
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] px-3.5 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                            <Save size={14} />
                            {form.processing ? t('common.saving') : t('saveButtons.saveNotifications')}
                        </button>
                    </div>
                </div>
            </form>

            <form onSubmit={handleReminderSubmit}>
                <div className="flex flex-col gap-6">
                    <SectionCard icon={Clock} title={t('notifications.reminders.title')}>
                        <div className="p-5">
                            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">{t('notifications.reminders.enable')}</span>
                                    <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('notifications.reminders.enableDesc')}</span>
                                </div>
                                <ToggleSwitch enabled={reminderForm.data.reminders_enabled} onToggle={() => reminderForm.setData('reminders_enabled', !reminderForm.data.reminders_enabled)} />
                            </div>
                            {reminderForm.data.reminders_enabled && (
                                <div className="mt-4">
                                    <span className="mb-3 block font-mono text-[11px] font-medium text-[var(--muted-foreground)]">{t('notifications.reminders.sendRemindersAt')}</span>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {REMINDER_OPTIONS.map(opt => {
                                            const isSelected = reminderForm.data.reminder_hours.includes(opt.value);
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => toggleReminderHour(opt.value)}
                                                    className={`flex items-center justify-center rounded-[var(--radius-md)] border px-3 py-2.5 font-primary text-[13px] font-medium transition-colors ${isSelected
                                                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                                                        : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {reminderForm.errors.reminder_hours && (
                                        <p className="mt-2 font-primary text-[11px] text-red-400">{reminderForm.errors.reminder_hours}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={reminderForm.processing}
                            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] px-3.5 py-2 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                            <Save size={14} />
                            {reminderForm.processing ? t('common.saving') : t('saveButtons.saveReminders')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

// ===================== TAB: SECURITY =====================

function SecurityTab({ auditLogs }: { auditLogs: AuditLog[] }) {
    const { t } = useTranslation('settings');
    const formatLastActive = useFormatLastActive();
    return (
        <>
            <SectionCard icon={Key} title={t('security.authentication')}>
                <div className="flex flex-col divide-y divide-[var(--border)]">
                    <SettingRow label={t('security.twoFactor')} description={t('security.twoFactorDesc')}>
                        <Badge variant="success">{t('common.enabled')}</Badge>
                    </SettingRow>
                    <SettingRow label={t('security.sessionTimeout')} description={t('security.sessionTimeoutDesc')}>
                        <Badge variant="success">{t('common.enabled')}</Badge>
                    </SettingRow>
                    <SettingRow label={t('security.ipWhitelist')} description={t('security.ipWhitelistDesc')}>
                        <Badge variant="warning">{t('common.disabled')}</Badge>
                    </SettingRow>
                </div>
            </SectionCard>

            <SectionCard icon={Lock} title={t('security.passwordPolicy')}>
                <div className="flex flex-col gap-5 p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-3">
                            <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('security.minimumLength')}</span>
                            <span className="font-mono text-[13px] font-medium text-[var(--foreground)]">{t('security.minimumLengthValue')}</span>
                        </div>
                        <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-3">
                            <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{t('security.passwordExpiry')}</span>
                            <span className="font-mono text-[13px] font-medium text-[var(--foreground)]">{t('security.passwordExpiryValue')}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-3">
                        <span className="font-primary text-[12px] font-medium text-[var(--muted-foreground)]">{t('security.passwordRequirements')}</span>
                        <div className="flex flex-wrap gap-2">
                            {[t('security.uppercase'), t('security.lowercase'), t('security.number'), t('security.specialChar')].map((req) => (
                                <span key={req} className="flex items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-1 font-primary text-[11px] text-[var(--foreground)]">
                                    <CheckCircle2 size={11} className="text-[var(--success)]" />
                                    {req}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </SectionCard>

            <SectionCard icon={ScrollText} title={t('security.auditLog')}>
                <div className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <span className="font-primary text-[13px] text-[var(--muted-foreground)]">{t('security.recentActivity')}</span>
                        <a href="/settings/audit-log/export" className="flex items-center gap-1.5 font-primary text-[12px] font-medium text-[var(--primary)] transition-opacity hover:opacity-80">
                            <Download size={13} />
                            {t('security.exportLog')}
                        </a>
                    </div>
                    <div className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
                        {auditLogs?.length === 0 && (
                            <div className="px-4 py-6 text-center font-primary text-[13px] text-[var(--muted-foreground)]">{t('security.noLogs')}</div>
                        )}
                        {auditLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {log.status === 'success' ? (
                                        <CheckCircle2 size={14} className="text-[var(--success)]" />
                                    ) : log.status === 'failed' ? (
                                        <AlertCircle size={14} className="text-[var(--destructive)]" />
                                    ) : (
                                        <AlertCircle size={14} className="text-[var(--warning)]" />
                                    )}
                                    <div className="flex flex-col">
                                        <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">{log.action}</span>
                                        <span className="font-primary text-[11px] text-[var(--muted-foreground)]">{log.user?.name ?? 'System'}</span>
                                    </div>
                                </div>
                                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{log.created_at ? formatLastActive(log.created_at) : ''}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </SectionCard>

            <div className="rounded-[var(--radius-lg)] border border-[var(--success)]/20 bg-[var(--success)]/5 p-5">
                <div className="flex items-start gap-3">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--success)]" />
                    <div className="flex flex-col gap-1">
                        <span className="font-primary text-[13px] font-semibold text-[var(--foreground)]">{t('security.hipaaActive')}</span>
                        <span className="font-primary text-[12px] text-[var(--muted-foreground)]">
                            {t('security.hipaaActiveDesc')}
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}

// ===================== AGENT WORKFLOW VISUAL =====================


// The fixed order of function tools as synced to Vapi (matches VapiService::buildFunctionToolDefinitions)
// Tool order must match VapiService::buildFunctionToolDefinitions
const syncedToolOrder = [
    'lookup_patient', 'create_patient_lead', 'verify_identity',
    'check_schedule', 'check_appointment_types', 'assess_urgency',
    'list_upcoming_appointments', 'book_appointment', 'reschedule_appointment',
    'cancel_appointment', 'verify_insurance', 'create_callback_task',
    'transfer_call', 'send_sms',
];

const toolDescriptions: Record<string, string> = {
    lookup_patient: 'Search patient by phone, name, or DOB',
    create_patient_lead: 'Register new patient from first-time caller',
    verify_identity: 'Confirm patient identity with DOB verification',
    check_schedule: 'Check doctor availability for a given date/time',
    check_appointment_types: 'List available appointment types & durations',
    assess_urgency: 'Evaluate symptom severity for triage routing',
    list_upcoming_appointments: 'Show patient\'s scheduled appointments',
    book_appointment: 'Schedule a new appointment for the patient',
    reschedule_appointment: 'Move an existing appointment to a new time',
    cancel_appointment: 'Cancel an existing appointment',
    verify_insurance: 'Verify insurance eligibility and coverage',
    create_callback_task: 'Create a staff callback task for follow-up',
    transfer_call: 'Transfer caller to a live staff member',
    send_sms: 'Send SMS confirmation or information to patient',
};

const toolGroups: { label: string; icon: React.ElementType; color: string; description: string; tools: string[] }[] = [
    { label: 'Patient Identification', icon: Users, color: '#a78bfa', description: 'Identify and verify the caller', tools: ['lookup_patient', 'create_patient_lead', 'verify_identity'] },
    { label: 'Scheduling', icon: Clock, color: 'var(--primary)', description: 'Manage appointments and availability', tools: ['check_schedule', 'check_appointment_types', 'list_upcoming_appointments', 'book_appointment', 'reschedule_appointment', 'cancel_appointment'] },
    { label: 'Insurance', icon: Shield, color: '#34d399', description: 'Verify coverage and eligibility', tools: ['verify_insurance'] },
    { label: 'Triage', icon: AlertCircle, color: '#fbbf24', description: 'Assess urgency and route appropriately', tools: ['assess_urgency'] },
    { label: 'Communication', icon: Phone, color: '#f472b6', description: 'Follow-up, transfers, and notifications', tools: ['transfer_call', 'send_sms', 'create_callback_task'] },
];

function WfArrow({ label }: { label?: string }) {
    return (
        <div className="flex justify-center py-1">
            <div className="flex flex-col items-center">
                <div className="h-5 w-px bg-[var(--border)]" />
                {label && (
                    <span className="my-1 rounded-full bg-[var(--secondary)] px-2 py-0.5 font-mono text-[9px] text-[var(--muted-foreground)]">
                        {label}
                    </span>
                )}
                <div className="h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-[var(--border)]" />
            </div>
        </div>
    );
}

function WfStep({ icon: Icon, title, subtitle, details, color, variant = 'default', tags }: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    details?: { label: string; value: string }[];
    color: string;
    variant?: 'default' | 'highlighted' | 'muted';
    tags?: { label: string; color: string }[];
}) {
    const border = variant === 'highlighted' ? 'border-[var(--primary)]' : 'border-[var(--border)]';
    const bg = variant === 'highlighted' ? 'bg-[var(--primary)]/5' : variant === 'muted' ? 'bg-[var(--secondary)]/50' : 'bg-[var(--card)]';

    return (
        <div className={`w-full max-w-lg rounded-xl border ${border} ${bg} p-4`}>
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
                    <Icon size={17} style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-primary text-[13px] font-semibold text-[var(--foreground)]">{title}</p>
                    {subtitle && <p className="mt-0.5 font-primary text-[11px] leading-relaxed text-[var(--muted-foreground)]">{subtitle}</p>}
                    {details && details?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            {details.map((d) => (
                                <span key={d.label} className="font-mono text-[10px] text-[var(--muted-foreground)]">
                                    <span className="text-[var(--foreground)]/60">{d.label}:</span> {d.value}
                                </span>
                            ))}
                        </div>
                    )}
                    {tags && tags?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {tags.map((tag) => (
                                <span key={tag.label} className="rounded-full px-1.5 py-0.5 font-mono text-[9px] font-medium" style={{ backgroundColor: `${tag.color}15`, color: tag.color }}>
                                    {tag.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AgentWorkflowVisual({ config }: { config: VapiConfiguration | null }) {
    const { t } = useTranslation('settings');
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const wf = (key: string, opts?: Record<string, unknown>) => t(`aiAssistant.workflowVisual.${key}`, opts as never);

    if (!config) {
        return (
            <SectionCard icon={GitBranch} title={wf('title')}>
                <div className="flex flex-col items-center gap-3 p-8">
                    <GitBranch size={24} className="text-[var(--muted-foreground)]" />
                    <p className="font-primary text-[13px] text-[var(--muted-foreground)]">
                        {wf('notConfigured')}
                    </p>
                </div>
            </SectionCard>
        );
    }

    // Derive active tools from synced Vapi function tool IDs
    const toolIds = config.vapi_function_tool_ids ?? [];
    const activeTools = syncedToolOrder.filter((_, i) => i < toolIds?.length);
    const totalTools = activeTools?.length;

    // Filter groups to only show those with at least one active tool
    const activeGroups = toolGroups
        .map((g) => ({ ...g, tools: g.tools.filter((t) => activeTools.includes(t)) }))
        .filter((g) => g.tools?.length > 0);

    // Dynamic feature tags for the assistant step
    const featureTags: { label: string; color: string }[] = [];
    if (config.hipaa_enabled) featureTags.push({ label: 'HIPAA', color: '#34d399' });
    if (config.enable_recording) featureTags.push({ label: 'Recording', color: '#60a5fa' });
    if (config.voicemail_detection_enabled) featureTags.push({ label: 'Voicemail', color: '#a78bfa' });
    if (config.sentiment_analysis_enabled) featureTags.push({ label: 'Sentiment', color: '#fbbf24' });
    if (config.multi_language_enabled) featureTags.push({ label: 'Multi-lang', color: '#f472b6' });
    if (config.interruptions_enabled) featureTags.push({ label: 'Interruptions', color: '#60a5fa' });
    if (config.backchanneling_enabled) featureTags.push({ label: 'Backchanneling', color: '#94a3b8' });

    const truncate = (s: string, max: number) => s?.length > max ? s.slice(0, max - 3) + '...' : s;

    return (
        <SectionCard icon={GitBranch} title={wf('title')}>
            <div className="p-5">
                <p className="mb-6 font-primary text-[12px] text-[var(--muted-foreground)]">
                    {wf('description')}
                </p>

                <div className="flex flex-col items-center gap-0">

                    {/* Step 1: Incoming Call */}
                    <WfStep
                        icon={PhoneCall}
                        title={wf('step1Title')}
                        subtitle={config.vapi_phone_number
                            ? wf('patientDials', { number: config.vapi_phone_number })
                            : wf('patientDialsDefault')}
                        details={[
                            { label: wf('provider'), value: config.vapi_phone_number_provider ?? wf('notConfiguredValue') },
                            { label: wf('maxDuration'), value: `${Math.round(config.max_call_duration_seconds / 60)} ${wf('minSuffix')}` },
                            { label: wf('silenceTimeout'), value: `${config.silence_timeout_seconds}s` },
                        ]}
                        color="var(--primary)"
                        variant="highlighted"
                    />

                    <WfArrow label={config.voicemail_detection_enabled ? wf('voicemailDetectionActive') : undefined} />

                    {/* Step 2: AI Assistant Answers */}
                    <WfStep
                        icon={Bot}
                        title={wf('step2Title')}
                        subtitle={wf('step2Subtitle', { provider: config.model_provider, model: config.model, voiceProvider: config.voice_provider, voiceName: config.voice_name })}
                        details={[
                            { label: wf('temperature'), value: String(config.temperature) },
                            { label: wf('speed'), value: `${config.speaking_rate}x` },
                            { label: wf('language'), value: config.language },
                            { label: wf('transcriber'), value: config.transcriber_provider },
                            { label: wf('firstMessage'), value: config.first_message_mode },
                            ...(config.background_sound !== 'off' ? [{ label: wf('background'), value: config.background_sound }] : []),
                        ]}
                        color="var(--primary)"
                        variant="highlighted"
                        tags={featureTags}
                    />

                    <WfArrow label={wf('assistantSpeaksFirst')} />

                    {/* Step 3: Greeting */}
                    <WfStep
                        icon={MessageSquare}
                        title={wf('step3Title')}
                        subtitle={config.greeting_message
                            ? lang == "en" ? `"${truncate(config.greeting_message, 120)}"` : `"${truncate(config.greeting_message_ar, 120)}"`
                            : wf('defaultGreeting')}
                        color="var(--primary)"
                    />

                    <WfArrow label={wf('listenIdentifyNeeds')} />

                    {/* Step 4: System Prompt / Instructions */}
                    {config.system_prompt && (
                        <>
                            <WfStep
                                icon={ScrollText}
                                title={wf('step4Title')}
                                subtitle={wf('step4Subtitle', { prompt: lang == "en" ? truncate(config.system_prompt, 150) : truncate(config.system_prompt_ar, 150) })}
                                color="#94a3b8"
                                variant="muted"
                            />
                            <WfArrow label={wf('basedOnCallerIntent')} />
                        </>
                    )}

                    {/* Step 5: Tool Capabilities */}
                    {activeGroups?.length > 0 ? (
                        <>
                            <div className="w-full max-w-2xl">
                                <div className="mb-3 text-center">
                                    <p className="font-primary text-[12px] font-semibold text-[var(--foreground)]">
                                        {wf('handleRequest', { step: lang == "en" ? (config.system_prompt ? '5' : '4') : (config.system_prompt_ar ? '5' : '4'), count: totalTools })}
                                    </p>
                                    <p className="font-primary text-[10px] text-[var(--muted-foreground)]">
                                        {wf('toolSelection')}
                                    </p>
                                </div>

                                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(activeGroups?.length, 3)}, minmax(0, 1fr))` }}>
                                    {activeGroups.map((group) => {
                                        const GIcon = group.icon;
                                        return (
                                            <div key={group.label} className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${group.color}15` }}>
                                                        <GIcon size={14} style={{ color: group.color }} />
                                                    </div>
                                                    <div>
                                                        <p className="font-primary text-[12px] font-semibold text-[var(--foreground)]">{group.label}</p>
                                                        <p className="font-primary text-[9px] text-[var(--muted-foreground)]">{group.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    {group.tools.map((t) => (
                                                        <div key={t} className="rounded-lg bg-[var(--secondary)] px-2 py-1.5">
                                                            <p className="font-mono text-[10px] font-medium text-[var(--foreground)]">{t.replace(/_/g, ' ')}</p>
                                                            {toolDescriptions[t] && (
                                                                <p className="font-primary text-[9px] leading-snug text-[var(--muted-foreground)]">{toolDescriptions[t]}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <WfArrow label={wf('conversationComplete')} />
                        </>
                    ) : (
                        <>
                            <div className="flex w-full max-w-lg items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--secondary)]/30 p-4">
                                <AlertCircle size={16} className="shrink-0 text-[var(--muted-foreground)]" />
                                <p className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                    {wf('noToolsSynced')}
                                </p>
                            </div>
                            <WfArrow />
                        </>
                    )}

                    {/* After-hours handling */}
                    {config.after_hours_message && (
                        <>
                            <WfStep
                                icon={Moon}
                                title={wf('afterHoursTitle')}
                                subtitle={`"${lang == "en" ? truncate(config.after_hours_message, 120) : truncate(config.after_hours_message_ar, 120)}"`}
                                details={[{ label: wf('afterHoursNote'), value: wf('afterHoursNoteValue') }]}
                                color="#94a3b8"
                                variant="muted"
                            />
                            <WfArrow />
                        </>
                    )}

                    {/* End Call */}
                    <WfStep
                        icon={PhoneOff}
                        title={wf('endCallTitle', { step: config.system_prompt ? (activeGroups?.length > 0 ? '6' : '5') : (activeGroups?.length > 0 ? '5' : '4') })}
                        subtitle={config.end_call_message
                            ? `"${lang == "en" ? truncate(config.end_call_message, 120) : truncate(config.end_call_message_ar, 120)}"`
                            : wf('endCallDefault')}
                        details={[
                            ...(config.enable_recording ? [{ label: wf('recording'), value: wf('saved') }] : []),
                            ...(config.sentiment_analysis_enabled ? [{ label: wf('sentiment'), value: wf('analyzed') }] : []),
                        ]}
                        color="var(--muted-foreground)"
                        variant="muted"
                    />
                </div>
            </div>
        </SectionCard>
    );
}


// ===================== MAIN COMPONENT =====================

export default function Settings({
    clinic,
    vapiConfiguration,
    vapiKeyConfigured,
    vapiPublicKey,
    knowledgeBaseFiles,
    teamMembers,
    notificationSetting,
    reminderSetting,
    auditLogs,
}: SettingsProps) {
    const { t } = useTranslation('settings');
    const baseTabs = useBaseTabs();
    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return baseTabs.some((tab) => tab.id === hash) ? hash : 'general';
    });

    useEffect(() => {
        window.location.hash = activeTab;
    }, [activeTab]);

    function renderTabContent() {
        switch (activeTab) {
            case 'general':
                if (!clinic) {
                    return (
                        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 text-center">
                            <p className="font-primary text-[13px] text-[var(--muted-foreground)]">{t('page.noClinic')}</p>
                        </div>
                    );
                }
                return <GeneralTab clinic={clinic} />;
            case 'ai-assistant':
                return (
                    <>
                        <VapiConfigCard config={vapiConfiguration} vapiKeyConfigured={vapiKeyConfigured} vapiPublicKey={vapiPublicKey} />
                        <PhoneNumberCard config={vapiConfiguration} />
                        <VapiConfigTab vapiConfiguration={vapiConfiguration} />
                        <KnowledgeBaseCard files={knowledgeBaseFiles} config={vapiConfiguration} />
                        <AgentWorkflowVisual config={vapiConfiguration} />
                    </>
                );
            case 'user-access':
                return <UserAccessTab teamMembers={teamMembers} />;
            case 'notifications':
                return <NotificationsTab notificationSetting={notificationSetting} reminderSetting={reminderSetting} />;
            case 'security':
                return <SecurityTab auditLogs={auditLogs} />;
            default:
                return null;
        }
    }

    return (
        <>
            <Head title={t('page.title')} />
            <FlashMessage />
            <DashboardLayout
                title={t('page.title').toUpperCase()}
                subtitle={t('page.subtitle')}
            >
                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Settings Navigation */}
                    <div className="w-full shrink-0 lg:w-[240px]">
                        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-2">
                            <nav className="flex flex-col gap-0.5">
                                {baseTabs.map((tab) => {
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
                    <div className="flex flex-1 flex-col gap-6">
                        {renderTabContent()}
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
}
