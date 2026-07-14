import { Eraser } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    valueUrl?: string | null;
    disabled?: boolean;
    onChange: (dataUrl: string | null) => void;
    className?: string;
    canvasClassName?: string;
    placeholder?: string;
    clearLabel?: string;
    /** `stamp`: al tocar se marca huella (no hay que arrastrar). */
    mode?: 'signature' | 'stamp';
};

function stampFingerprint(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(26, 43, 76, 0.12)';
    ctx.strokeStyle = '#1a2b4c';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.42, size * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 1; i <= 7; i++) {
        ctx.beginPath();
        ctx.ellipse(
            0,
            -size * 0.04,
            size * 0.1 * i,
            size * 0.12 * i,
            0,
            0.2 * Math.PI,
            1.8 * Math.PI,
        );
        ctx.lineWidth = Math.max(1.1, size * 0.025);
        ctx.stroke();
    }

    // Puntos irregulares estilo poro / relieve
    for (let i = 0; i < 28; i++) {
        const angle = (Math.PI * 2 * i) / 28 + (i % 3) * 0.15;
        const radius = size * (0.12 + (i % 5) * 0.05);
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius * 1.15;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.8, size * 0.02), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(26, 43, 76, 0.45)';
        ctx.fill();
    }

    ctx.restore();
}

export function SignaturePad({
    valueUrl,
    disabled = false,
    onChange,
    className,
    canvasClassName,
    placeholder = 'Firma aquí con el dedo o el mouse',
    clearLabel = 'Limpiar firma',
    mode = 'signature',
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const hasInk = useRef(false);
    const [dirty, setDirty] = useState(Boolean(valueUrl));

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const resize = () => {
            const ratio = window.devicePixelRatio || 1;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            canvas.width = Math.floor(width * ratio);
            canvas.height = Math.floor(height * ratio);

            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return;
            }

            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.lineWidth = mode === 'stamp' ? 3.5 : 2.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#1a2b4c';
            ctx.fillStyle = '#1a2b4c';

            if (valueUrl) {
                const image = new Image();
                image.onload = () => {
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(image, 0, 0, width, height);
                    hasInk.current = true;
                    setDirty(true);
                };
                image.src = valueUrl;
            } else {
                ctx.clearRect(0, 0, width, height);
                hasInk.current = false;
                setDirty(false);
            }
        };

        resize();
        window.addEventListener('resize', resize);

        return () => window.removeEventListener('resize', resize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valueUrl, mode]);

    const pointFromEvent = (
        event: React.PointerEvent<HTMLCanvasElement>,
    ): { x: number; y: number } => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    const emit = () => {
        const canvas = canvasRef.current;

        if (!canvas || !hasInk.current) {
            onChange(null);
            setDirty(false);

            return;
        }

        setDirty(true);
        onChange(canvas.toDataURL('image/png'));
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (!canvas || !ctx || disabled) {
            return;
        }

        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        hasInk.current = false;
        setDirty(false);
        onChange(null);
    };

    return (
        <div className={cn('space-y-2', className)}>
            <div className="relative overflow-hidden rounded-xl border border-dashed border-[#c5d5e6] bg-[#f8fafc]">
                <canvas
                    ref={canvasRef}
                    className={cn(
                        'h-36 w-full touch-none select-none sm:h-40',
                        disabled
                            ? 'cursor-not-allowed opacity-70'
                            : 'cursor-crosshair',
                        canvasClassName,
                    )}
                    onPointerDown={(event) => {
                        if (disabled) {
                            return;
                        }

                        const canvas = canvasRef.current;
                        const ctx = canvas?.getContext('2d');

                        if (!canvas || !ctx) {
                            return;
                        }

                        event.preventDefault();
                        drawing.current = true;
                        canvas.setPointerCapture(event.pointerId);
                        const point = pointFromEvent(event);

                        if (mode === 'stamp') {
                            // Un toque basta: marca huella completa bajo el dedo.
                            const size = Math.min(
                                canvas.clientWidth,
                                canvas.clientHeight,
                            ) * 0.85;
                            stampFingerprint(ctx, point.x, point.y, size);
                            hasInk.current = true;
                            setDirty(true);
                            return;
                        }

                        ctx.beginPath();
                        ctx.moveTo(point.x, point.y);
                        // Punto visible aunque no arrastren
                        ctx.lineTo(point.x + 0.01, point.y + 0.01);
                        ctx.stroke();
                        hasInk.current = true;
                        setDirty(true);
                    }}
                    onPointerMove={(event) => {
                        if (!drawing.current || disabled || mode === 'stamp') {
                            return;
                        }

                        const ctx = canvasRef.current?.getContext('2d');

                        if (!ctx) {
                            return;
                        }

                        const point = pointFromEvent(event);
                        ctx.lineTo(point.x, point.y);
                        ctx.stroke();
                        hasInk.current = true;
                        setDirty(true);
                    }}
                    onPointerUp={() => {
                        if (!drawing.current) {
                            return;
                        }

                        drawing.current = false;
                        emit();
                    }}
                    onPointerCancel={() => {
                        drawing.current = false;
                        emit();
                    }}
                    onPointerLeave={() => {
                        if (!drawing.current || mode === 'stamp') {
                            return;
                        }

                        drawing.current = false;
                        emit();
                    }}
                />
                {!disabled && !valueUrl && !dirty ? (
                    <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-[#6b8ead]">
                        {placeholder}
                    </p>
                ) : null}
            </div>
            {!disabled ? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clear}
                    className="h-8 cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                >
                    <Eraser className="size-3.5" />
                    {clearLabel}
                </Button>
            ) : null}
        </div>
    );
}
