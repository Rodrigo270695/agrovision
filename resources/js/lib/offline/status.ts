export type OfflineUiStatus = {
    online: boolean;
    pending: number;
    syncing: boolean;
    lastError: string | null;
};

type Listener = (status: OfflineUiStatus) => void;

const listeners = new Set<Listener>();

let current: OfflineUiStatus = {
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    pending: 0,
    syncing: false,
    lastError: null,
};

export function getOfflineStatus(): OfflineUiStatus {
    return current;
}

export function subscribeOfflineStatus(listener: Listener): () => void {
    listeners.add(listener);
    listener(current);

    return () => {
        listeners.delete(listener);
    };
}

export function patchOfflineStatus(partial: Partial<OfflineUiStatus>): void {
    current = { ...current, ...partial };
    listeners.forEach((listener) => listener(current));
}

export function setOfflinePending(pending: number): void {
    patchOfflineStatus({ pending });
}

export function setOfflineSyncing(syncing: boolean): void {
    patchOfflineStatus({ syncing });
}

export function setOfflineError(lastError: string | null): void {
    patchOfflineStatus({ lastError });
}
