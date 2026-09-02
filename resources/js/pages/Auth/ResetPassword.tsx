import { Head, useForm, usePage } from '@inertiajs/react';
import { Headphones } from 'lucide-react';
import { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface ResetPasswordProps {
    token: string;
    email: string;
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { t } = useTranslation('auth');
    const appName = (usePage().props as { appName?: string }).appName ?? 'Loara';
    const { data, setData, post, processing, errors } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post('/reset-password');
    }

    return (
        <>
            <Head title="Reset Password" />
            <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
                <div className="w-full max-w-[400px]">
                    <div className="mb-8 flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]" onClick={(e) => window.location.href = '/'}>
                            <Headphones size={24} className="text-[var(--primary-foreground)]" />
                        </div>
                        <h1 className="font-mono text-xl font-bold text-[var(--foreground)]">{appName}</h1>
                        <p className="font-primary text-sm text-[var(--muted-foreground)]">
                            {t('resetPassword.title')}
                        </p>
                    </div>

                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="email" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                    {t('resetPassword.email')}
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    autoComplete="email"
                                    className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                    placeholder={t('resetPassword.emailPlaceholder')}
                                />
                                {errors.email && (
                                    <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.email}</span>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="password" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                    {t('resetPassword.newPassword')}
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    autoComplete="new-password"
                                    autoFocus
                                    className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                    placeholder={t('resetPassword.newPasswordPlaceholder')}
                                />
                                {errors.password && (
                                    <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.password}</span>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="password_confirmation" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                    {t('resetPassword.confirmPassword')}
                                </label>
                                <input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    autoComplete="new-password"
                                    className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                    placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="mt-2 flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] font-primary text-[13px] font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {processing ? t('resetPassword.resetting') : t('resetPassword.resetBtn')}
                            </button>
                        </form>
                    </div>

                    <p className="mt-4 text-center font-primary text-[12px] text-[var(--muted-foreground)]">
                        <a href="/login" className="text-[var(--primary)] hover:underline">{t('resetPassword.backToSignIn')}</a>
                    </p>
                </div>
            </div>
        </>
    );
}
