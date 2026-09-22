import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { getCsrfToken } from '@/lib/csrf';
import { offlineDb, type QueuedMutation } from '@/lib/offline/db';
import { newOutboxId } from '@/lib/offline/ids';
import { refreshPendingCount } from '@/lib/offline/store';

export const MUTATIONS_EVENT = 'agrovision:mutations';

type VisitHooks = {
    onSuccess?: (...args: unknown[]) => void;
    onFinish?: (...args: unknown[]) => void;
    onError?: (...args: unknown[]) => void;
};

function notify(): void {
    window.dispatchEvent(new Event(MUTATIONS_EVENT));
}

function cleanBody(body: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(body).filter(([key]) => !key.startsWith('__')),
    );
}

export async function listMutations(): Promise<QueuedMutation[]> {
    const db = await offlineDb();

    if (!db) {
        return [];
    }

    return db.mutations.orderBy('createdAt').toArray();
}

export async function enqueueMutation(input: {
    method: QueuedMutation['method'];
    url: string;
    body?: Record<string, unknown>;
}): Promise<void> {
    const db = await offlineDb();

    if (!db) {
        return;
    }

    const localId = input.url.match(/local-[0-9a-f-]+/i)?.[0];

    if (input.method === 'PUT' && localId) {
        const current = await db.mutations.get(localId);

        if (current) {
            await db.mutations.update(localId, {
                body: { ...current.body, ...cleanBody(input.body ?? {}) },
            });
            await refreshPendingCount();
            notify();

            return;
        }
    }

    if (input.method === 'DELETE' && localId) {
        await db.mutations.delete(localId);
        await refreshPendingCount();
        notify();

        return;
    }

    const id = localId ?? (input.method === 'POST' ? `local-${crypto.randomUUID()}` : newOutboxId());

    await db.mutations.add({
        id,
        method: input.method,
        url: input.method === 'POST' ? input.url : input.url,
        body: {
            ...cleanBody(input.body ?? {}),
            ...(input.method === 'POST' ? { __localId: id } : {}),
        },
        createdAt: Date.now(),
        attempts: 0,
    });
    await refreshPendingCount();
    notify();
}

export async function flushMutations(): Promise<void> {
    const db = await offlineDb();

    if (!db || !navigator.onLine) {
        return;
    }

    const items = await db.mutations.orderBy('createdAt').toArray();

    for (const item of items) {
        const response = await fetch(item.url, {
            method: item.method === 'POST' ? 'POST' : item.method,
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            body:
                item.method === 'DELETE'
                    ? undefined
                    : JSON.stringify(cleanBody(item.body)),
        });

        if (!response.ok && response.status !== 302) {
            await db.mutations.update(item.id, {
                attempts: item.attempts + 1,
                lastError: 'No se pudo enviar este cambio.',
            });
            throw new Error('No se pudo enviar un cambio pendiente.');
        }

        await db.mutations.delete(item.id);
    }

    if (items.length > 0) {
        await refreshPendingCount();
        notify();
        router.reload({ preserveScroll: true, preserveState: false });
    }
}

function splitVisit(
    method: string,
    args: unknown[],
): { body: Record<string, unknown>; options: VisitHooks } {
    if (method === 'delete') {
        return {
            body: {},
            options: (args[1] ?? {}) as VisitHooks,
        };
    }

    const second = args[1];
    const third = args[2];

    if (third && typeof third === 'object') {
        return {
            body: (second ?? {}) as Record<string, unknown>,
            options: third as VisitHooks,
        };
    }

    if (
        second &&
        typeof second === 'object' &&
        ('onSuccess' in second ||
            'onFinish' in second ||
            'preserveScroll' in second ||
            'preserveState' in second)
    ) {
        return { body: {}, options: second as VisitHooks };
    }

    return {
        body: ((second ?? {}) as Record<string, unknown>) ?? {},
        options: {},
    };
}

let routerPatched = false;

export function installOfflineRouter(): void {
    if (routerPatched || typeof window === 'undefined') {
        return;
    }

    routerPatched = true;

    (['post', 'put', 'patch', 'delete'] as const).forEach((method) => {
        const original = router[method].bind(router) as (
            ...args: unknown[]
        ) => void;

        (router as unknown as Record<string, (...args: unknown[]) => void>)[
            method
        ] = (...args: unknown[]) => {
            if (navigator.onLine) {
                return original(...args);
            }

            const { body, options } = splitVisit(method, args);

            if (typeof FormData !== 'undefined' && body instanceof FormData) {
                toast.error(
                    'Sin conexión no se puede enviar este archivo. La pantalla sigue abierta.',
                );
                options.onFinish?.();

                return;
            }

            const httpMethod = method.toUpperCase() as QueuedMutation['method'];

            void enqueueMutation({
                method: httpMethod,
                url: String(args[0] ?? ''),
                body,
            }).then(() => {
                toast.success(
                    'Guardado en este dispositivo. Se enviará al reconectar.',
                );
                options.onSuccess?.();
                options.onFinish?.();
            });
        };
    });
}
