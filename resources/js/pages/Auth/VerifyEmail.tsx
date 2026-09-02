import { Head, router, usePage } from '@inertiajs/react';
import { Headphones, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { SharedProps } from '@/types';

export default function VerifyEmail() {
    const { t } = useTranslation('auth');
    const { auth, flash } = usePage<SharedProps>().props;
    const [processing, setProcessing] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    function resend() {
        setProcessing(true);
        router.post('/email/verification-notification', {}, {
            onFinish: () => {
                setProcessing(false);
                setCooldown(60);
            },
        });
    }

    return (
        <>
            <Head title="Verify Email" />
            <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
                <div className="w-full max-w-[400px]">
                    {/* Logo */}
                    <div className="mb-8 flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]" onClick={(e) => window.location.href = '/'}>
                            <Headphones size={24} className="text-[var(--primary-foreground)]" />
                        </div>
                        <h1 className="font-mono text-xl font-bold text-[var(--foreground)]">{t('verifyEmail.title')}</h1>
                    </div>

                    {/* Card */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10">
                                <Mail size={24} className="text-[var(--primary)]" />
                            </div>

                            <p className="font-primary text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                                {t('verifyEmail.instructions', { email: auth.user?.email ?? '' })}
                            </p>

                            {flash.success && (
                                <div className="w-full rounded-[var(--radius-md)] border border-[var(--success)]/20 bg-[var(--success)]/5 p-3">
                                    <p className="font-primary text-[12px] text-[var(--success)]">{flash.success}</p>
                                </div>
                            )}

                            <button
                                onClick={resend}
                                disabled={processing || cooldown > 0}
                                className="mt-2 flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] font-primary text-[13px] font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {processing
                                    ? t('verifyEmail.sending')
                                    : cooldown > 0
                                        ? t('verifyEmail.resendIn', { seconds: cooldown })
                                        : t('verifyEmail.resendBtn')}
                            </button>

                            <p className="font-primary text-[11px] text-[var(--muted-foreground)]">
                                {t('verifyEmail.notReceived')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
