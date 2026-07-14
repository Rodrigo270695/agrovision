import { Camera, RefreshCw, SwitchCamera } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    valueUrl?: string | null;
    onChange: (dataUrl: string | null) => void;
    className?: string;
    disabled?: boolean;
};

async function pickBestCameraId(): Promise<string | undefined> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videos = devices.filter((d) => d.kind === 'videoinput');

    if (videos.length === 0) {
        return undefined;
    }

    const score = (label: string) => {
        const l = label.toLowerCase();
        let points = 0;
        if (l.includes('macro')) points += 100;
        if (l.includes('ultra wide') || l.includes('ultrawide')) points += 40;
        if (l.includes('wide') || l.includes('back') || l.includes('rear')) {
            points += 20;
        }
        if (l.includes('front') || l.includes('selfie') || l.includes('user')) {
            points -= 50;
        }
        return points;
    };

    const ranked = [...videos].sort(
        (a, b) => score(b.label || '') - score(a.label || ''),
    );

    return ranked[0]?.deviceId;
}

function toBlackAndWhite(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
): string {
    const size = 420;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = Math.round(size * 1.25);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No se pudo procesar la imagen.');
    }

    // Recorte centrado (zona del dedo)
    const targetRatio = canvas.width / canvas.height;
    const sourceRatio = sourceWidth / sourceHeight;
    let sx = 0;
    let sy = 0;
    let sw = sourceWidth;
    let sh = sourceHeight;

    if (sourceRatio > targetRatio) {
        sw = sourceHeight * targetRatio;
        sx = (sourceWidth - sw) / 2;
    } else {
        sh = sourceWidth / targetRatio;
        sy = (sourceHeight - sh) / 2;
    }

    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;

    for (let i = 0; i < data.length; i += 4) {
        const gray =
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Contraste alto para resaltar pliegues
        const contrasted = Math.min(
            255,
            Math.max(0, (gray - 110) * 1.55 + 128),
        );
        const bw = contrasted > 145 ? 245 : contrasted < 90 ? 25 : contrasted;
        data[i] = bw;
        data[i + 1] = bw;
        data[i + 2] = bw;
    }

    ctx.putImageData(image, 0, 0);

    return canvas.toDataURL('image/png');
}

