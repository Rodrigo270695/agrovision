import { router } from '@inertiajs/react';
import { Camera, ImagePlus, MapPin, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export type ChecklistPhoto = {
    id: number;
    inspection_pass: 'first' | 'second';
    url: string;
    captured_at: string | null;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
};

type GeoMeta = {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    capturedAt: Date;
};

type Props = {
    checklistId: number;
    photos: ChecklistPhoto[];
    showFirst?: boolean;
    showSecond?: boolean;
    readonly?: boolean;
    readonlyFirst?: boolean;
    readonlySecond?: boolean;
};

function formatStampDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalización no disponible'));

            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0,
        });
    });
}

async function stampPhoto(file: File, geo: GeoMeta): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 1600;
    const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const dateLine = formatStampDate(geo.capturedAt);
    const gpsLine =
        geo.latitude !== null && geo.longitude !== null
            ? `GPS ${geo.latitude.toFixed(6)}, ${geo.longitude.toFixed(6)}${
                  geo.accuracy !== null
                      ? ` (±${Math.round(geo.accuracy)}m)`
                      : ''
              }`
            : 'GPS no disponible';

    const fontSize = Math.max(14, Math.round(width * 0.028));
    const padding = Math.round(fontSize * 0.7);
    const lineHeight = Math.round(fontSize * 1.35);
    const boxHeight = padding * 2 + lineHeight * 2;
    const boxY = height - boxHeight;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, boxY, width, boxHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(dateLine, padding, boxY + padding);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillText(gpsLine, padding, boxY + padding + lineHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.85);
    });

    if (!blob) {
        return file;
    }

    return new File([blob], `inspeccion-${Date.now()}.jpg`, {
        type: 'image/jpeg',
    });
}

