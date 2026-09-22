export function isLocalChecklistId(id: number | string): boolean {
    return String(id).startsWith('local-');
}

export function isLocalPhotoId(id: number | string): boolean {
    return String(id).startsWith('photo-');
}

export function newLocalChecklistId(): string {
    return `local-${crypto.randomUUID()}`;
}

export function newLocalPhotoId(): string {
    return `photo-${crypto.randomUUID()}`;
}

export function newOutboxId(): string {
    return `outbox-${crypto.randomUUID()}`;
}

export function isBrowserOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
}
