import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    children: ReactNode;
    className?: string;
};

/**
 * Shell visual compartido del producto:
 * fondo con gradientes brand + contenido a ancho completo.
 */
export function PlatformPageShell({ children, className }: Props) {
    return (
        <div className="relative min-h-full w-full overflow-hidden">
            <div
                aria-hidden
                className="bg-platform-shell pointer-events-none absolute inset-0"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] opacity-60"
            />

            <div
                className={cn(
                    'relative z-10 flex w-full flex-col gap-3 p-3 sm:gap-4 sm:p-4',
                    className,
                )}
            >
                {children}
            </div>
        </div>
    );
}

type PanelProps = {
    children: ReactNode;
    className?: string;
};

export function PlatformContentPanel({ children, className }: PanelProps) {
    return (
        <section
            className={cn(
                'overflow-hidden rounded-2xl border border-brand-200/80 bg-card/95 shadow-[0_14px_40px_-28px_rgba(15,31,58,0.4)]',
                '[&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none',
                className,
            )}
        >
            {children}
        </section>
    );
}
