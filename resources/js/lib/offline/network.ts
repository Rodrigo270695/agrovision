/** Errores típicos de red flaky (campo / agro sin señal estable). */
export function isNetworkFailure(error: unknown): boolean {
    if (error instanceof TypeError) {
        return true;
    }

    if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
        return error.name === 'AbortError' || error.name === 'TimeoutError';
    }

    const raw =
        error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : '';

    return (
        raw === 'Failed to fetch' ||
        raw === 'NetworkError when attempting to fetch resource.' ||
        raw === 'Load failed' ||
        raw === 'The user aborted a request.' ||
        /failed to fetch|networkerror|load failed|aborted|timeout/i.test(raw)
    );
}

export function isNetworkResponseFailure(response: Response): boolean {
    return response.status === 0 || response.type === 'error';
}

/**
 * fetch con reintentos cortos y timeout. Útil cuando navigator.onLine
 * dice "sí" pero la señal del campo se cae a mitad de la subida.
 */
export async function fetchWithNetworkRetry(
    input: RequestInfo | URL,
    init: RequestInit,
    options?: {
        tries?: number;
        timeoutMs?: number;
        onBeforeRetry?: () => Promise<void>;
        csrfToken?: () => string;
    },
): Promise<Response> {
    const tries = options?.tries ?? 3;
    const timeoutMs = options?.timeoutMs ?? 25_000;
    let lastError: unknown;

    for (let attempt = 0; attempt < tries; attempt++) {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), timeoutMs);

        try {
            const headers = new Headers(init.headers);

            if (options?.csrfToken) {
                headers.set('X-XSRF-TOKEN', options.csrfToken());
            }

            const response = await fetch(input, {
                ...init,
                headers,
                signal: controller.signal,
            });

            window.clearTimeout(timer);

            if (response.status === 419 && attempt < tries - 1) {
                await options?.onBeforeRetry?.();
                continue;
            }

            return response;
        } catch (error) {
            window.clearTimeout(timer);
            lastError = error;

            if (attempt < tries - 1) {
                await new Promise((resolve) =>
                    setTimeout(resolve, 500 * (attempt + 1)),
                );
            }
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error('Failed to fetch');
}
