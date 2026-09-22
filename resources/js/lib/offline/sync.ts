import { getCsrfToken } from '@/lib/csrf';
import { editSnapshotKey, offlineDb, type OutboxItem } from '@/lib/offline/db';
import { isLocalChecklistId } from '@/lib/offline/ids';
import { refreshPendingCount } from '@/lib/offline/store';
import {
    setOfflineError,
    setOfflineSyncing,
} from '@/lib/offline/status';

function jsonHeaders(): HeadersInit {
    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': getCsrfToken(),
    };
}

function parseChecklistIdFromUrl(url: string): number | null {
    const match = url.match(/\/inspecciones\/(\d+)(?:\/|$)/);

    return match ? Number(match[1]) : null;
}

async function remapChecklistId(localId: string, serverId: number): Promise<void> {
    const db = await offlineDb();

    if (!db) {
        return;
    }

    const snapshot = await db.editSnapshots.get(editSnapshotKey(localId));
    const photos = await db.photos.where('checklistId').equals(localId).toArray();
    const outbox = await db.outbox.where('checklistId').equals(localId).toArray();

    await db.transaction(
        'rw',
        db.editSnapshots,
        db.photos,
        db.outbox,
        db.idMap,
        async () => {
            await db.idMap.put({ localId, serverId });

            if (snapshot) {
                await db.editSnapshots.delete(editSnapshotKey(localId));
                await db.editSnapshots.put({
                    key: editSnapshotKey(serverId),
                    checklist: { ...snapshot.checklist, id: serverId },
                    updatedAt: Date.now(),
                });
            }

            for (const photo of photos) {
                await db.photos.update(photo.id, {
                    checklistId: String(serverId),
                });
            }

            for (const item of outbox) {
                await db.outbox.put({
                    ...item,
                    checklistId: String(serverId),
                });
            }
        },
    );
}

async function resolveChecklistId(checklistId: string): Promise<string> {
    if (!isLocalChecklistId(checklistId)) {
        return checklistId;
    }

    const db = await offlineDb();
    const mapped = await db?.idMap.get(checklistId);

    return mapped ? String(mapped.serverId) : checklistId;
}

async function syncCreate(item: OutboxItem): Promise<void> {
    const response = await fetch('/inspecciones', {
        method: 'POST',
        credentials: 'same-origin',
        headers: jsonHeaders(),
        body: JSON.stringify({
            unit_id: item.payload.unit_id,
            template_id: item.payload.template_id,
        }),
    });

    if (!response.ok) {
        throw new Error('No se pudo crear la inspección en el servidor.');
    }

    const serverId = parseChecklistIdFromUrl(response.url);

    if (!serverId) {
        throw new Error('El servidor no devolvió la inspección creada.');
    }

    await remapChecklistId(item.checklistId, serverId);
}

async function syncUpdate(item: OutboxItem): Promise<void> {
    const checklistId = await resolveChecklistId(item.checklistId);

    if (isLocalChecklistId(checklistId)) {
        throw new Error('La inspección local todavía no existe en el servidor.');
    }

    const response = await fetch(`/inspecciones/${checklistId}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: jsonHeaders(),
        body: JSON.stringify(item.payload),
    });

    if (!response.ok) {
        throw new Error('No se pudieron guardar las respuestas.');
    }
}

async function syncPhoto(item: OutboxItem): Promise<void> {
    const db = await offlineDb();
    const photoId = String(item.payload.photoId ?? '');
    const photo = await db?.photos.get(photoId);

    if (!photo) {
        return;
    }

    const checklistId = await resolveChecklistId(photo.checklistId);

    if (isLocalChecklistId(checklistId)) {
        throw new Error('La foto espera a que se cree la inspección.');
    }

    const formData = new FormData();
    formData.append('inspection_pass', photo.inspectionPass);
    formData.append(
        'photo',
        photo.blob,
        `inspeccion-${photo.id}.jpg`,
    );
    formData.append('captured_at', photo.capturedAt);

    if (photo.latitude !== null) {
        formData.append('latitude', String(photo.latitude));
    }

    if (photo.longitude !== null) {
        formData.append('longitude', String(photo.longitude));
    }

    if (photo.accuracy !== null) {
        formData.append('accuracy', String(photo.accuracy));
    }

    const response = await fetch(`/inspecciones/${checklistId}/fotos`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getCsrfToken(),
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error('No se pudo subir una foto pendiente.');
    }

    await db?.photos.delete(photo.id);
}

async function syncDeletePhoto(item: OutboxItem): Promise<void> {
    const checklistId = await resolveChecklistId(item.checklistId);
    const photoId = item.payload.photoId;

    if (isLocalChecklistId(checklistId) || typeof photoId !== 'number') {
        return;
    }

    const response = await fetch(
        `/inspecciones/${checklistId}/fotos/${photoId}`,
        {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: jsonHeaders(),
        },
    );

    if (!response.ok && response.status !== 404) {
        throw new Error('No se pudo eliminar una foto pendiente.');
    }
}

async function processItem(item: OutboxItem): Promise<void> {
    switch (item.kind) {
        case 'create':
            await syncCreate(item);
            break;
        case 'update':
            await syncUpdate(item);
            break;
        case 'photo':
            await syncPhoto(item);
            break;
        case 'delete-photo':
            await syncDeletePhoto(item);
            break;
        default:
            break;
    }
}

let flushing = false;

export async function flushOutbox(): Promise<void> {
    const db = await offlineDb();

    if (!db || flushing || !navigator.onLine) {
        return;
    }

    flushing = true;
    setOfflineSyncing(true);

    try {
        const items = await db.outbox.orderBy('createdAt').toArray();

        for (const item of items) {
            try {
                await processItem(item);
                await db.outbox.delete(item.id);
                setOfflineError(null);
            } catch (error) {
                await db.outbox.update(item.id, {
                    attempts: item.attempts + 1,
                    lastError:
                        error instanceof Error
                            ? error.message
                            : 'Error de sincronización',
                });
                setOfflineError(
                    error instanceof Error
                        ? error.message
                        : 'No se pudieron enviar los cambios.',
                );
                break;
            }
        }
    } finally {
        flushing = false;
        setOfflineSyncing(false);
        await refreshPendingCount();
    }
}

let started = false;

export function startOfflineSync(): void {
    if (started || typeof window === 'undefined') {
        return;
    }

    started = true;

    const onOnline = () => {
        void flushOutbox();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
            void flushOutbox();
        }
    });

    void refreshPendingCount();

    if (navigator.onLine) {
        void flushOutbox();
    }
}
