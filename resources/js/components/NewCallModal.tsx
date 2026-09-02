import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import {
    Phone,
    Users,
    Loader2,
    AlertCircle,
    CheckCircle2,
    PhoneCall,
    PhoneOff,
    ArrowLeft,
} from 'lucide-react';
import { Modal } from './Modal';
import type { SharedProps, OutboundCallInfo, CallStatusResponse } from '@/types';

interface NewCallModalProps {
    open: boolean;
    onClose: () => void;
}

type CallMode = 'single' | 'batch';
type ModalView = 'form' | 'status';

const STATUS_LABELS: Record<string, string> = {
    queued: 'Queued',
    ringing: 'Ringing',
    in_progress: 'In Progress',
    completed: 'Completed',
    ended: 'Ended',
    failed: 'Failed',
    missed: 'Missed',
    transferred: 'Transferred',
    voicemail: 'Voicemail',
};

const STATUS_COLORS: Record<string, string> = {
    queued: 'text-yellow-400',
    ringing: 'text-blue-400',
    in_progress: 'text-green-400',
    completed: 'text-[var(--muted-foreground)]',
    ended: 'text-[var(--muted-foreground)]',
    failed: 'text-red-400',
    missed: 'text-orange-400',
    transferred: 'text-purple-400',
    voicemail: 'text-[var(--muted-foreground)]',
};

const ACTIVE_STATUSES = ['queued', 'ringing', 'in_progress'];

