import './i18n';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

let appName = 'Loara';

const savedLang = localStorage.getItem('locale');
if (savedLang) {
    document.documentElement.lang = savedLang;
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
}

createInertiaApp({
    title: (title) => (title ? `${title} — ${appName}` : appName),
    resolve: (name) => {
        const pages = import.meta.glob('./pages/**/*.tsx', { eager: true }) as Record<string, { default: React.ComponentType }>;
        return pages[`./pages/${name}.tsx`];
    },
    setup({ el, App, props }) {
        const shared = (props.initialPage.props as { appName?: string }).appName;
        if (shared) {
            appName = shared;
        }
        el.classList.add('h-full');
        createRoot(el).render(<App {...props} />);
    },
});
