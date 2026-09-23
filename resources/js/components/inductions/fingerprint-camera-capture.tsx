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

function padSourceRect(
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

    const side = Math.min(visibleW, visibleH) * 0.68;

    return {
        sx: visibleX + (visibleW - side) / 2,
        sy: visibleY + (visibleH - side) / 2,
        sw: side,
        sh: side,
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

function boxBlur(
    source: Float32Array,
    width: number,
    height: number,
    radius: number,
): Float32Array {
    const horizontal = new Float32Array(source.length);
    const output = new Float32Array(source.length);
    const windowSize = radius * 2 + 1;

    for (let y = 0; y < height; y++) {
        let sum = 0;

        for (let x = -radius; x <= radius; x++) {
            sum += source[y * width + Math.min(width - 1, Math.max(0, x))];
        }

        for (let x = 0; x < width; x++) {
            horizontal[y * width + x] = sum / windowSize;
            const removeX = x - radius;
            const addX = x + radius + 1;
            sum -= source[y * width + Math.min(width - 1, Math.max(0, removeX))];
            sum += source[y * width + Math.min(width - 1, Math.max(0, addX))];
        }
    }

    for (let x = 0; x < width; x++) {
        let sum = 0;

        for (let y = -radius; y <= radius; y++) {
            sum += horizontal[Math.min(height - 1, Math.max(0, y)) * width + x];
        }

        for (let y = 0; y < height; y++) {
            output[y * width + x] = sum / windowSize;
            const removeY = y - radius;
            const addY = y + radius + 1;
            sum -=
                horizontal[Math.min(height - 1, Math.max(0, removeY)) * width + x];
            sum +=
                horizontal[Math.min(height - 1, Math.max(0, addY)) * width + x];
        }
    }

    return output;
}

function toFingerprintImage(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
): { dataUrl: string; sharpness: number } {
    const crop = padSourceRect(sourceWidth, sourceHeight);
    const size = 420;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
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
        size,
        size,
    );

    const image = ctx.getImageData(0, 0, size, size);
    const sharpness = sharpnessScore(image);
    const { data, width, height } = image;
    const gray = new Float32Array(width * height);

    for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
        gray[pixel] =
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    const local = boxBlur(gray, width, height, 2);
    const detail = new Float32Array(gray.length);
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let ridgeCount = 0;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const pixel = y * width + x;
            const delta = gray[pixel] - local[pixel];
            detail[pixel] = delta;
            const isRidge = delta > -9 && delta < 16 && Math.abs(delta) > 3.2;

            if (!isRidge) {
                continue;
            }

            ridgeCount += 1;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }

    if (ridgeCount < width * height * 0.03) {
        const margin = Math.round(size * 0.18);
        minX = margin;
        minY = margin;
        maxX = size - margin;
        maxY = size - margin;
    }

    const pad = 18;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);

    const cropW = Math.max(1, maxX - minX);
    const cropH = Math.max(1, maxY - minY);
    const samples: number[] = [];

    for (let y = minY; y <= maxY; y += 3) {
        for (let x = minX; x <= maxX; x += 3) {
            const delta = detail[y * width + x];

            if (delta > -9 && delta < 16) {
                samples.push(delta);
            }
        }
    }

    samples.sort((a, b) => a - b);
    const low = samples[Math.floor(samples.length * 0.08)] ?? -8;
    const high = samples[Math.floor(samples.length * 0.92)] ?? 8;
    const span = Math.max(8, high - low);
    const out = document.createElement('canvas');
    out.width = 360;
    out.height = 360;
    const outCtx = out.getContext('2d');

    if (!outCtx) {
        throw new Error('No se pudo procesar la imagen.');
    }

    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, out.width, out.height);
    const print = outCtx.createImageData(cropW, cropH);
    const printData = print.data;

    for (let y = 0; y < cropH; y += 1) {
        for (let x = 0; x < cropW; x += 1) {
            const delta = detail[(minY + y) * width + (minX + x)];
            const index = (y * cropW + x) * 4;
            const isRidge = delta > -9 && delta < 16 && Math.abs(delta) > 2.4;
            const ink = isRidge
                ? Math.min(255, Math.max(0, 255 - ((delta - low) / span) * 255))
                : 255;
            printData[index] = ink;
            printData[index + 1] = ink;
            printData[index + 2] = ink;
            printData[index + 3] = 255;
        }
    }

    const printCanvas = document.createElement('canvas');
    printCanvas.width = cropW;
    printCanvas.height = cropH;
    printCanvas.getContext('2d')?.putImageData(print, 0, 0);

    const scale = Math.min(
        (out.width - 24) / cropW,
        (out.height - 24) / cropH,
    );
    const drawW = cropW * scale;
    const drawH = cropH * scale;
    outCtx.drawImage(
        printCanvas,
        (out.width - drawW) / 2,
        (out.height - drawH) / 2,
        drawW,
        drawH,
    );

    return {
        dataUrl: out.toDataURL('image/png'),
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
                        className="h-full w-full bg-white object-contain"
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
                        <div className="aspect-square w-[68%] rounded-full border-2 border-emerald-300/90 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
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
                            ? 'Flash encendido. Llena el círculo solo con la yema. Se guarda la huella, no el dedo.'
                            : 'Llena el círculo solo con la yema. Se guarda la huella, no el dedo.'
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
