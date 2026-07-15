import type { ChartPoint } from '@/components/dashboard/types';
import { cn } from '@/lib/utils';

type Props = {
    title: string;
    subtitle?: string;
    current: number;
    previous: number;
    currentLabel?: string;
    previousLabel?: string;
    className?: string;
};

export function DashboardCompareStat({
    title,
    subtitle,
    current,
    previous,
    currentLabel = 'Este mes',
    previousLabel = 'Mes anterior',
    className,
}: Props) {
    const max = Math.max(current, previous, 1);
    const delta = current - previous;

    return (
        <div
            className={cn(
                'rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm',
                className,
            )}
        >
            <div className="mb-3">
                <h3 className="text-sm font-semibold text-[#1a2b4c]">{title}</h3>
                {subtitle ? (
                    <p className="mt-0.5 text-xs text-[#6b8ead]">{subtitle}</p>
                ) : null}
            </div>

            <div className="mb-3 flex items-end justify-between gap-2">
                <div>
                    <p className="text-3xl font-semibold text-[#1a2b4c]">
                        {current}
                    </p>
                    <p className="text-xs text-[#6b8ead]">{currentLabel}</p>
                </div>
                <div className="text-right">
                    <p
                        className={cn(
                            'text-sm font-semibold',
                            delta > 0 && 'text-emerald-700',
                            delta < 0 && 'text-rose-700',
                            delta === 0 && 'text-[#5a7390]',
                        )}
                    >
                        {delta > 0 ? `+${delta}` : delta}
                    </p>
                    <p className="text-[11px] text-[#6b8ead]">
                        vs {previous} ({previousLabel})
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <CompareBar
                    label={currentLabel}
                    value={current}
                    max={max}
                    color="#2e5a9e"
                />
                <CompareBar
                    label={previousLabel}
                    value={previous}
                    max={max}
                    color="#9ec4e8"
                />
            </div>
        </div>
    );
}

function CompareBar({
    label,
    value,
    max,
    color,
}: {
    label: string;
    value: number;
    max: number;
    color: string;
}) {
    const width = Math.max((value / max) * 100, value > 0 ? 4 : 0);

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-[#5a7390]">
                <span>{label}</span>
                <span className="font-semibold text-[#1a2b4c]">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#eef3f8]">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${width}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

type RateProps = {
    title: string;
    first: number | null;
    second: number | null;
    className?: string;
};

export function DashboardPassRateCompare({
    title,
    first,
    second,
    className,
}: RateProps) {
    const points: ChartPoint[] = [
        {
            label: '1ra inspección',
            value: first ?? 0,
            color: '#2e5a9e',
        },
        {
            label: '2da inspección',
            value: second ?? 0,
            color: '#6fa88a',
        },
    ];

    return (
        <div
            className={cn(
                'rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm',
                className,
            )}
        >
            <h3 className="mb-1 text-sm font-semibold text-[#1a2b4c]">
                {title}
            </h3>
            <p className="mb-4 text-xs text-[#6b8ead]">
                Comparativa de aprobación (meta SST sugerida: ≥85%)
            </p>

            {first === null && second === null ? (
                <p className="py-8 text-center text-sm text-[#6b8ead]">
                    Sin inspecciones decididas
                </p>
            ) : (
                <div className="space-y-3">
                    {points.map((item) => (
                        <div key={item.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-[#5a7390]">
                                    {item.label}
                                </span>
                                <span className="font-semibold text-[#1a2b4c]">
                                    {item.value}%
                                </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-[#eef3f8]">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(item.value, 100)}%`,
                                        backgroundColor: item.color,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    <div className="relative h-1 rounded-full bg-[#eef3f8]">
                        <span
                            className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-[#c07070]"
                            style={{ left: '85%' }}
                            title="Meta 85%"
                        />
                        <span className="absolute top-3 right-[12%] text-[10px] text-[#c07070]">
                            Meta 85%
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
