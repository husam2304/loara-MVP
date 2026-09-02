import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { SharedProps } from '@/types';

export function FlashMessage() {
    const { flash } = usePage<SharedProps>().props;
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        if (flash?.success) {
            setMessage(flash.success);
            setType('success');
            setVisible(true);
        } else if (flash?.error) {
            setMessage(flash.error);
            setType('error');
            setVisible(true);
        }
    }, [flash]);

    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => setVisible(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    const Icon = type === 'success' ? CheckCircle2 : XCircle;

    return (
        <div
            className={`fixed end-4 top-4 z-50 flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 shadow-lg ${type === 'success'
                    ? 'border-[var(--success)] bg-[var(--card)] text-[var(--success)]'
                    : 'border-[var(--destructive)] bg-[var(--card)] text-[var(--destructive)]'
                }`}
        >
            <Icon size={16} />
            <span className="font-primary text-[13px] font-medium">{message}</span>
        </div>
    );
}
