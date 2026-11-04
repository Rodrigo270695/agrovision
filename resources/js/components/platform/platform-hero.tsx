import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PlatformStatTone = 'navy' | 'amber' | 'rose' | 'emerald' | 'sky';

export type PlatformStat = {
    label: string;
    value: number | string;
    tone?: PlatformStatTone;
};

type StatPillProps = PlatformStat;

export function PlatformStatPill({
    label,
    value,
    tone = 'navy',
}: StatPillProps) {
    const tones: Record<PlatformStatTone, string> = {
        navy: 'from-white/15 to-white/5 text-white',
        amber: 'from-amber-400/25 to-amber-500/10 text-amber-50',
        rose: 'from-rose-400/25 to-rose-500/10 text-rose-50',
        emerald: 'from-emerald-400/25 to-emerald-500/10 text-emerald-50',
        sky: 'from-sky-400/25 to-sky-500/10 text-sky-50',
    };

    const valueText = String(value);
    const isLongValue = valueText.length > 10;

    return (
        <div
            className={cn(
                'min-w-0 rounded-xl border border-white/10 bg-gradient-to-br px-2.5 py-1.5 backdrop-blur-sm',
                tones[tone],
            )}
        >
            <p className="truncate text-[9px] font-semibold tracking-wide text-white/70 uppercase">
                {label}
            </p>
            <p
                className={cn(
                    'font-display font-bold leading-snug break-words',
                    isLongValue
                        ? 'text-xs sm:text-sm'
                        : 'text-lg sm:text-xl tabular-nums',
                )}
                title={valueText}
            >
                {value}
            </p>
        </div>
    );
}

type HeroProps = {
    eyebrow?: string;
    title: string;
    description: ReactNode;
    stats?: PlatformStat[];
    className?: string;
};

/**
 * Hero de plataforma. Título y métricas siempre en columna en anchos
 * típicos (sidebar + contenido); en pantallas muy anchas pueden ir
 * en fila sin aplastar el texto.
 */
export function PlatformHero({
    eyebrow = 'Plataforma · Operaciones',
    title,
    description,
    stats = [],
    className,
}: HeroProps) {
    return (
        <header
            className={cn(
                'overflow-hidden rounded-2xl border border-white/70 bg-brand-800 text-white shadow-[0_18px_40px_-24px_rgba(15,31,58,0.55)]',
                className,
            )}
        >
            <div className="relative px-4 py-4 sm:px-5 sm:py-4">
                <div
                    aria-hidden
                    className="absolute -right-12 -top-16 size-40 rounded-full bg-amber-400/20 blur-3xl"
                />
                <div
                    aria-hidden
                    className="absolute -bottom-20 left-1/3 size-48 rounded-full bg-sky-400/15 blur-3xl"
                />

                <div className="relative flex flex-col gap-4">
                    <div className="min-w-0">
                        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-sky-100 uppercase backdrop-blur-sm">
                            <Sparkles className="size-3 shrink-0" aria-hidden />
                            <span className="truncate">{eyebrow}</span>
                        </div>
                        <h1 className="font-display mt-1.5 text-xl font-bold tracking-tight break-words sm:text-2xl lg:text-[1.75rem]">
                            {title}
                        </h1>
                        <div className="mt-1 max-w-3xl text-xs leading-relaxed text-sky-100/85 break-words sm:text-sm">
                            {description}
                        </div>
                    </div>

                    {stats.length > 0 ? (
                        <div
                            className={cn(
                                'grid w-full min-w-0 gap-1.5',
                                stats.length === 1 && 'grid-cols-1',
                                stats.length === 2 && 'grid-cols-2',
                                stats.length === 3 && 'grid-cols-1 sm:grid-cols-3',
                                stats.length >= 4 &&
                                    'grid-cols-2 sm:grid-cols-4',
                            )}
                        >
                            {stats.map((stat) => (
                                <PlatformStatPill
                                    key={stat.label}
                                    label={stat.label}
                                    value={stat.value}
                                    tone={stat.tone}
                                />
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );
}

type ToolbarProps = {
    children: ReactNode;
    leading?: ReactNode;
    className?: string;
};

export function PlatformToolbar({
    children,
    leading,
    className,
}: ToolbarProps) {
    return (
        <div
            className={cn(
                'flex flex-col gap-2 rounded-2xl border border-brand-200/80 bg-card/90 px-3 py-2.5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between',
                className,
            )}
        >
            {leading ? (
                <div className="min-w-0 w-full sm:w-auto">{leading}</div>
            ) : (
                <div className="hidden sm:block" />
            )}
            <div className="flex w-full min-w-0 flex-wrap items-stretch gap-2 sm:w-auto sm:items-center">
                {children}
            </div>
        </div>
    );
}
