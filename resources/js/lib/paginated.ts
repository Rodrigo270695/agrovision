import type { Paginated, PaginationLink } from '@/types';

type LoosePaginator<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
    path?: string;
    first_page_url?: string | null;
    last_page_url?: string | null;
    next_page_url?: string | null;
    prev_page_url?: string | null;
    links?: PaginationLink[];
};

export function asPaginated<T>(
    meta: LoosePaginator<T>,
    fallbackPath: string,
): Paginated<T> {
    return {
        data: meta.data,
        current_page: meta.current_page,
        last_page: meta.last_page,
        per_page: meta.per_page,
        from: meta.from,
        to: meta.to,
        total: meta.total,
        path: meta.path ?? fallbackPath,
        first_page_url: meta.first_page_url ?? null,
        last_page_url: meta.last_page_url ?? null,
        next_page_url: meta.next_page_url ?? null,
        prev_page_url: meta.prev_page_url ?? null,
        links: meta.links ?? [],
    };
}
