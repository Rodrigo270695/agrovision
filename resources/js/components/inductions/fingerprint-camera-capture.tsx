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

function sampleBilinear(
    source: Float32Array,
    width: number,
    height: number,
    x: number,
    y: number,
): number {
    if (x < 0 || y < 0 || x >= width - 1 || y >= height - 1) {
        return 0;
    }

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const index = y0 * width + x0;

    return (
        source[index] * (1 - fx) * (1 - fy) +
        source[index + 1] * fx * (1 - fy) +
        source[index + width] * (1 - fx) * fy +
        source[index + width + 1] * fx * fy
    );
}

function percentile(values: number[], p: number): number {
    if (values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.round(p * (sorted.length - 1))),
    );

    return sorted[index];
}

function componentNearCenter(
    mask: Uint8Array,
    width: number,
    height: number,
): Uint8Array {
    const labels = new Int32Array(mask.length);
    const stack: number[] = [];
    let nextLabel = 0;
    let bestLabel = 0;
    let bestScore = 0;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.hypot(centerX, centerY) || 1;

    for (let start = 0; start < mask.length; start += 1) {
        if (mask[start] === 0 || labels[start] !== 0) {
            continue;
        }

        nextLabel += 1;
        labels[start] = nextLabel;
        stack.push(start);

        let count = 0;
        let sumX = 0;
        let sumY = 0;

        while (stack.length > 0) {
            const pixel = stack.pop() as number;
            const x = pixel % width;
            const y = (pixel - x) / width;
            count += 1;
            sumX += x;
            sumY += y;

            if (x > 0 && mask[pixel - 1] && labels[pixel - 1] === 0) {
                labels[pixel - 1] = nextLabel;
                stack.push(pixel - 1);
            }

            if (x + 1 < width && mask[pixel + 1] && labels[pixel + 1] === 0) {
                labels[pixel + 1] = nextLabel;
                stack.push(pixel + 1);
            }

            if (y > 0 && mask[pixel - width] && labels[pixel - width] === 0) {
                labels[pixel - width] = nextLabel;
                stack.push(pixel - width);
            }

            if (
                y + 1 < height &&
                mask[pixel + width] &&
                labels[pixel + width] === 0
            ) {
                labels[pixel + width] = nextLabel;
                stack.push(pixel + width);
            }
        }

        const dist =
            Math.hypot(sumX / count - centerX, sumY / count - centerY) / maxDist;
        const score = count * (1.35 - dist);

        if (count > 140 && score > bestScore) {
            bestScore = score;
            bestLabel = nextLabel;
        }
    }

    const core = new Uint8Array(mask.length);

    if (bestLabel === 0) {
        return core;
    }

    for (let i = 0; i < labels.length; i += 1) {
        if (labels[i] === bestLabel) {
            core[i] = 1;
        }
    }

    return core;
}

