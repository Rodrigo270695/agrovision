import { Eraser } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    valueUrl?: string | null;
    disabled?: boolean;
    onChange: (dataUrl: string | null) => void;
    className?: string;
};

export function SignaturePad({
    valueUrl,
    disabled = false,
    onChange,
    className,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const hasInk = useRef(false);

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
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#1a2b4c';

            if (valueUrl) {
                const image = new Image();
                image.onload = () => {
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(image, 0, 0, width, height);
                    hasInk.current = true;
                };
                image.src = valueUrl;
            } else {
                ctx.clearRect(0, 0, width, height);
                hasInk.current = false;
            }
        };

        resize();
        window.addEventListener('resize', resize);

        return () => window.removeEventListener('resize', resize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valueUrl]);

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

            return;
        }

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
        onChange(null);
    };

    return (
        <div className={cn('space-y-2', className)}>
            <div className="relative overflow-hidden rounded-xl border border-dashed border-[#c5d5e6] bg-[#f8fafc]">
                <canvas
                    ref={canvasRef}
                    className={cn(
                        'h-36 w-full touch-none sm:h-40',
                        disabled ? 'cursor-not-allowed opacity-70' : 'cursor-crosshair',
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

                        drawing.current = true;
                        canvas.setPointerCapture(event.pointerId);
                        const point = pointFromEvent(event);
                        ctx.beginPath();
                        ctx.moveTo(point.x, point.y);
                    }}
                    onPointerMove={(event) => {
                        if (!drawing.current || disabled) {
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
                    }}
                    onPointerUp={() => {
                        if (!drawing.current) {
                            return;
                        }

                        drawing.current = false;
                        emit();
                    }}
                    onPointerLeave={() => {
                        if (!drawing.current) {
                            return;
                        }

                        drawing.current = false;
                        emit();
                    }}
                />
                {!disabled && !valueUrl && !hasInk.current ? (
                    <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[#6b8ead]">
                        Firma aquí con el dedo o el mouse
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
                    Limpiar firma
                </Button>
            ) : null}
        </div>
    );
}