function isCallActive(status: string): boolean {
    return ACTIVE_STATUSES.includes(status);
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function NewCallModal({ open, onClose }: NewCallModalProps) {
    const [mode, setMode] = useState<CallMode>('single');
    const [batchInput, setBatchInput] = useState('');
    const [view, setView] = useState<ModalView>('form');
    const [activeCalls, setActiveCalls] = useState<OutboundCallInfo[]>([]);
    const [callStatuses, setCallStatuses] = useState<Record<number, CallStatusResponse>>({});
    const [elapsed, setElapsed] = useState(0);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const callStartRef = useRef<number | null>(null);
    const { props } = usePage<SharedProps>();

    const singleForm = useForm({
        mode: 'single' as const,
        phone_number: '',
        name: '',
    });

    const batchForm = useForm({
        mode: 'batch' as const,
        phone_numbers: [] as string[],
    });

    const processing = mode === 'single' ? singleForm.processing : batchForm.processing;
    const errors = mode === 'single' ? singleForm.errors : batchForm.errors;

    // Fetch status for all active calls
    const pollStatuses = useCallback(async () => {
        const callsToCheck = activeCalls.filter((c) => {
            const currentStatus = callStatuses[c.id]?.status ?? c.status;
            return isCallActive(currentStatus);
        });

        if (callsToCheck.length === 0) {
            // All calls ended, stop polling
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        const results = await Promise.allSettled(
            callsToCheck.map((c) =>
                fetch(`/call-center/calls/${c.id}/status`, {
                    headers: { Accept: 'application/json' },
                }).then((res) => res.json() as Promise<CallStatusResponse>),
            ),
        );

        setCallStatuses((prev) => {
            const updated = { ...prev };
            results.forEach((result, i) => {
                if (result.status === 'fulfilled') {
                    updated[callsToCheck[i].id] = result.value;
                }
            });
            return updated;
        });
    }, [activeCalls, callStatuses]);

    // Start polling when entering status view
    useEffect(() => {
        if (view === 'status' && activeCalls.length > 0) {
            // Initial fetch
            pollStatuses();

            // Poll every 3 seconds
            pollingRef.current = setInterval(pollStatuses, 3000);

            // Elapsed timer (ticks every second)
            callStartRef.current = Date.now();
            setElapsed(0);
            timerRef.current = setInterval(() => {
                if (callStartRef.current) {
                    setElapsed(Math.floor((Date.now() - callStartRef.current) / 1000));
                }
            }, 1000);

            return () => {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };
        }
    }, [view, activeCalls.length]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleSingleSubmit(e: FormEvent) {
        e.preventDefault();
        singleForm.post('/call-center', {
            preserveState: true,
            onSuccess: (page) => {
                const flash = (page.props as unknown as SharedProps).flash;
                const outboundCalls = flash?.outbound_calls;
                if (outboundCalls && outboundCalls.length > 0) {
                    setActiveCalls(outboundCalls);
                    setCallStatuses({});
                    setView('status');
                }
            },
        });
    }

    function handleBatchSubmit(e: FormEvent) {
        e.preventDefault();
        const numbers = batchInput
            .split(/[\n,;]+/)
            .map((n) => n.trim())
            .filter(Boolean);

        batchForm.transform((data) => ({ ...data, phone_numbers: numbers }));
        batchForm.post('/call-center', {
            preserveState: true,
            onSuccess: (page) => {
                const flash = (page.props as unknown as SharedProps).flash;
                const outboundCalls = flash?.outbound_calls;
                if (outboundCalls && outboundCalls.length > 0) {
                    setActiveCalls(outboundCalls);
                    setCallStatuses({});
                    setView('status');
                }
            },
        });
    }

    function handleNewCall() {
        singleForm.clearErrors();
        batchForm.clearErrors();
        singleForm.reset();
        batchForm.reset();
        setBatchInput('');
        setActiveCalls([]);
        setCallStatuses({});
        setElapsed(0);
        callStartRef.current = null;
        setView('form');
    }

    function handleClose() {
        // Stop polling
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        handleNewCall();
        onClose();
    }

    const parsedNumbers = batchInput
        .split(/[\n,;]+/)
        .map((n) => n.trim())
        .filter(Boolean);

    // Check if any call is still active
    const anyActive = activeCalls.some((c) => {
        const status = callStatuses[c.id]?.status ?? c.status;
        return isCallActive(status);
    });

    return (
        <Modal open={open} onClose={handleClose} title={view === 'form' ? 'NEW_OUTBOUND_CALL' : 'CALL_STATUS'}>
            {/* Flash error (shown in both views) */}
            {props.flash?.error && (
                <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/10 px-3 py-2">
                    <AlertCircle size={14} className="shrink-0 text-red-400" />
                    <p className="font-primary text-[12px] text-red-400">{props.flash.error}</p>
                </div>
            )}

            {/* ===== STATUS VIEW ===== */}
            {view === 'status' && (
                <div className="flex flex-col gap-4">
                    {/* Elapsed timer */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {anyActive && (
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                                </span>
                            )}
                            <span className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                {anyActive ? 'LIVE' : 'ENDED'}
                            </span>
                        </div>
                        <span className="font-mono text-[13px] tabular-nums text-[var(--foreground)]">
                            {formatDuration(elapsed)}
                        </span>
                    </div>

                    {/* Call list */}
                    <div className="flex flex-col gap-2">
                        {activeCalls.map((call) => {
                            const liveStatus = callStatuses[call.id];
                            const status = liveStatus?.status ?? call.status;
                            const duration = liveStatus?.duration_seconds;
                            const endReason = liveStatus?.end_reason;
                            const active = isCallActive(status);

                            return (
                                <div
                                    key={call.id}
                                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2.5"
                                >
                                    <div className={`shrink-0 ${active ? 'animate-pulse' : ''}`}>
                                        {active ? (
                                            <PhoneCall size={16} className="text-green-400" />
                                        ) : (
                                            <PhoneOff size={16} className="text-[var(--muted-foreground)]" />
                                        )}
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate font-primary text-[13px] font-medium text-[var(--foreground)]">
                                                {call.name || call.phone}
                                            </span>
                                            <span className={`shrink-0 font-mono text-[11px] font-medium ${STATUS_COLORS[status] ?? 'text-[var(--muted-foreground)]'}`}>
                                                {STATUS_LABELS[status] ?? status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {call.name && (
                                                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                                                    {call.phone}
                                                </span>
                                            )}
                                            {duration != null && duration > 0 && (
                                                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                                                    {formatDuration(duration)}
                                                </span>
                                            )}
                                            {endReason && !active && (
                                                <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                                                    {endReason}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Transcript preview (single call only) */}
                    {activeCalls.length === 1 && callStatuses[activeCalls[0].id]?.transcript && (
                        <div className="flex flex-col gap-1.5">
                            <span className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                TRANSCRIPT
                            </span>
                            <div className="max-h-[120px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2">
                                <p className="font-primary text-[12px] leading-relaxed text-[var(--foreground)]">
                                    {callStatuses[activeCalls[0].id].transcript}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleNewCall}
                            className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--foreground)] transition-opacity hover:opacity-80"
                        >
                            <ArrowLeft size={14} />
                            New Call
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* ===== FORM VIEW ===== */}
            {view === 'form' && (
                <>
                    {/* Flash success */}
                    {props.flash?.success && (
                        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-green-500/20 bg-green-500/10 px-3 py-2">
                            <CheckCircle2 size={14} className="shrink-0 text-green-400" />
                            <p className="font-primary text-[12px] text-green-400">{props.flash.success}</p>
                        </div>
                    )}

                    {/* Mode Tabs */}
                    <div className="mb-5 flex rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] p-0.5">
                        <button
                            type="button"
                            onClick={() => setMode('single')}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 font-primary text-[12px] font-medium transition-colors ${
                                mode === 'single'
                                    ? 'bg-[var(--accent)] text-[var(--foreground)]'
                                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                            }`}
                        >
                            <Phone size={13} />
                            Call One
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('batch')}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 font-primary text-[12px] font-medium transition-colors ${
                                mode === 'batch'
                                    ? 'bg-[var(--accent)] text-[var(--foreground)]'
                                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                            }`}
                        >
                            <Users size={13} />
                            Call Many
                        </button>
                    </div>

                    {/* Single Call Form */}
                    {mode === 'single' && (
                        <form onSubmit={handleSingleSubmit} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                    Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    value={singleForm.data.phone_number}
                                    onChange={(e) => singleForm.setData('phone_number', e.target.value)}
                                    placeholder="+14155551234"
                                    className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[#52525B] outline-none transition-colors focus:border-[var(--primary)]"
                                />
                                {errors.phone_number && (
                                    <p className="font-primary text-[11px] text-red-400">{errors.phone_number}</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                    Name (optional)
                                </label>
                                <input
                                    type="text"
                                    value={singleForm.data.name}
                                    onChange={(e) => singleForm.setData('name', e.target.value)}
                                    placeholder="John Doe"
                                    className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[#52525B] outline-none transition-colors focus:border-[var(--primary)]"
                                />
                                {errors.name && (
                                    <p className="font-primary text-[11px] text-red-400">{errors.name}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={processing || !singleForm.data.phone_number}
                                className="mt-1 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Calling...
                                    </>
                                ) : (
                                    <>
                                        <Phone size={14} />
                                        Start Call
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Batch Call Form */}
                    {mode === 'batch' && (
                        <form onSubmit={handleBatchSubmit} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                        Phone Numbers *
                                    </label>
                                    {parsedNumbers.length > 0 && (
                                        <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                                            {parsedNumbers.length} number{parsedNumbers.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <textarea
                                    value={batchInput}
                                    onChange={(e) => setBatchInput(e.target.value)}
                                    placeholder={"+14155551234\n+14155555678\n+14155559012"}
                                    rows={5}
                                    className="resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2.5 font-mono text-[12px] text-[var(--foreground)] placeholder-[#52525B] outline-none transition-colors focus:border-[var(--primary)]"
                                />
                                <p className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                    One number per line, or comma-separated. E.164 format required. Max 50.
                                </p>
                                {errors.phone_numbers && (
                                    <p className="font-primary text-[11px] text-red-400">{errors.phone_numbers}</p>
                                )}
                                {Object.entries(errors)
                                    .filter(([key]) => key.startsWith('phone_numbers.'))
                                    .map(([key, msg]) => (
                                        <p key={key} className="font-primary text-[11px] text-red-400">{msg}</p>
                                    ))}
                            </div>

                            <button
                                type="submit"
                                disabled={processing || parsedNumbers.length === 0}
                                className="mt-1 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Calling {parsedNumbers.length} numbers...
                                    </>
                                ) : (
                                    <>
                                        <Users size={14} />
                                        Start {parsedNumbers.length} Call{parsedNumbers.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </>
            )}
        </Modal>
    );
}
