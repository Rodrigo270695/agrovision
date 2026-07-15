import { cn } from '@/lib/utils';

export type SemaforoItem = {
    key: string;
    label: string;
    status: 'green' | 'amber' | 'red' | 'neutral' | string;
    value: string;
    detail: string;
};

const statusStyles: Record<string, { lamp: string; card: string; label: string }> = {
    green: {
        lamp: 'bg-[#6fa88a] shadow-[0_0_0_4px_rgba(111,168,138,0.2)]',
        card: 'border-[#c8e2d2] bg-[#f4faf6]',
        label: 'En meta',
    },
    amber: {
        lamp: 'bg-[#d4a84b] shadow-[0_0_0_4px_rgba(212,168,75,0.22)]',
        card: 'border-[#e6dcc0] bg-[#fbf7ee]',
        label: 'Atención',
    },
    red: {
        lamp: 'bg-[#c07070] shadow-[0_0_0_4px_rgba(192,112,112,0.2)]',
        card: 'border-[#e5cccc] bg-[#faf5f5]',
        label: 'Crítico',
    },
    neutral: {
        lamp: 'bg-[#94a3b8] shadow-[0_0_0_4px_rgba(148,163,184,0.18)]',
        card: 'border-[#d5dde6] bg-[#f7f9fb]',
        label: 'Sin datos',
    },
};

type Props = {
    item: SemaforoItem;
};

export function SemaforoCard({ item }: Props) {
    const style = statusStyles[item.status] ?? statusStyles.neutral;

    return (
        <div
            className={cn(
                'rounded-2xl border p-4 shadow-sm',
                style.card,
            )}
        >
            <div className="mb-3 flex items-center gap-3">
                <span
                    className={cn('size-3.5 rounded-full', style.lamp)}
                    aria-hidden
                />
                <span className="text-[11px] font-semibold tracking-[0.14em] text-[#5a7390] uppercase">
                    {style.label}
                </span>
            </div>
            <p className="text-sm font-medium text-[#1a2b4c]">{item.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-[#1a2b4c]">
                {item.value}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#5a7390]">
                {item.detail}
            </p>
        </div>
    );
}
