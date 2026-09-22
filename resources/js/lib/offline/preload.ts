const TENANT_PAGES = [
    '/dashboard',
    '/pareto',
    '/periodos',
    '/unidades',
    '/inspecciones',
    '/consolidados',
    '/alcoholimetro',
    '/inducciones',
    '/usuarios',
    '/roles',
];

let started = false;

async function warm(path: string, version: string): Promise<void> {
    await fetch(path, {
        credentials: 'same-origin',
        headers: {
            Accept: 'text/html',
        },
    }).catch(() => undefined);

    await fetch(path, {
        credentials: 'same-origin',
        headers: {
            Accept: 'text/html, application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Inertia': 'true',
            'X-Inertia-Version': version,
        },
    }).catch(() => undefined);
}

export function preloadTenantPages(version: string | null | undefined): void {
    if (started || typeof window === 'undefined' || !navigator.onLine) {
        return;
    }

    started = true;

    void (async () => {
        if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.ready.catch(() => undefined);
        }

        for (const path of TENANT_PAGES) {
            if (!navigator.onLine) {
                break;
            }

            await warm(path, version ?? '');
        }
    })();
}
