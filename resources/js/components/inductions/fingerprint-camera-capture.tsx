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

const MIN_SHARPNESS = 48;

function ovalSourceRect(
    videoWidth: number,
    videoHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
    const boxRatio = 4 / 5;
    const videoRatio = videoWidth / videoHeight;
    let visibleX = 0;
    let visibleY = 0;
    let visibleW = videoWidth;
    let visibleH = videoHeight;

    if (videoRatio > boxRatio) {
        visibleW = videoHeight * boxRatio;
        visibleX = (videoWidth - visibleW) / 2;
    } else {
        visibleH = videoWidth / boxRatio;
        visibleY = (videoHeight - visibleH) / 2;
    }

    const sw = visibleW * 0.48;
    const sh = visibleH * 0.58;

    return {
        sx: visibleX + (visibleW - sw) / 2,
        sy: visibleY + (visibleH - sh) / 2,
        sw,
        sh,
    };
}

function sharpnessScore(image: ImageData): number {
    const { data, width, height } = image;
    const grayAt = (x: number, y: number) => {
        const index = (y * width + x) * 4;

        return 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    };

    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y += 2) {
        for (let x = 1; x < width - 1; x += 2) {
            const lap =
                grayAt(x - 1, y) +
                grayAt(x + 1, y) +
                grayAt(x, y - 1) +
                grayAt(x, y + 1) -
                4 * grayAt(x, y);
            sum += lap;
            sumSq += lap * lap;
            count += 1;
        }
    }

    if (count === 0) {
        return 0;
    }

    const mean = sum / count;

    return sumSq / count - mean * mean;
}

function toFingerprintImage(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
): { dataUrl: string; sharpness: number } {
    const crop = ovalSourceRect(sourceWidth, sourceHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 460;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
        throw new Error('No se pudo procesar la imagen.');
    }

    ctx.drawImage(
        source,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        0,
        0,
        canvas.width,
        canvas.height,
    );

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const sharpness = sharpnessScore(image);
    const data = image.data;

    for (let i = 0; i < data.length; i += 4) {
        const gray =
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrasted = Math.min(
            255,
            Math.max(0, (gray - 105) * 1.7 + 128),
        );
        const bw = contrasted > 150 ? 248 : contrasted < 88 ? 18 : contrasted;
        data[i] = bw;
        data[i + 1] = bw;
        data[i + 2] = bw;
    }

    ctx.putImageData(image, 0, 0);

    return {
        dataUrl: canvas.toDataURL('image/png'),
        sharpness,
    };
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
    const [torchOn, setTorchOn] = useState(false);

    const stopStream = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setActive(false);
        setTorchOn(false);
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

                const caps = capabilities as MediaTrackCapabilities & {
                    torch?: boolean;
                };

                if (caps.torch && !preferUser) {
                    try {
                        await track.applyConstraints({
                            advanced: [
                                { torch: true } as MediaTrackConstraintSet,
                            ],
                        });
                        setTorchOn(true);
                    } catch {
                        setTorchOn(false);
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
            const shot = toFingerprintImage(
                video,
                video.videoWidth,
                video.videoHeight,
            );

            if (shot.sharpness < MIN_SHARPNESS) {
                setError(
                    'Salió movida o el dedo está lejos. Acércalo al óvalo y vuelve a capturar.',
                );

                return;
            }

            setPreview(shot.dataUrl);
            onChange(shot.dataUrl);
            setError(null);
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
                            Una foto del dedo, de cerca
                        </p>
                    </div>
                ) : null}
            </div>

            {error ? (
                <p className="text-center text-[11px] text-red-600">{error}</p>
            ) : (
                <p className="text-center text-[11px] text-[#6b8ead]">
                    {active
                        ? torchOn
                            ? 'Flash encendido. Acerca el dedo al óvalo hasta ver los surcos y toma la foto.'
                            : 'Acerca el dedo al óvalo hasta ver los surcos y toma la foto.'
                        : preview
                          ? 'Huella lista. Si no se ven los surcos, vuelve a tomarla.'
                          : 'Se abre la cámara trasera. Es una sola foto, no un video.'}
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
