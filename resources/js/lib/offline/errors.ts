const MAX_SYNC_ATTEMPTS = 5;

export function maxSyncAttempts(): number {
    return MAX_SYNC_ATTEMPTS;
}

export function offlineErrorMessage(error: unknown): string {
    const raw =
        error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : '';

    if (
        raw === 'Failed to fetch' ||
        raw === 'NetworkError when attempting to fetch resource.' ||
        raw === 'Load failed' ||
        /failed to fetch/i.test(raw)
    ) {
        return 'Sin señal estable. Reintenta sincronizar; si sigue igual, quita los pendientes de este celular.';
    }

    if (raw === 'The user aborted a request.') {
        return 'La sincronización se interrumpió. Vuelve a intentar.';
    }

    return raw || 'No se pudieron enviar los cambios.';
}