function trimToDenseCore(
    core: Uint8Array,
    width: number,
    height: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let count = 0;
    const rowCount = new Int32Array(height);
    const colCount = new Int32Array(width);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (core[y * width + x] === 0) {
                continue;
            }

            count += 1;
            rowCount[y] += 1;
            colCount[x] += 1;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }

    if (count < width * height * 0.04 || maxX <= minX || maxY <= minY) {
        const margin = Math.round(Math.min(width, height) * 0.24);

        return {
            minX: margin,
            minY: margin,
            maxX: width - margin,
            maxY: height - margin,
        };
    }

    const rowCut = Math.max(4, Math.round((maxX - minX) * 0.055));
    const colCut = Math.max(4, Math.round((maxY - minY) * 0.055));

    while (minY < maxY && rowCount[minY] < rowCut) {
        minY += 1;
    }

    while (maxY > minY && rowCount[maxY] < rowCut) {
        maxY -= 1;
    }

    while (minX < maxX && colCount[minX] < colCut) {
        minX += 1;
    }

    while (maxX > minX && colCount[maxX] < colCut) {
        maxX -= 1;
    }

    const pad = 8;

    return {
        minX: Math.max(0, minX - pad),
        minY: Math.max(0, minY - pad),
        maxX: Math.min(width - 1, maxX + pad),
        maxY: Math.min(height - 1, maxY + pad),
    };
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

    const fineBlur = boxBlur(gray, width, height, 2);
    const bodyBlur = boxBlur(gray, width, height, 16);
    const detail = new Float32Array(gray.length);
    const absFine = new Float32Array(gray.length);
    const edge = new Float32Array(gray.length);

    for (let i = 0; i < gray.length; i += 1) {
        const delta = gray[i] - fineBlur[i];
        detail[i] = delta;
        absFine[i] = Math.abs(delta);
        edge[i] = Math.abs(gray[i] - bodyBlur[i]);
    }

    const energy = boxBlur(absFine, width, height, 7);
    const energySamples: number[] = [];
    const edgeSamples: number[] = [];

    for (let y = Math.round(height * 0.12); y < height * 0.88; y += 2) {
        for (let x = Math.round(width * 0.12); x < width * 0.88; x += 2) {
            const pixel = y * width + x;
            energySamples.push(energy[pixel]);
            edgeSamples.push(edge[pixel]);
        }
    }

    const energyCut = Math.max(2.1, percentile(energySamples, 0.48));
    const edgeCut = Math.min(34, Math.max(14, percentile(edgeSamples, 0.58)));
    const mask = new Uint8Array(gray.length);

    for (let i = 0; i < gray.length; i += 1) {
        if (
            energy[i] >= energyCut &&
            edge[i] <= edgeCut &&
            absFine[i] > 1.4 &&
            absFine[i] < 58
        ) {
            mask[i] = 1;
        }
    }

    const maskFloat = new Float32Array(mask.length);

    for (let i = 0; i < mask.length; i += 1) {
        maskFloat[i] = mask[i];
    }

    const density = boxBlur(maskFloat, width, height, 5);
    const solid = new Uint8Array(mask.length);

    for (let i = 0; i < mask.length; i += 1) {
        if (density[i] > 0.28) {
            solid[i] = 1;
        }
    }

    const core = componentNearCenter(solid, width, height);
    const bounds = trimToDenseCore(core, width, height);
    const minX = bounds.minX;
    const minY = bounds.minY;
    const maxX = bounds.maxX;
    const maxY = bounds.maxY;
    const cropW = Math.max(1, maxX - minX + 1);
    const cropH = Math.max(1, maxY - minY + 1);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const radiusX = Math.max(8, (maxX - minX) / 2);
    const radiusY = Math.max(8, (maxY - minY) / 2);
    const smooth = boxBlur(detail, 1);
    const positive = new Float32Array(smooth.length);

    for (let i = 0; i < smooth.length; i += 1) {
        positive[i] = smooth[i] > 0 ? smooth[i] : 0;
    }

    const localLevel = boxBlur(positive, width, height, 5);
    const ink = new Uint8Array(cropW * cropH);
    const tangentX = new Int8Array(cropW * cropH);
    const tangentY = new Int8Array(cropW * cropH);

    for (let y = 0; y < cropH; y += 1) {
        for (let x = 0; x < cropW; x += 1) {
            const sourceX = minX + x;
            const sourceY = minY + y;
            const nx = (sourceX - centerX) / radiusX;
            const ny = (sourceY - centerY) / radiusY;

            if (
                nx * nx + ny * ny > 1 ||
                sourceX <= 0 ||
                sourceY <= 0 ||
                sourceX >= width - 1 ||
                sourceY >= height - 1
            ) {
                continue;
            }

            const pixel = sourceY * width + sourceX;
            const value = smooth[pixel];
            const crest = Math.max(1.6, localLevel[pixel] * 0.9);

            if (value < crest || edge[pixel] > edgeCut + 14) {
                continue;
            }

            const gx = smooth[pixel + 1] - smooth[pixel - 1];
            const gy = smooth[pixel + width] - smooth[pixel - width];
            const magnitude = Math.hypot(gx, gy);

            if (magnitude < 0.35) {
                continue;
            }

            const acrossX = gx / magnitude;
            const acrossY = gy / magnitude;
            const left = sampleBilinear(
                smooth,
                width,
                height,
                sourceX - acrossX,
                sourceY - acrossY,
            );
            const right = sampleBilinear(
                smooth,
                width,
                height,
                sourceX + acrossX,
                sourceY + acrossY,
            );

            if (value < left || value < right) {
                continue;
            }

            if (value - (left + right) / 2 < 0.35) {
                continue;
            }

            let tx = -acrossY;
            let ty = acrossX;

            if (Math.abs(tx) >= Math.abs(ty)) {
                ty = Math.abs(ty) > 0.4 ? (ty >= 0 ? 1 : -1) : 0;
                tx = tx >= 0 ? 1 : -1;
            } else {
                tx = Math.abs(tx) > 0.4 ? (tx >= 0 ? 1 : -1) : 0;
                ty = ty >= 0 ? 1 : -1;
            }

            const index = y * cropW + x;
            ink[index] = 1;
            tangentX[index] = tx;
            tangentY[index] = ty;
        }
    }

    const lines = new Uint8Array(ink);

    const mark = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= cropW || y >= cropH) {
            return;
        }

        lines[y * cropW + x] = 1;
    };

    for (let y = 0; y < cropH; y += 1) {
        for (let x = 0; x < cropW; x += 1) {
            const index = y * cropW + x;

            if (ink[index] === 0) {
                continue;
            }

            const tx = tangentX[index];
            const ty = tangentY[index];

            if (tx === 0 && ty === 0) {
                continue;
            }

            mark(x + tx, y + ty);
            mark(x - tx, y - ty);

            for (let step = 2; step <= 4; step += 1) {
                const nextX = x + tx * step;
                const nextY = y + ty * step;

                if (
                    nextX < 0 ||
                    nextY < 0 ||
                    nextX >= cropW ||
                    nextY >= cropH
                ) {
                    break;
                }

                if (ink[nextY * cropW + nextX] === 0) {
                    continue;
                }

                for (let fill = 1; fill < step; fill += 1) {
                    mark(x + tx * fill, y + ty * fill);
                }

                break;
            }
        }
    }

    const print = ctx.createImageData(cropW, cropH);
    const printData = print.data;

    for (let i = 0; i < lines.length; i += 1) {
        const index = i * 4;
        const value = lines[i] ? 24 : 255;
        printData[index] = value;
        printData[index + 1] = value;
        printData[index + 2] = value;
        printData[index + 3] = 255;
    }

    const printCanvas = document.createElement('canvas');
    printCanvas.width = cropW;
    printCanvas.height = cropH;
    printCanvas.getContext('2d')?.putImageData(print, 0, 0);

    const longSide = 340;
    const scale = longSide / Math.max(cropW, cropH);
    const margin = 12;
    const out = document.createElement('canvas');
    out.width = Math.round(cropW * scale) + margin * 2;
    out.height = Math.round(cropH * scale) + margin * 2;
    const outCtx = out.getContext('2d');

    if (!outCtx) {
        throw new Error('No se pudo procesar la imagen.');
    }

    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, out.width, out.height);
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(
        printCanvas,
        margin,
        margin,
        Math.round(cropW * scale),
        Math.round(cropH * scale),
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
        const video = videoRef.current;
        const stream = streamRef.current;

        if (!active || !video || !stream) {
            return;
        }

        if (video.srcObject !== stream) {
            video.srcObject = stream;
        }

        void video.play().catch(() => undefined);
    }, [active]);

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
                    'Salió movida o el dedo está lejos. Acércalo al círculo y vuelve a capturar.',
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
                {preview && !active ? (
                    <img
                        src={preview}
                        alt="Huella capturada"
                        className="absolute inset-0 h-full w-full bg-white object-contain"
                    />
                ) : null}

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
                            ? 'Flash encendido. Llena el círculo con la yema: se recorta solo esa zona.'
                            : 'Llena el círculo con la yema: se recorta solo esa zona.'
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
