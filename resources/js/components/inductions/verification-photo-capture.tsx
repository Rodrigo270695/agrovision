import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type Props = {
    existingUrl?: string | null;
    disabled?: boolean;
    saving?: boolean;
    onSave: (dataUrl: string) => void;
    onRemove?: () => void;
};

async function fileToCompressedDataUrl(file: File): Promise<string> {
    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
            img.src = objectUrl;
        });

        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No se pudo preparar la imagen.');
        }

        ctx.drawImage(image, 0, 0, width, height);

        return canvas.toDataURL('image/jpeg', 0.72);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export function VerificationPhotoCapture({
    existingUrl,
    disabled = false,
    saving = false,
    onSave,
    onRemove,
}: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const [cameraOpen, setCameraOpen] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [startingCamera, setStartingCamera] = useState(false);

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraOpen(false);
        setStartingCamera(false);
    };

    useEffect(() => () => stopCamera(), []);

    const startCamera = async () => {
        if (disabled || saving) {
            return;
        }

        setError(null);
        setStartingCamera(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });

            streamRef.current = stream;
            setCameraOpen(true);

            requestAnimationFrame(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    void videoRef.current.play();
                }
            });
        } catch {
            setError(
                'No se pudo abrir la cámara. Revisa permisos o sube una foto desde galería.',
            );
        } finally {
            setStartingCamera(false);
        }
    };

    const captureFromCamera = () => {
        const video = videoRef.current;

        if (!video || video.videoWidth < 2) {
            setError('Espera un momento a que la cámara esté lista.');

            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            setError('No se pudo capturar la foto.');

            return;
        }

        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        setPreview(dataUrl);
        stopCamera();
    };

    const handleFile = async (file: File | null) => {
        if (!file) {
            return;
        }

        setError(null);

        try {
            const dataUrl = await fileToCompressedDataUrl(file);
            setPreview(dataUrl);
            stopCamera();
        } catch {
            setError('No se pudo procesar la imagen seleccionada.');
        }
    };

    const displayUrl = preview ?? existingUrl ?? null;

    return (
        <div className="space-y-3">
            <div
                className={cn(
                    'overflow-hidden rounded-xl border border-dashed border-[#c5d5e6] bg-[#0f172a]',
                    displayUrl ? 'bg-[#f8fafc]' : '',
                )}
            >
                {cameraOpen ? (
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="aspect-video w-full object-cover"
                    />
                ) : displayUrl ? (
                    <img
                        src={displayUrl}
                        alt="Foto de verificación"
                        className="max-h-72 w-full object-contain"
                    />
                ) : (
                    <div className="flex aspect-video items-center justify-center px-4 text-center text-sm text-slate-300">
                        Toma la foto con el celular o súbela desde galería.
                    </div>
                )}
            </div>

            {error ? <p className="text-xs text-red-600">{error}</p> : null}

            <div className="flex flex-wrap gap-2">
                {cameraOpen ? (
                    <>
                        <Button
                            type="button"
                            disabled={disabled || saving}
                            onClick={captureFromCamera}
                            className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c]"
                        >
                            <Camera className="size-4" />
                            Capturar
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={disabled || saving}
                            onClick={stopCamera}
                            className="cursor-pointer border-[#c5d5e6]"
                        >
                            Cancelar cámara
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={disabled || saving || startingCamera}
                            onClick={() => void startCamera()}
                            className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                        >
                            {startingCamera ? (
                                <Spinner />
                            ) : (
                                <Camera className="size-4" />
                            )}
                            Tomar foto
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={disabled || saving}
                            onClick={() => fileRef.current?.click()}
                            className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                        >
                            <ImagePlus className="size-4" />
                            Subir foto
                        </Button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                            capture="environment"
                            className="hidden"
                            onChange={(event) => {
                                void handleFile(event.target.files?.[0] ?? null);
                                event.target.value = '';
                            }}
                        />
                    </>
                )}

                {preview ? (
                    <Button
                        type="button"
                        disabled={disabled || saving}
                        onClick={() => onSave(preview)}
                        className="cursor-pointer bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                        {saving ? <Spinner /> : null}
                        Guardar foto
                    </Button>
                ) : null}

                {existingUrl && !preview && onRemove ? (
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled || saving}
                        onClick={onRemove}
                        className="cursor-pointer border-red-200 text-red-700"
                    >
                        <Trash2 className="size-4" />
                        Quitar foto
                    </Button>
                ) : null}

                {preview && existingUrl ? (
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={disabled || saving}
                        onClick={() => setPreview(null)}
                        className="cursor-pointer text-[#5a7390]"
                    >
                        Descartar cambio
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