function PhotoPassSection({
    checklistId,
    pass,
    title,
    photos,
    readonly = false,
}: {
    checklistId: number;
    pass: 'first' | 'second';
    title: string;
    photos: ChecklistPhoto[];
    readonly?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCapture = async (file: File | null) => {
        if (!file || uploading) {
            return;
        }

        setError(null);
        setUploading(true);

        const capturedAt = new Date();
        let geo: GeoMeta = {
            latitude: null,
            longitude: null,
            accuracy: null,
            capturedAt,
        };

        try {
            const position = await getCurrentPosition();
            geo = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                capturedAt,
            };
        } catch {
            // Continúa sin GPS; el sello lo indica.
        }

        try {
            const stamped = await stampPhoto(file, geo);
            const formData = new FormData();
            formData.append('inspection_pass', pass);
            formData.append('photo', stamped);
            // Hora local del dispositivo (Perú); evita guardar UTC crudo.
            const localStamp = [
                capturedAt.getFullYear(),
                '-',
                String(capturedAt.getMonth() + 1).padStart(2, '0'),
                '-',
                String(capturedAt.getDate()).padStart(2, '0'),
                'T',
                String(capturedAt.getHours()).padStart(2, '0'),
                ':',
                String(capturedAt.getMinutes()).padStart(2, '0'),
                ':',
                String(capturedAt.getSeconds()).padStart(2, '0'),
            ].join('');
            formData.append('captured_at', localStamp);

            if (geo.latitude !== null) {
                formData.append('latitude', String(geo.latitude));
            }

            if (geo.longitude !== null) {
                formData.append('longitude', String(geo.longitude));
            }

            if (geo.accuracy !== null) {
                formData.append('accuracy', String(geo.accuracy));
            }

            router.post(`/inspecciones/${checklistId}/fotos`, formData, {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    setUploading(false);

                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                },
                onError: () => {
                    setError('No se pudo subir la foto. Intenta de nuevo.');
                },
            });
        } catch {
            setUploading(false);
            setError('No se pudo procesar la foto.');

            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    };

    const handleDelete = (photoId: number) => {
        if (deletingId) {
            return;
        }

        setDeletingId(photoId);

        router.delete(`/inspecciones/${checklistId}/fotos/${photoId}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    return (
        <div className="rounded-xl border border-[#e2eaf3] bg-[#f8fafc] p-3.5 sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-[#1a2b4c]">
                        {title}
                    </h3>
                    <p className="text-[11px] text-[#5a7390]">
                        La foto incluye fecha, hora y GPS (si el celular lo
                        permite).
                    </p>
                </div>

                <div className="flex gap-2">
                    {!readonly ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={uploading}
                                onClick={() => {
                                    if (inputRef.current) {
                                        inputRef.current.setAttribute(
                                            'capture',
                                            'environment',
                                        );
                                        inputRef.current.click();
                                    }
                                }}
                                className="h-10 flex-1 cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white sm:h-9 sm:flex-none"
                            >
                                {uploading ? (
                                    <Spinner />
                                ) : (
                                    <Camera className="size-4" />
                                )}
                                Cámara
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={uploading}
                                onClick={() => {
                                    if (inputRef.current) {
                                        inputRef.current.removeAttribute(
                                            'capture',
                                        );
                                        inputRef.current.click();
                                    }
                                }}
                                className="h-10 flex-1 cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white sm:h-9 sm:flex-none"
                            >
                                <ImagePlus className="size-4" />
                                Galería
                            </Button>
                        </>
                    ) : null}
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) =>
                        handleCapture(event.target.files?.[0] ?? null)
                    }
                />
            </div>

            {error ? (
                <p className="mb-2 text-xs text-red-600">{error}</p>
            ) : null}

            {photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#c5d5e6] bg-white px-3 py-8 text-center">
                    <ImagePlus className="mb-2 size-6 text-[#6b8ead]" />
                    <p className="text-xs text-[#6b8ead]">
                        Sin fotos en esta inspección
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {photos.map((photo) => (
                        <figure
                            key={photo.id}
                            className="group relative overflow-hidden rounded-lg border border-[#d7e3f0] bg-white"
                        >
                            <a
                                href={photo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                            >
                                <img
                                    src={photo.url}
                                    alt={`Foto ${title}`}
                                    className="aspect-[4/3] w-full object-cover"
                                />
                            </a>
                            <figcaption className="space-y-0.5 p-2 text-[10px] leading-tight text-[#5a7390]">
                                <p className="font-medium text-[#1a2b4c]">
                                    {photo.captured_at || 'Sin fecha'}
                                </p>
                                {photo.latitude !== null &&
                                photo.longitude !== null ? (
                                    <p className="inline-flex items-start gap-1">
                                        <MapPin className="mt-0.5 size-3 shrink-0 text-[#2e5a9e]" />
                                        <span>
                                            {photo.latitude.toFixed(5)},{' '}
                                            {photo.longitude.toFixed(5)}
                                        </span>
                                    </p>
                                ) : (
                                    <p>GPS no disponible</p>
                                )}
                            </figcaption>
                            {!readonly ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={deletingId === photo.id}
                                    onClick={() => handleDelete(photo.id)}
                                    className={cn(
                                        'absolute right-1 top-1 size-8 bg-black/50 text-white hover:bg-red-600 hover:text-white',
                                    )}
                                    aria-label="Eliminar foto"
                                >
                                    {deletingId === photo.id ? (
                                        <Spinner />
                                    ) : (
                                        <Trash2 className="size-3.5" />
                                    )}
                                </Button>
                            ) : null}
                        </figure>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ChecklistPhotosSection({
    checklistId,
    photos,
    showFirst = true,
    showSecond = true,
    readonly = false,
    readonlyFirst,
    readonlySecond,
}: Props) {
    const firstPhotos = photos.filter(
        (photo) => photo.inspection_pass === 'first',
    );
    const secondPhotos = photos.filter(
        (photo) => photo.inspection_pass === 'second',
    );

    return (
        <div className="rounded-2xl border border-[#d7e3f0] bg-white p-3 shadow-sm sm:p-5">
            <div className="mb-3">
                <h2 className="text-sm font-semibold text-[#1a2b4c]">
                    Evidencias fotográficas
                </h2>
                <p className="text-xs text-[#5a7390]">
                    Las fotos incluyen fecha, hora y GPS para el reporte.
                </p>
            </div>

            <div className="space-y-3">
                {showFirst ? (
                    <PhotoPassSection
                        checklistId={checklistId}
                        pass="first"
                        title="1ra inspección"
                        photos={firstPhotos}
                        readonly={readonlyFirst ?? readonly}
                    />
                ) : null}
                {showSecond ? (
                    <PhotoPassSection
                        checklistId={checklistId}
                        pass="second"
                        title="2da inspección"
                        photos={secondPhotos}
                        readonly={readonlySecond ?? readonly}
                    />
                ) : null}
            </div>
        </div>
    );
}
