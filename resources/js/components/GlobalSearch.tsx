import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, User, Stethoscope, Calendar, Loader2 } from 'lucide-react';
import { router } from '@inertiajs/react';

interface SearchResult {
    id: number;
    type: 'patient' | 'provider' | 'appointment';
    title: string;
    subtitle: string;
    url: string;
    status?: string;
    color?: string;
    is_active?: boolean;
}

const TYPE_ICONS = {
    patient: User,
    provider: Stethoscope,
    appointment: Calendar,
} as const;

const TYPE_LABELS = {
    patient: 'Patients',
    provider: 'Providers',
    appointment: 'Appointments',
} as const;

export function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const search = useCallback(async (q: string) => {
        if (q.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/search?q=${encodeURIComponent(q)}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) {
                const data = await res.json();
                setResults(data.results);
                setIsOpen(data.results.length > 0);
                setActiveIndex(-1);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    function handleChange(value: string) {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(value), 300);
    }

    function navigate(result: SearchResult) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        router.visit(result.url);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (!isOpen || results.length === 0) {
            if (e.key === 'Escape') {
                setQuery('');
                setIsOpen(false);
                inputRef.current?.blur();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0) {
                    navigate(results[activeIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setQuery('');
                inputRef.current?.blur();
                break;
        }
    }

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard shortcut: Cmd/Ctrl + K
    useEffect(() => {
        function handleGlobalKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        }
        document.addEventListener('keydown', handleGlobalKey);
        return () => document.removeEventListener('keydown', handleGlobalKey);
    }, []);

    // Group results by type
    const grouped = results.reduce(
        (acc, result) => {
            if (!acc[result.type]) acc[result.type] = [];
            acc[result.type].push(result);
            return acc;
        },
        {} as Record<string, SearchResult[]>,
    );

    let flatIndex = -1;

    return (
        <div ref={containerRef} className="relative hidden sm:block">
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3">
                {loading ? (
                    <Loader2 size={14} className="animate-spin text-[var(--muted-foreground)]" />
                ) : (
                    <Search size={14} className="text-[var(--muted-foreground)]" />
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleChange(e.target.value)}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search..."
                    className="h-[34px] w-[180px] bg-transparent font-primary text-[13px] text-[var(--foreground)] placeholder-[#52525B] outline-none"
                />
                <kbd className="hidden rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)] lg:inline-block">
                    ⌘K
                </kbd>
            </div>

            {/* Results dropdown */}
            {isOpen && (
                <div className="absolute end-0 top-full z-50 mt-1.5 w-[360px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-lg">
                    <div className="max-h-[320px] overflow-y-auto p-1.5">
                        {Object.entries(grouped).map(([type, items]) => (
                            <div key={type}>
                                <div className="px-2.5 pb-1 pt-2">
                                    <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                                        {TYPE_LABELS[type as keyof typeof TYPE_LABELS]}
                                    </span>
                                </div>
                                {items.map((result) => {
                                    flatIndex++;
                                    const currentIndex = flatIndex;
                                    const Icon = TYPE_ICONS[result.type];
                                    return (
                                        <button
                                            key={`${result.type}-${result.id}`}
                                            onClick={() => navigate(result)}
                                            onMouseEnter={() => setActiveIndex(currentIndex)}
                                            className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-start transition-colors ${currentIndex === activeIndex
                                                ? 'bg-[var(--accent)]'
                                                : 'hover:bg-[var(--secondary)]'
                                                }`}
                                        >
                                            {result.type === 'provider' && result.color ? (
                                                <span
                                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                                                    style={{ backgroundColor: result.color }}
                                                >
                                                    <Icon size={13} />
                                                </span>
                                            ) : (
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--muted-foreground)]">
                                                    <Icon size={13} />
                                                </span>
                                            )}
                                            <div className="flex min-w-0 flex-1 flex-col">
                                                <span className="truncate font-primary text-[13px] font-medium text-[var(--foreground)]">
                                                    {result.title}
                                                </span>
                                                <span className="truncate font-primary text-[11px] text-[var(--muted-foreground)]">
                                                    {result.subtitle}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