export function FingerprintCameraCapture({
    valueUrl,
    onChange,
    className,
    disabled = false,
}: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);
    const [active, setActive] = useState(false);
    const [preview, setPreview] = useState<string | null>(valueUrl ?? null);
    const [facingUser, setFacingUser] = useState(false);

    const stopStream = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setActive(false);
    };

    useEffect(() => {
        setPreview(valueUrl ?? null);
    }, [valueUrl]);

    useEffect(() => {
        return () => stopStream();
    }, []);

    const startCamera = async (preferUser = false) => {
        if (disabled || !navigator.mediaDevices?.getUserMedia) {
            setError('Este dispositivo no permite usar la cámara.');
            return;
        }

        setStarting(true);
        setError(null);
        stopStream();

        try {
            const deviceId = preferUser
                ? undefined
                : await pickBestCameraId();

            const constraints: MediaStreamConstraints = {
                audio: false,
                video: deviceId
                    ? {
                          deviceId: { exact: deviceId },
                          width: { ideal: 1280 },
                          height: { ideal: 960 },
                      }
                    : {
                          facingMode: preferUser
                              ? 'user'
                              : { ideal: 'environment' },
                          width: { ideal: 1280 },
                          height: { ideal: 960 },
                      },
            };

            const stream =
                await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            const track = stream.getVideoTracks()[0];
            if (track) {
                const capabilities =
                    typeof track.getCapabilities === 'function'
                        ? track.getCapabilities()
                        : ({} as MediaTrackCapabilities);

                const advanced: MediaTrackConstraintSet[] = [];

                if (
                    Array.isArray(
                        (capabilities as { focusMode?: string[] }).focusMode,
                    ) &&
                    (
                        capabilities as { focusMode?: string[] }
                    ).focusMode?.includes('continuous')
                ) {
                    advanced.push({
                        focusMode: 'continuous',
                    } as MediaTrackConstraintSet);
                }

                if (
                    typeof (capabilities as { zoom?: { max?: number } }).zoom
                        ?.max === 'number' &&
                    ((capabilities as { zoom?: { max?: number } }).zoom
                        ?.max as number) > 1
                ) {
                    const maxZoom = (
                        capabilities as { zoom?: { max?: number } }
                    ).zoom!.max!;
                    advanced.push({
                        zoom: Math.min(2, maxZoom),
                    } as MediaTrackConstraintSet);
                }

                if (advanced.length > 0) {
                    try {
                        await track.applyConstraints({ advanced });
                    } catch {
                        // Algunos navegadores no aplican focus/zoom; seguir igual.
                    }
                }
            }

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setActive(true);
            setFacingUser(preferUser);
        } catch {
            setError(
                'No se pudo abrir la cámara. Revisa permisos o usa otro dispositivo.',
            );
            setActive(false);
        } finally {
            setStarting(false);
        }
    };

    const capture = () => {
        const video = videoRef.current;

        if (!video || !video.videoWidth || disabled) {
            return;
        }

        try {
            const dataUrl = toBlackAndWhite(
                video,
                video.videoWidth,
                video.videoHeight,
            );
            setPreview(dataUrl);
            onChange(dataUrl);
            stopStream();
        } catch {
            setError('No se pudo procesar la huella. Intenta de nuevo.');
        }
    };

    const clear = () => {
        setPreview(null);
        onChange(null);
        setError(null);
    };

    return (
        <div className={cn('space-y-2', className)}>
            <div className="relative mx-auto aspect-4/5 w-full max-w-48 overflow-hidden rounded-xl border border-dashed border-[#c5d5e6] bg-[#0f172a]">
                {preview && !active ? (
                    <img
                        src={preview}
                        alt="Huella capturada"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        autoPlay
                        className={cn(
                            'h-full w-full object-cover',
                            !active && 'opacity-0',
                        )}
                    />
                )}

                {active ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="h-[58%] w-[48%] rounded-[45%] border-2 border-emerald-300/90 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
                    </div>
                ) : null}

                {!preview && !active ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
                        <Camera className="size-7 text-[#94a3b8]" />
                        <p className="text-[11px] text-[#cbd5e1]">
                            Foto directa al dedo (cámara macro/trasera)
                        </p>
                    </div>
                ) : null}
            </div>

            {error ? (
                <p className="text-center text-[11px] text-red-600">{error}</p>
            ) : (
                <p className="text-center text-[11px] text-[#6b8ead]">
                    {active
                        ? 'Centra el dedo en el óvalo y captura.'
                        : preview
                          ? 'Huella lista. Puedes volver a tomar si quieres.'
                          : 'Se prioriza cámara macro/trasera si el celular la tiene.'}
                </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
                {!active ? (
                    <Button
                        type="button"
                        size="sm"
                        disabled={disabled || starting}
                        onClick={() => startCamera(false)}
                        className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c]"
                    >
                        <Camera className="size-3.5" />
                        {preview ? 'Volver a tomar' : 'Abrir cámara'}
                    </Button>
                ) : (
                    <>
                        <Button
                            type="button"
                            size="sm"
                            disabled={disabled}
                            onClick={capture}
                            className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            <Camera className="size-3.5" />
                            Capturar huella
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={disabled}
                            onClick={() => startCamera(!facingUser)}
                            className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                        >
                            <SwitchCamera className="size-3.5" />
                            Cambiar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={disabled}
                            onClick={stopStream}
                            className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                        >
                            Cancelar cámara
                        </Button>
                    </>
                )}

                {preview && !active ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                        onClick={clear}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                    >
                        <RefreshCw className="size-3.5" />
                        Limpiar
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
