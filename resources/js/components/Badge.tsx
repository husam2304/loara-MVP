interface BadgeProps {
    variant: 'success' | 'warning' | 'error' | 'danger' | 'info' | 'default';
    children: React.ReactNode;
}

const variantStyles = {
    success: {
        bg: 'bg-[#22C55E1A]',
        dot: 'bg-[var(--success)]',
        text: 'text-[var(--success)]',
    },
    warning: {
        bg: 'bg-[#F59E0B1A]',
        dot: 'bg-[var(--warning)]',
        text: 'text-[var(--warning)]',
    },
    error: {
        bg: 'bg-[#EF44441A]',
        dot: 'bg-[var(--destructive)]',
        text: 'text-[var(--destructive)]',
    },
    danger: {
        bg: 'bg-[#EF44441A]',
        dot: 'bg-[var(--destructive)]',
        text: 'text-[var(--destructive)]',
    },
    info: {
        bg: 'bg-[#3B82F61A]',
        dot: 'bg-[#3B82F6]',
        text: 'text-[#3B82F6]',
    },
    default: {
        bg: 'bg-[#6B72801A]',
        dot: 'bg-[#6B7280]',
        text: 'text-[#6B7280]',
    },
};

export function Badge({ variant, children }: BadgeProps) {
    const styles = variantStyles[variant];

    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] ${styles.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
            <span className={`font-primary text-[11px] font-medium ${styles.text}`}>
                {children}
            </span>
        </span>
    );
}
