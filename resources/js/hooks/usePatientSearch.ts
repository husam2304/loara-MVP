import axios from 'axios';
import { useEffect, useState } from 'react';

/**
 * Debounced typeahead for clinic patient pickers. While the query is empty it
 * returns the server-seeded `initial` list (recent patients); once the user
 * types it fetches matches from `/patients/search`, so the page never has to
 * load the full patient table to pick one.
 */
export function usePatientSearch<T extends { id: number }>(initial: T[]) {
    const [query, setQuery] = useState('');
    const [remote, setRemote] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const trimmed = query.trim();

        if (!trimmed) {
            setRemote([]);
            setLoading(false);

            return;
        }

        let active = true;
        setLoading(true);

        const handle = setTimeout(() => {
            axios
                .get('/patients/search', { params: { q: trimmed } })
                .then(({ data }) => {
                    if (active) {
                        setRemote((data?.patients ?? []) as T[]);
                    }
                })
                .catch(() => {
                    if (active) {
                        setRemote([]);
                    }
                })
                .finally(() => {
                    if (active) {
                        setLoading(false);
                    }
                });
        }, 250);

        return () => {
            active = false;
            clearTimeout(handle);
        };
    }, [query]);

    const results = query.trim() ? remote : initial.slice(0, 20);

    return { query, setQuery, results, loading };
}
