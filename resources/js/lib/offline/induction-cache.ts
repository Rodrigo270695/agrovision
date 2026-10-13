import { isBrowserOnline } from '@/lib/offline/ids';
import {
    getInductionSnapshot,
    saveInductionSnapshot,
} from '@/lib/offline/store';

type MediaProps = {
    induction?: {
        speaker_signature_url?: string | null;
        verification_photo_url?: string | null;
        attendees?: Array<{
            signature_url?: string | null;
            fingerprint_url?: string | null;
            saved_signature_url?: string | null;
            saved_fingerprint_url?: string | null;
        }>;
        regulations?: Array<{ url?: string | null }>;
    };
};

function collectMedia(props: MediaProps): string[] {
    const urls = new Set<string>();
    const induction = props.induction;

    if (!induction) {
        return [];
    }

    if (induction.speaker_signature_url) {
        urls.add(induction.speaker_signature_url);
    }

    if (induction.verification_photo_url) {
        urls.add(induction.verification_photo_url);
    }

    for (const attendee of induction.attendees ?? []) {
        for (const url of [
            attendee.signature_url,
            attendee.fingerprint_url,
            attendee.saved_signature_url,
            attendee.saved_fingerprint_url,
        ]) {
            if (url) {
                urls.add(url);
            }
        }
    }

    for (const file of induction.regulations ?? []) {
        if (file.url) {
            urls.add(file.url);
        }
    }

    return [...urls];
}

export async function prefetchInductionShows(
    ids: Array<number | string>,
    version: string | null | undefined,
): Promise<void> {
    if (!isBrowserOnline()) {
        return;
    }

    for (const id of ids) {
        if (typeof id !== 'number' || !navigator.onLine) {
            continue;
        }

        try {
            const response = await fetch(`/inducciones/${id}`, {
                credentials: 'same-origin',
                headers: {
                    Accept: 'text/html, application/json',
                    'X-Inertia': 'true',
                    'X-Inertia-Version': version ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                continue;
            }

            const type = response.headers.get('content-type') ?? '';

            if (!type.includes('json')) {
                continue;
            }

            const payload = (await response.json()) as {
                props?: MediaProps & Record<string, unknown>;
            };

            if (!payload.props?.induction) {
                continue;
            }

            const previous = await getInductionSnapshot(id);
            const known = new Set(
                collectMedia((previous ?? {}) as MediaProps),
            );

            await saveInductionSnapshot(id, payload.props);

            const freshMedia = collectMedia(payload.props).filter(
                (url) => !known.has(url),
            );

            await Promise.all(
                freshMedia.map((url) =>
                    fetch(url, { credentials: 'same-origin' }).catch(
                        () => undefined,
                    ),
                ),
            );

            await fetch(`/inducciones/${id}`, {
                credentials: 'same-origin',
                headers: { Accept: 'text/html' },
            }).catch(() => undefined);
        } catch {
            // La siguiente inducción sigue disponible para el caché.
        }
    }
}
