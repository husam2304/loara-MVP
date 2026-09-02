import { Head, useForm, usePage } from '@inertiajs/react';
import { Headphones } from 'lucide-react';
import { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

export default function ForgotPassword() {
    const { t } = useTranslation('auth');
    const pageProps = usePage().props as { flash?: { success?: string }; appName?: string };
    const flash = pageProps.flash;
    const appName = pageProps.appName ?? 'Loara';
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post('/forgot-password');
    }

    return (
        <>
            <Head title="Forgot Password" />
            <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
                <div className="w-full max-w-[400px]">
                    <div className="mb-8 flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]" onClick={(e) => window.location.href = '/'}>
                            <Headphones size={24} className="text-[var(--primary-foreground)]" />
                        </div>
                        <h1 className="font-mono text-xl font-bold text-[var(--foreground)]">{appName}</h1>
                        <p className="font-primary text-sm text-[var(--muted-foreground)]">
                            {t('forgotPassword.title')}
                        </p>
                    </div>

                    {flash?.success && (
                        <div className="mb-4 rounded-[var(--radius-md)] border border-green-200 bg-green-50 px-3 py-2 text-center font-primary text-[12px] text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                            {flash.success}
                        </div>
                    )}

                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
                        <p className="mb-4 font-primary text-[13px] text-[var(--muted-foreground)]">
                            {t('forgotPassword.instructions')}
                        </p>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="email" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                    {t('forgotPassword.email')}
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    autoComplete="email"
                                    autoFocus
                                    className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                    placeholder={t('forgotPassword.emailPlaceholder')}
                                />
                                {errors.email && (
                                    <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.email}</span>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="mt-2 flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] font-primary text-[13px] font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {processing ? t('forgotPassword.sending') : t('forgotPassword.sendBtn')}
                            </button>
                        </form>
                    </div>

                    <p className="mt-4 text-center font-primary text-[12px] text-[var(--muted-foreground)]">
                        {t('forgotPassword.rememberedIt')}{' '}
                        <a href="/login" className="text-[var(--primary)] hover:underline">{t('forgotPassword.backToSignIn')}</a>
                    </p>
                </div>
            </div>
        </>
    );
}
