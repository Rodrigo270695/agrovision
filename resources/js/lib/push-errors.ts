export function mapPushError(error: unknown): string {
    if (!(error instanceof Error)) {
        return 'No se pudo activar las notificaciones push.';
    }

    const message = error.message.toLowerCase();

    if (message.includes('denied') || message.includes('permission')) {
        return 'Permiso de notificaciones denegado. Actívalo en el navegador.';
    }

    if (message.includes('vapid')) {
        return 'Clave VAPID inválida en el servidor. Regenera las keys.';
    }

    if (message.includes('service worker') || message.includes('sw.js')) {
        return error.message;
    }

    return error.message || 'No se pudo activar las notificaciones push.';
}

export function isPushServiceError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    return /push service|registration failed|abortError/i.test(error.message);
}
