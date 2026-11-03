import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    children: ReactNode;
    className?: string;
};

/**
 * Shell visual compartido del menú Plataforma:
 * fondo con gradientes + contenido a ancho completo.
 */
export function PlatformPageShell({ children, className }: Props) {
    return (
        <div className="relative min-h-full w-full overflow-hidden">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(30,77,140,0.12),_transparent_55%),radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.10),_transparent_45%),linear-gradient(180deg,#f4f7fb_0%,#eef3f8_48%,#f8fafc_100%)]"
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
                'overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_14px_40px_-28px_rgba(15,31,58,0.4)]',
                '[&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none',
                className,
            )}
        >
            {children}
        </section>
    );
}
