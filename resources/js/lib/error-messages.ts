export type ErrorCopy = {
    title: string;
    message: string;
    hint?: string;
};

export const ERROR_COPY: Record<number, ErrorCopy> = {
    401: {
        title: 'Sesión no iniciada',
        message: 'Inicia sesión para continuar.',
        hint: 'Tip: usa tu correo corporativo para entrar a Agrovisión.',
    },
    402: {
        title: 'Acción no disponible',
        message: 'Esta función no está habilitada en tu cuenta.',
    },
    403: {
        title: 'Sin permiso',
        message:
            'No tienes permiso para ver esto. Si crees que es un error, pide acceso a tu coordinador.',
        hint: 'Tip: el coordinador puede habilitarlo en Roles.',
    },
    404: {
        title: 'Página no encontrada',
        message:
            'Esta ruta no está en el mapa de Agrovisión. Revisa la dirección o entra por el menú.',
        hint: 'Tip: usa el panel para ir a Unidades, Inspecciones o Reportes.',
    },
    419: {
        title: 'La sesión expiró',
        message: 'Tu sesión caducó por inactividad. Vuelve a iniciar sesión.',
    },
    422: {
        title: 'No se pudo completar',
        message: 'Revisa los datos e inténtalo de nuevo.',
    },
    429: {
        title: 'Demasiados intentos',
        message: 'Espera un momento y vuelve a intentarlo.',
    },
    500: {
        title: 'Algo salió mal',
        message:
            'Ocurrió un problema en el servidor. Si descargabas un archivo grande, prueba con un rango de fechas más corto.',
        hint: 'Tip: en consolidados PDF, acota fechas antes de descargar.',
    },
    503: {
        title: 'Servicio en mantenimiento',
        message: 'Estamos actualizando el sistema. Intenta en unos minutos.',
        hint: 'Tip: tus datos de flota siguen guardados; solo pausamos la interfaz.',
    },
};

const ENGLISH_FRAMEWORK =
    /\b(the route|could not be found|unauthenticated|forbidden|not found|server error)\b/i;

export function normalizeErrorCopy(
    status: number,
    title?: string,
    message?: string,
    hint?: string | null,
): ErrorCopy {
    const fallback = ERROR_COPY[status] ?? {
        title: 'Error',
        message:
            'No pudimos completar la acción. Intenta de nuevo o contacta a soporte.',
    };

    const safeMessage =
        message && !ENGLISH_FRAMEWORK.test(message) ? message : fallback.message;

    const safeTitle =
        title && !ENGLISH_FRAMEWORK.test(title) ? title : fallback.title;

    return {
        title: safeTitle,
        message: safeMessage,
        hint: hint ?? fallback.hint,
    };
}