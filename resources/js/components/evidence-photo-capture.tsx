import { Camera, MapPin, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type EvidencePhoto = {
    id: string;
    previewUrl: string;
    dataUrl: string;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    captured_at: string;
    checklist_item_id?: string | null;
};

type Props = {
    photos: EvidencePhoto[];
    onChange: (photos: EvidencePhoto[]) => void;
    className?: string;
};

async function readFileAsDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

async function stampPhoto(
    dataUrl: string,
    meta: {
        latitude: number | null;
        longitude: number | null;
        captured_at: string;
    },
): Promise<string> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return dataUrl;
    }

    ctx.drawImage(image, 0, 0);

    const pad = Math.max(16, Math.round(image.width * 0.02));
    const lineHeight = Math.max(28, Math.round(image.width * 0.035));
    const boxHeight = lineHeight * 3 + pad * 2;
    ctx.fillStyle = 'rgba(10, 24, 16, 0.72)';
    ctx.fillRect(0, image.height - boxHeight, image.width, boxHeight);

    ctx.fillStyle = '#f4f7f2';
    ctx.font = `600 ${Math.max(18, Math.round(image.width * 0.028))}px sans-serif`;
    const dateLabel = new Date(meta.captured_at).toLocaleString('es-PE');
    const geoLabel =
        meta.latitude !== null && meta.longitude !== null
            ? `${meta.latitude.toFixed(6)}, ${meta.longitude.toFixed(6)}`
            : 'Sin GPS';

    ctx.fillText(`Agrovisión SST · ${dateLabel}`, pad, image.height - boxHeight + pad + lineHeight);
    ctx.fillText(`Ubicación: ${geoLabel}`, pad, image.height - boxHeight + pad + lineHeight * 2);

    return canvas.toDataURL('image/jpeg', 0.75);
}

async function readGeolocation(): Promise<{
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
}> {
    if (!('geolocation' in navigator)) {
        return { latitude: null, longitude: null, accuracy: null };
    }

    try {
        const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 0,
                });
            },
        );

        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
        };
    } catch {
        return { latitude: null, longitude: null, accuracy: null };
    }
}

export default function EvidencePhotoCapture({
    photos,
    onChange,
    className,
}: Props) {
    const inputId = useId();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFiles = async (files: FileList | null) => {
        if (!files?.length) {
            return;
        }

        setBusy(true);
        setError(null);

        try {
            const geo = await readGeolocation();
            const capturedAt = new Date().toISOString();
            const next = [...photos];

            for (const file of Array.from(files)) {
                if (!file.type.startsWith('image/')) {
                    continue;
                }

                const original = await readFileAsDataUrl(file);
                const stamped = await stampPhoto(original, {
                    latitude: geo.latitude,
                    longitude: geo.longitude,
                    captured_at: capturedAt,
                });

                next.push({
                    id: crypto.randomUUID(),
                    previewUrl: stamped,
                    dataUrl: stamped,
                    latitude: geo.latitude,
                    longitude: geo.longitude,
                    accuracy: geo.accuracy,
                    captured_at: capturedAt,
                });
            }

            onChange(next);
        } catch {
            setError('No se pudo capturar la foto. Revisa permisos de cámara/GPS.');
        } finally {
            setBusy(false);
        }
    };

    const removePhoto = (id: string) => {
        onChange(photos.filter((photo) => photo.id !== id));
    };

    return (
        <div className={cn('space-y-3', className)}>
            <div className="flex flex-wrap items-center gap-2">
                <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(event) => {
                        void handleFiles(event.target.files);
                        event.target.value = '';
                    }}
                />
                <Button
                    type="button"
                    className="h-11 bg-[#1f4d34] hover:bg-[#163828]"
                    disabled={busy}
                    onClick={() => document.getElementById(inputId)?.click()}
                >
                    <Camera className="size-4" />
                    {busy ? 'Procesando...' : 'Tomar / subir foto'}
                </Button>
                <p className="text-xs text-neutral-500">
                    Se guarda con fecha, hora y ubicación GPS.
                </p>
            </div>

            {error ? (
                <p className="text-sm text-red-600">{error}</p>
            ) : null}

            {photos.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {photos.map((photo) => (
                        <article
                            key={photo.id}
                            className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
                        >
                            <img
                                src={photo.previewUrl}
                                alt="Evidencia de inspección"
                                className="aspect-4/3 w-full object-cover"
                            />
                            <div className="space-y-1 p-3 text-xs text-neutral-600 dark:text-neutral-300">
                                <p>
                                    {new Date(photo.captured_at).toLocaleString(
                                        'es-PE',
                                    )}
                                </p>
                                <p className="flex items-center gap-1">
                                    <MapPin className="size-3.5" />
                                    {photo.latitude !== null &&
                                    photo.longitude !== null
                                        ? `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`
                                        : 'GPS no disponible'}
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => removePhoto(photo.id)}
                                >
                                    <Trash2 className="size-3.5" />
                                    Quitar
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
                    Aún no hay evidencias fotográficas.
                </div>
            )}
        </div>
    );
}
