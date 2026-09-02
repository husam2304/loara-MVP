import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Wrench, CheckCircle2, XCircle, Play, Pause, Download, Bot, User } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';

interface CallDetail {
    id: number;
    direction: 'inbound' | 'outbound';
    status: string;
    caller_phone: string | null;
    caller_name: string | null;
    patient: { id: number; first_name: string; last_name: string; phone: string | null } | null;
    started_at: string | null;
    answered_at: string | null;
    ended_at: string | null;
    duration_seconds: number | null;
    ai_handled: boolean;
    ai_confidence_score: number | null;
    sentiment: string | null;
    language: string | null;
    resolution: string | null;
    summary: string | null;
    transcripts: { speaker: string; content: string; timestamp_ms: number }[];
    recording: { url: string; duration_seconds: number | null; format: string | null; is_redacted: boolean } | null;
    tool_invocations: { tool_name: string; success: boolean; duration_ms: number; error_message: string | null; created_at: string }[];
}

interface CallDetailModalProps {
    callId: number | null;
    onClose: () => void;
}

// Speakers that represent the assistant side of the conversation.
const AGENT_SPEAKERS = new Set(['ai', 'assistant', 'agent', 'bot']);
// Speakers that are internal setup, never meant for display (system prompts, tool scaffolding, etc.)
const HIDDEN_SPEAKERS = new Set(['system', 'tool']);

// Rough check for RTL scripts (Arabic + Hebrew blocks) so each bubble reads in its own
// natural direction regardless of the overall call language.
const RTL_PATTERN = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
function textDir(text: string): 'rtl' | 'ltr' {
    return RTL_PATTERN.test(text) ? 'rtl' : 'ltr';
}

function formatClockTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function CallAudioPlayer({ url, isRedacted, label }: { url: string; isRedacted: boolean; label: string }) {
    const { t } = useTranslation('callCenter');
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const isRtl = document.documentElement.dir === 'rtl';

    if (isRedacted) {
        return (
            <p className="font-primary text-[12px] text-[var(--muted-foreground)]">
                {t('callDetail.redacted', 'This recording has been redacted.')}
            </p>
        );
    }

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;
        const value = Number(e.target.value);
        audio.currentTime = value;
        setCurrentTime(value);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2.5">
            <audio
                ref={audioRef}
                src={url}
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onLoadedMetadata={(e) => {
                    setDuration(e.currentTarget.duration || 0);
                    setIsLoaded(true);
                }}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
            <button
                type="button"
                onClick={togglePlay}
                disabled={!isLoaded}
                aria-label={isPlaying ? t('callDetail.pause', 'Pause') : t('callDetail.play', 'Play')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] transition-opacity disabled:opacity-50"
            >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ms-0.5" />}
            </button>

            <div className="flex flex-1 items-center gap-2">
                <span className="w-9 shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted-foreground)]">
                    {formatDuration(currentTime)}
                </span>
                <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={!isLoaded}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--secondary)] accent-[var(--primary)]"
                    style={{
                        background: `linear-gradient(to ${isRtl ? 'left' : 'right'}, var(--primary) ${progress}%, var(--secondary) ${progress}%)`,
                    }}
                    aria-label={label}
                />
                <span className="w-9 shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted-foreground)]">
                    {duration ? formatDuration(duration) : '—:--'}
                </span>
            </div>

            <a
                href={url}
                download
                aria-label={t('callDetail.download', 'Download recording')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
            >
                <Download size={14} />
            </a>
        </div>
    );
}

