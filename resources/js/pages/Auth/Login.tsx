import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Headphones, LogIn } from 'lucide-react';
import { FormEvent } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface DemoCredential {
    label: string;
    email: string;
    password: string;
}

interface LoginProps {
    demoMode?: boolean;
    demoCredentials?: DemoCredential[];
}

export default function Login({ demoMode = false, demoCredentials = [] }: LoginProps) {
    const { t } = useTranslation('login');
    const pageProps = usePage().props as { flash?: { success?: string }; appName?: string };
    const flash = pageProps.flash;
    const appName = pageProps.appName ?? 'Loara';
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post('/login');
    }

    function loginAs(cred: DemoCredential) {
        // Reflect the choice in the form, then log in directly so the values
        // used are not subject to React state timing.
        setData({ email: cred.email, password: cred.password, remember: false });
        router.post('/login', { email: cred.email, password: cred.password, remember: false });
    }

    return (
        <>
            <Head title={t('title')} />
            <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
                <div className="absolute top-6 end-6">
                    <LanguageSwitcher />
                </div>
                <div className="w-full max-w-[400px]">
                    {/* Logo */}
                    <div className="mb-8 flex flex-col items-center gap-3" >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]" onClick={(e) => window.location.href = '/'}>
                            <Headphones size={24} className="text-[var(--primary-foreground)]" />
                        </div>
                        <h1 className="font-mono text-xl font-bold text-[var(--foreground)]">
                            {appName}
                        </h1>
                        <p className="font-primary text-sm text-[var(--muted-foreground)]">
                            {t('subtitle', 'Sign in to your account')}
                        </p>
                    </div>

                    {flash?.success && (
                        <div className="mb-4 rounded-[var(--radius-md)] border border-green-200 bg-green-50 px-3 py-2 text-center font-primary text-[12px] text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                            {flash.success}
                        </div>
                    )}

                    {/* Login Card */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* Email */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="email" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                    {t('emailLabel', 'EMAIL')}
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    autoComplete="email"
                                    autoFocus
                                    className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                    placeholder={t('emailPlaceholder')}
                                />
                                {errors.email && (
                                    <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.email}</span>
                                )}
                            </div>

                            {/* Password */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="font-mono text-[11px] font-medium text-[var(--muted-foreground)]">
                                        {t('passwordLabel', 'PASSWORD')}
                                    </label>
                                    <a href="/forgot-password" className="font-primary text-[11px] text-[var(--primary)] hover:underline">
                                        {t('forgotPassword', 'Forgot password?')}
                                    </a>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    autoComplete="current-password"
                                    className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                                    placeholder={t('passwordPlaceholder')}
                                />
                                {errors.password && (
                                    <span className="font-primary text-[12px] text-[var(--destructive)]">{errors.password}</span>
                                )}
                            </div>

                            {/* Remember me */}
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="h-4 w-4 rounded border-[var(--border)] bg-[var(--secondary)] text-[var(--primary)] accent-[var(--primary)]"
                                />
                                <span className="font-primary text-[13px] text-[var(--muted-foreground)]">
                                    {t('rememberMe', 'Remember me')}
                                </span>
                            </label>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="mt-2 flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] font-primary text-[13px] font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {processing ? t('signingIn') : t('signIn')}
                            </button>
                        </form>
                    </div>

                    {demoMode && demoCredentials.length > 0 && (
                        <div className="mt-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--primary)]/40 bg-[var(--primary)]/5 p-4">
                            <p className="mb-1 text-center font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--primary)]">
                                {t('demoAccounts', 'Demo accounts')}
                            </p>
                            <p className="mb-3 text-center font-primary text-[11px] text-[var(--muted-foreground)]">
                                {t('clickToSignIn', 'Click to sign in instantly')}
                            </p>
                            <div className="flex flex-col gap-2">
                                {demoCredentials.map((cred) => (
                                    <button
                                        key={cred.email}
                                        type="button"
                                        onClick={() => loginAs(cred)}
                                        disabled={processing}
                                        className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-start transition-colors hover:border-[var(--primary)] disabled:opacity-50"
                                    >
                                        <span className="flex flex-col">
                                            <span className="font-primary text-[13px] font-medium text-[var(--foreground)]">{cred.label}</span>
                                            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{cred.email} · {cred.password}</span>
                                        </span>
                                        <LogIn size={15} className="shrink-0 text-[var(--primary)]" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="mt-4 text-center font-primary text-[12px] text-[var(--muted-foreground)]">
                        {t('noAccount')}{' '}
                        <a href="/register" className="text-[var(--primary)] hover:underline">{t('signUp')}</a>
                    </p>
                </div>
            </div>
        </>
    );
}
