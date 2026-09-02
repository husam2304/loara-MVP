import type { LucideIcon } from 'lucide-react';

interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'ghost';
    icon?: LucideIcon;
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
}

const variantClasses = {
    primary: 'bg-[var(--primary)] text-[var(--primary-foreground)]',
    secondary: 'bg-[var(--secondary)] text-[var(--foreground)] border border-[var(--border)]',
    ghost: 'text-[var(--muted-foreground)]',
};

export function Button({ variant = 'primary', icon: Icon, children, onClick, disabled, title, className = '', type = 'button' }: ButtonProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3.5 py-2 font-primary text-[13px] font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
        >
            {Icon && <Icon size={14} />}
            {children}
        </button>
    );
}
