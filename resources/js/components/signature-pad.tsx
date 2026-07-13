import { useEffect, useRef, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    value?: string | null;
    onChange: (dataUrl: string | null) => void;
    label?: string;
    className?: string;
};

export default function SignaturePad({
    value,
    onChange,
    label = 'Firme aquí con el dedo',
    className,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawing = useRef(false);
    const hasInk = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const resize = () => {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const snapshot = canvas.toDataURL();

            canvas.width = width * ratio;
            canvas.height = height * ratio;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return;
            }

            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#143528';
            ctx.lineWidth = 2.4;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            if (value || hasInk.current) {
                const image = new Image();
                image.onload = () => {
                    ctx.drawImage(image, 0, 0, width, height);
                };
                image.src = value || snapshot;
            }
        };

        resize();
        window.addEventListener('resize', resize);

        return () => window.removeEventListener('resize', resize);
    }, [value]);

    const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return { x: 0, y: 0 };
        }

        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    const startDraw = (event: PointerEvent<HTMLCanvasElement>) => {
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
    };

    const draw = (event: PointerEvent<HTMLCanvasElement>) => {
        if (!drawing.current) {
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) {
            return;
        }

        const point = pointFromEvent(event);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        hasInk.current = true;
    };

    const endDraw = () => {
        if (!drawing.current) {
            return;
        }

        drawing.current = false;
        const canvas = canvasRef.current;
        if (!canvas || !hasInk.current) {
            return;
        }

        onChange(canvas.toDataURL('image/png'));
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) {
            return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        hasInk.current = false;
        onChange(null);
    };

    return (
        <div className={cn('space-y-2', className)}>
            <div className="overflow-hidden rounded-xl border border-neutral-300 bg-white dark:border-neutral-700">
                <canvas
                    ref={canvasRef}
                    className="h-40 w-full touch-none bg-white"
                    onPointerDown={startDraw}
                    onPointerMove={draw}
                    onPointerUp={endDraw}
                    onPointerCancel={endDraw}
                    onPointerLeave={endDraw}
                />
            </div>
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-neutral-500">{label}</p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clear}
                >
                    Limpiar
                </Button>
            </div>
        </div>
    );
}
