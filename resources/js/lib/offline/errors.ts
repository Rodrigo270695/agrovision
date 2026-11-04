import { isNetworkFailure } from '@/lib/offline/network';

const MAX_SYNC_ATTEMPTS = 8;

export function maxSyncAttempts(): number {
    return MAX_SYNC_ATTEMPTS;
}

export function offlineErrorMessage(error: unknown): string {
    if (isNetworkFailure(error)) {
        return 'Señal inestable. Los cambios siguen en este celular; reintenta sincronizar cuando mejore la red.';
    }

    const raw =
        error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : '';

    return raw || 'No se pudieron enviar los cambios.';
}
