import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { router } from '@inertiajs/react';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
        router.post('/locale', {
            locale: newLang,
        });
        document.documentElement.lang = newLang;
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        localStorage.setItem('locale', newLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className={`flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-mono text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] ${className}`}
        >
            <Globe size={13} />
            {i18n.language === 'en' ? 'عربي' : 'English'}
        </button>
    );
}
