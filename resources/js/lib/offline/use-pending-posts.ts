import { useEffect, useState } from 'react';
import {
    MUTATIONS_EVENT,
    listMutations,
} from '@/lib/offline/mutations';
import type { QueuedMutation } from '@/lib/offline/db';

export function usePendingPosts(url: string): QueuedMutation[] {
    const [rows, setRows] = useState<QueuedMutation[]>([]);

    useEffect(() => {
        let cancelled = false;

        const load = () => {
            void listMutations().then((items) => {
                if (cancelled) {
                    return;
                }

                setRows(
                    items.filter(
                        (item) => item.method === 'POST' && item.url === url,
                    ),
                );
            });
        };

        load();
        window.addEventListener(MUTATIONS_EVENT, load);

        return () => {
            cancelled = true;
            window.removeEventListener(MUTATIONS_EVENT, load);
        };
    }, [url]);

    return rows;
}
