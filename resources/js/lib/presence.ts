function csrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

function sendPresence(coords?: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
}): void {
    const body: Record<string, number | null> = {};

    if (coords) {
        body.latitude = coords.latitude;
        body.longitude = coords.longitude;
        body.accuracy = coords.accuracy;
    }

    void fetch('/auditoria/presencia', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': csrfToken(),
        },
        body: JSON.stringify(body),
    }).catch(() => undefined);
}

export function reportPresence(): void {
    const key = 'agrovision-presence-at';

    try {
        const last = Number(sessionStorage.getItem(key) || 0);

        if (Date.now() - last < 10 * 60 * 1000) {
            return;
        }

        sessionStorage.setItem(key, String(Date.now()));
    } catch {
        // El navegador puede bloquear sessionStorage.
    }
    sendPresence();

    if (!navigator.geolocation) {
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            sendPresence({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
            });
        },
        () => undefined,
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
}
