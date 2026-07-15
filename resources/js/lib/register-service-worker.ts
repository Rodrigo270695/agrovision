const SW_ACTIVATION_TIMEOUT_MS = 20_000;
const CONTROLLER_WAIT_MS = 5_000;

let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

export function isServiceWorkerRegistrationError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    return /service worker|sw\.js/i.test(error.message);
}

function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

async function waitForControllingServiceWorker(): Promise<void> {
    if (!isBrowser() || !('serviceWorker' in navigator)) {
        return;
    }

    if (navigator.serviceWorker.controller) {
        return;
    }

    await navigator.serviceWorker.ready;

    if (navigator.serviceWorker.controller) {
        return;
    }

    await Promise.race([
        new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener(
                'controllerchange',
                () => resolve(),
                { once: true },
            );
        }),
        delay(CONTROLLER_WAIT_MS),
    ]);
}

async function waitUntilActive(
    registration: ServiceWorkerRegistration,
): Promise<ServiceWorkerRegistration> {
    const deadline = Date.now() + SW_ACTIVATION_TIMEOUT_MS;

    while (!registration.active) {
        const worker = registration.installing ?? registration.waiting;

        if (worker?.state === 'installed' && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        if (Date.now() >= deadline) {
            throw new Error(
                'El service worker no se activó. Recarga la página e inténtalo de nuevo.',
            );
        }

        await delay(200);
    }

    return registration;
}

async function ensureControllingPage(): Promise<void> {
    await waitForControllingServiceWorker();

    if (navigator.serviceWorker.controller) {
        sessionStorage.removeItem('agrovision:sw-controller-reload');

        return;
    }

    const reloadKey = 'agrovision:sw-controller-reload';

    if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        await new Promise<void>(() => {
            // reload corta el flujo
        });
    }
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!isBrowser() || !('serviceWorker' in navigator)) {
        throw new Error('Service worker not supported');
    }

    const existing = await navigator.serviceWorker.getRegistration('/');

    if (existing?.active) {
        await ensureControllingPage();

        return existing;
    }

    const response = await fetch('/sw.js', {
        method: 'HEAD',
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('No se pudo registrar el service worker (/sw.js).');
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
    });

    await waitUntilActive(registration);
    await ensureControllingPage();

    if (!registration.active) {
        throw new Error(
            'No hay service worker activo. Recarga la página e inténtalo de nuevo.',
        );
    }

    return registration;
}

export function isServiceWorkerControlling(): boolean {
    return isBrowser() && Boolean(navigator.serviceWorker.controller);
}

export function resetServiceWorkerRegistration(): void {
    registrationPromise = null;
}

export function waitForServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!isBrowser()) {
        return Promise.reject(new Error('Service worker not supported'));
    }

    if (!registrationPromise) {
        registrationPromise = ensureServiceWorker().catch((error) => {
            registrationPromise = null;
            throw error;
        });
    }

    return registrationPromise;
}

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!isBrowser()) {
        return null;
    }

    try {
        return await waitForServiceWorker();
    } catch (error) {
        console.error('Service worker registration failed:', error);

        return null;
    }
}
