import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { enqueueMutation } from '@/lib/offline/mutations';
import { isBrowserOnline } from '@/lib/offline/ids';
import { flushOutbox } from '@/lib/offline/sync';
import type { QueuedMutation } from '@/lib/offline/db';

type VisitMethod = 'post' | 'put' | 'patch' | 'delete';

type VisitOptions = {
    preserveScroll?: boolean;
    preserveState?: boolean;
    forceFormData?: boolean;
    only?: string[];
    onSuccess?: (...args: unknown[]) => void;
    onError?: (...args: unknown[]) => void;
    onFinish?: (...args: unknown[]) => void;
    /** Se llama cuando el cambio quedó en cola local (offline o red flaky). */
    onQueued?: () => void;
    queuedMessage?: string;
};

type PendingVisit = {
    id: string;
    method: QueuedMutation['method'];
    url: string;
    body: Record<string, unknown> | FormData;
    onQueued?: () => void;
    queuedMessage?: string;
};

const pendingById = new Map<string, PendingVisit>();
let listenerInstalled = false;

function ensureNetworkListener(): void {
    if (listenerInstalled || typeof window === 'undefined') {
        return;
    }

    listenerInstalled = true;

    router.on('networkError', () => {
        const pending = [...pendingById.values()];
        pendingById.clear();

        if (pending.length === 0) {
            return;
        }

        void (async () => {
            for (const item of pending) {
                await enqueueMutation({
                    method: item.method,
                    url: item.url,
                    body: item.body,
                });
                item.onQueued?.();
            }

            toast.success(
                pending[0]?.queuedMessage ??
                    'Señal inestable. Quedó en el dispositivo y se enviará al reconectar.',
            );
            void flushOutbox();
        })();
    });
}

/**
 * Mutación Inertia con fallback a cola IndexedDB si no hay red
 * o si la petición muere a mitad (señal de agro).
 */
export function visitOrQueue(
    method: VisitMethod,
    url: string,
    data: Record<string, unknown> | FormData = {},
    options: VisitOptions = {},
): void {
    ensureNetworkListener();

    const httpMethod = method.toUpperCase() as QueuedMutation['method'];
    const queuedMessage =
        options.queuedMessage ??
        'Guardado en el dispositivo. Se enviará al reconectar.';

    const finish = () => options.onFinish?.();

    if (!isBrowserOnline()) {
        void enqueueMutation({
            method: httpMethod,
            url,
            body: data,
        }).then(() => {
            toast.success(queuedMessage);
            options.onQueued?.();
            options.onSuccess?.();
            finish();
        });

        return;
    }

    const visitId = crypto.randomUUID();
    pendingById.set(visitId, {
        id: visitId,
        method: httpMethod,
        url,
        body: data,
        onQueued: options.onQueued,
        queuedMessage,
    });

    const clear = () => {
        pendingById.delete(visitId);
    };

    const visitOptions = {
        preserveScroll: options.preserveScroll,
        preserveState: options.preserveState,
        forceFormData: options.forceFormData,
        only: options.only,
        onSuccess: (...args: unknown[]) => {
            clear();
            options.onSuccess?.(...args);
        },
        onError: (...args: unknown[]) => {
            clear();
            options.onError?.(...args);
        },
        onFinish: () => {
            // Si networkError ya encoló, el id ya no está.
            // Si terminó OK o con error de validación, limpiamos.
            window.setTimeout(clear, 0);
            finish();
        },
    };

    if (method === 'delete') {
        router.delete(url, visitOptions);

        return;
    }

    router[method](url, data, visitOptions);
}
