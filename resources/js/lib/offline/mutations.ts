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

type StoredFile = {
    key: string;
    blob: Blob;
    filename: string;
};

function cleanBody(body: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(body).filter(([key]) => !key.startsWith('__')),
    );
}

function formDataToBody(formData: FormData): Record<string, unknown> {
    const body: Record<string, unknown> = { __formData: true };
    const files: StoredFile[] = [];

    formData.forEach((value, key) => {
        if (typeof value === 'string') {
            body[key] = value;

            return;
        }

        files.push({
            key,
            blob: value,
            filename: value.name || 'archivo',
        });
    });

    if (files.length > 0) {
        body.__files = files;
    }

    return body;
}

function storedBody(
    body: Record<string, unknown> | FormData | undefined,
): Record<string, unknown> {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
        return formDataToBody(body);
    }

    return cleanBody(body ?? {});
}

function localResourceId(url: string): string | null {
    const match = url.match(/\/(local-[0-9a-f-]+)\/?$/i);

    return match?.[1] ?? null;
}

function isFormDataMutation(body: Record<string, unknown>): boolean {
    return body.__formData === true;
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
    body?: Record<string, unknown> | FormData;
}): Promise<void> {
    const db = await offlineDb();

    if (!db) {
        return;
    }

    const localId = localResourceId(input.url);
    const nextBody = storedBody(input.body);

    if ((input.method === 'PUT' || input.method === 'PATCH') && localId) {
        const current = await db.mutations.get(localId);

        if (current) {
            const merged: Record<string, unknown> = {
                ...current.body,
                ...cleanBody(nextBody),
            };

            if (Array.isArray(nextBody.__files)) {
                merged.__formData = true;
                merged.__files = nextBody.__files;
            }

            await db.mutations.update(localId, {
                body: merged,
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

    const id =
        input.method === 'POST' ? `local-${crypto.randomUUID()}` : newOutboxId();

    await db.mutations.add({
        id,
        method: input.method,
        url: input.url,
        body: {
            ...nextBody,
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
        const formData = isFormDataMutation(item.body);
        const files = Array.isArray(item.body.__files)
            ? (item.body.__files as StoredFile[])
            : [];
        let method = item.method;
        let payload: BodyInit | undefined;

        if (item.method === 'DELETE') {
            payload = undefined;
        } else if (formData) {
            const form = new FormData();

            Object.entries(item.body).forEach(([key, value]) => {
                if (key.startsWith('__') || value == null || typeof value === 'object') {
                    return;
                }

                form.append(key, String(value));
            });
            files.forEach((file) => {
                form.append(file.key, file.blob, file.filename);
            });

            if (method !== 'POST') {
                form.append('_method', method);
                method = 'POST';
            }

            payload = form;
        } else {
            payload = JSON.stringify(cleanBody(item.body));
        }

        const response = await fetch(item.url, {
            method,
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                ...(formData ? {} : { 'Content-Type': 'application/json' }),
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            body: payload,
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
            const url = String(args[0] ?? '');

            if (/\/local-[0-9a-f-]+\//i.test(url)) {
                toast.error(
                    'Este registro todavía está en el dispositivo. Complétalo cuando vuelva la señal.',
                );
                options.onFinish?.();

                return;
            }

            const httpMethod = method.toUpperCase() as QueuedMutation['method'];

            void enqueueMutation({
                method: httpMethod,
                url,
                body: body as Record<string, unknown> | FormData,
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