export function CallDetailModal({ callId, onClose }: CallDetailModalProps) {
    const { t } = useTranslation("callCenter");
    const [detail, setDetail] = useState<CallDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!callId) {
            setDetail(null);
            return;
        }
        setLoading(true);
        setError(null);
        fetch(`/call-center/calls/${callId}`, { headers: { Accept: 'application/json' } })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load call detail');
                return res.json();
            })
            .then((data: CallDetail) => setDetail(data))
            .catch(() => setError(t('callDetail.loadError', 'Could not load this call.')))
            .finally(() => setLoading(false));
    }, [callId, t]);

    const callerName = detail?.patient ? `${detail.patient.first_name} ${detail.patient.last_name}` : detail?.caller_name || t('callLog.unknown');

    // Filter out system/tool scaffolding lines and empty silence markers before rendering.
    const visibleTranscripts = useMemo(() => {
        if (!detail) return [];
        return detail.transcripts.filter((line) => {
            if (HIDDEN_SPEAKERS.has(line.speaker.toLowerCase())) return false;
            return line.content.trim().length > 0;
        });
    }, [detail]);

    // Prefer the explicit duration; fall back to computing it from the call timestamps.
    const displayDuration = useMemo(() => {
        if (detail?.duration_seconds) return detail.duration_seconds;
        if (detail?.started_at && detail?.ended_at) {
            const seconds = (new Date(detail.ended_at).getTime() - new Date(detail.started_at).getTime()) / 1000;
            return seconds > 0 ? Math.round(seconds) : null;
        }
        return null;
    }, [detail]);

    return (
        <Modal open={callId !== null} onClose={onClose} title={t('callDetail.title', 'CALL DETAIL')} size="xl">
            {loading && (
                <div className="flex items-center justify-center gap-2 py-10 text-[var(--muted-foreground)]">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="font-primary text-[13px]">{t('common.loading', 'Loading...')}</span>
                </div>
            )}

            {error && (
                <div className="py-6 text-center font-primary text-[13px] text-[var(--destructive)]">{error}</div>
            )}

            {detail && !loading && (
                <div className="flex flex-col gap-5">
                    {/* Summary header */}
                    <div className="grid grid-cols-2 gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-4 sm:grid-cols-4">
                        <div>
                            <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">{t('callLog.columns.caller')}</div>
                            <div className="font-primary text-[13px] font-medium text-[var(--foreground)]">{callerName}</div>
                        </div>
                        <div>
                            <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">{t('callLog.columns.phone')}</div>
                            <div className="font-mono text-[13px] text-[var(--foreground)]">
                                {detail.caller_phone && detail.caller_phone !== 'unknown' ? detail.caller_phone : t('callDetail.unknownPhone', 'Unknown (web call)')}
                            </div>
                        </div>
                        <div>
                            <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">{t('callLog.columns.duration')}</div>
                            <div className="font-mono text-[13px] text-[var(--foreground)]">
                                {displayDuration !== null ? formatDuration(displayDuration) : '—'}
                            </div>
                        </div>
                        <div>
                            <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">{t('callLog.columns.status')}</div>
                            <Badge variant={detail.resolution ? 'success' : 'warning'}>{detail.resolution || detail.status}</Badge>
                        </div>
                        {detail.sentiment && (
                            <div>
                                <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">{t('callDetail.sentiment', 'Sentiment')}</div>
                                <div className="font-primary text-[13px] text-[var(--foreground)] capitalize">{detail.sentiment}</div>
                            </div>
                        )}
                        {detail.language && (
                            <div>
                                <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">{t('callDetail.language', 'Language')}</div>
                                <div className="font-primary text-[13px] text-[var(--foreground)] uppercase">{detail.language}</div>
                            </div>
                        )}
                        {detail.ai_confidence_score !== null && (
                            <div>
                                <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)]">{t('callDetail.confidence', 'AI Confidence')}</div>
                                <div className="font-mono text-[13px] text-[var(--foreground)]">{Math.round(detail.ai_confidence_score * 100)}%</div>
                            </div>
                        )}
                    </div>

                    {/* Summary text */}
                    {detail.summary && (
                        <div>
                            <div className="mb-1 font-mono text-[11px] font-medium uppercase text-[var(--muted-foreground)]">{t('callDetail.summary', 'Summary')}</div>
                            <p dir={textDir(detail.summary)} className="font-primary text-[13px] leading-relaxed text-[var(--foreground)]">{detail.summary}</p>
                        </div>
                    )}

                    {/* Recording */}
                    {detail.recording && (
                        <div>
                            <div className="mb-1 font-mono text-[11px] font-medium uppercase text-[var(--muted-foreground)]">{t('callDetail.recording', 'Recording')}</div>
                            <CallAudioPlayer
                                url={detail.recording.url}
                                isRedacted={detail.recording.is_redacted}
                                label={t('callDetail.recording', 'Recording')}
                            />
                        </div>
                    )}

                    {/* Transcript */}
                    <div>
                        <div className="mb-2 font-mono text-[11px] font-medium uppercase text-[var(--muted-foreground)]">{t('callDetail.transcript', 'Transcript')}</div>
                        {visibleTranscripts.length === 0 ? (
                            <p className="font-primary text-[12px] text-[var(--muted-foreground)]">{t('callDetail.noTranscript', 'No transcript available for this call.')}</p>
                        ) : (
                            <div className="flex max-h-96 flex-col gap-3 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                                {visibleTranscripts.map((line, i) => {
                                    const isAgent = AGENT_SPEAKERS.has(line.speaker.toLowerCase());
                                    const dir = textDir(line.content);
                                    const speakerLabel = isAgent
                                        ? t('callDetail.speakerAgent', 'Assistant')
                                        : t('callDetail.speakerCaller', 'Caller');

                                    return (
                                        <div key={i} className={`flex items-end gap-2 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}>
                                            <div
                                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isAgent ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'bg-[var(--secondary)] text-[var(--muted-foreground)]'
                                                    }`}
                                            >
                                                {isAgent ? <Bot size={13} /> : <User size={13} />}
                                            </div>
                                            <div className={`flex max-w-[78%] flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
                                                <div
                                                    className={`rounded-[var(--radius-md)] px-3 py-2 ${isAgent ? 'rounded-es-sm bg-[var(--secondary)] text-[var(--foreground)]' : 'rounded-ee-sm bg-[var(--primary)]/10 text-[var(--foreground)]'
                                                        }`}
                                                >
                                                    <div
                                                        dir={dir}
                                                        className="font-primary text-[13px] leading-snug"
                                                        style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
                                                    >
                                                        {line.content}
                                                    </div>
                                                </div>
                                                <div className="mt-1 flex items-center gap-1.5 px-1 font-mono text-[10px] uppercase text-[var(--muted-foreground)]">
                                                    <span>{speakerLabel}</span>
                                                    <span>·</span>
                                                    <span>{formatClockTime(line.timestamp_ms)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Tool invocation log */}
                    {detail.tool_invocations.length > 0 && (
                        <div>
                            <div className="mb-2 font-mono text-[11px] font-medium uppercase text-[var(--muted-foreground)]">{t('callDetail.toolLog', 'Tool Activity')}</div>
                            <div className="flex flex-col divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border)]">
                                {detail.tool_invocations.map((tool, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <Wrench size={13} className="text-[var(--muted-foreground)]" />
                                            <span className="font-mono text-[12px] text-[var(--foreground)]">{tool.tool_name}</span>
                                            {tool.success ? (
                                                <CheckCircle2 size={13} className="text-[var(--success)]" />
                                            ) : (
                                                <XCircle size={13} className="text-[var(--destructive)]" />
                                            )}
                                        </div>
                                        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{tool.duration_ms}ms</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}