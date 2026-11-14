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

let started = false;

export function reportPresence(): void {
    if (started) {
        return;
    }

    started = true;
    sendPresence();

    window.setInterval(() => {
        if (document.visibilityState === 'visible') {
            sendPresence();
        }
    }, 45_000);

    if (!navigator.geolocation) {
        return;
    }

    let lastGps = 0;

    const push = (position: GeolocationPosition) => {
        if (document.visibilityState !== 'visible') {
            return;
        }

        if (Date.now() - lastGps < 20_000) {
            return;
        }

        lastGps = Date.now();
        sendPresence({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
        });
    };

    navigator.geolocation.watchPosition(push, () => undefined, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
    });
}
