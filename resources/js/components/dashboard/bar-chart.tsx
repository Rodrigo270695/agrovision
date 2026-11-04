import type { ChartPoint } from '@/components/dashboard/types';
import { cn } from '@/lib/utils';

type Props = {
    title: string;
    subtitle?: string;
    data?: ChartPoint[];
    className?: string;
    /** Muestra valor principal (1ra) y secondary (2da) lado a lado */
    dual?: boolean;
    primaryLegend?: string;
    secondaryLegend?: string;
};

export function DashboardBarChart({
    title,
    subtitle,
    data = [],
    className,
    dual = false,
    primaryLegend = 'Actual',
    secondaryLegend = 'Comparado',
}: Props) {
    const points = Array.isArray(data) ? data : [];
    const max = Math.max(
        ...points.flatMap((item) => [item.value, item.secondary ?? 0]),
        1,
    );

    return (
        <div
            className={cn(
                'min-w-0 overflow-hidden rounded-2xl border border-brand-200 bg-white p-4 shadow-sm',
                className,
            )}
        >
            <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-brand-700">
                        {title}
                    </h3>
                    {subtitle ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                {dual ? (
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                            <span className="size-2 rounded-sm bg-brand-500" />
                            {primaryLegend}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="size-2 rounded-sm bg-[#9ec4e8]" />
                            {secondaryLegend}
                        </span>
                    </div>
                ) : null}
            </div>

            {points.length === 0 ||
            points.every(
                (item) => item.value === 0 && (item.secondary ?? 0) === 0,
            ) ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                    Sin datos para graficar
                </p>
            ) : (
                <div className="space-y-3">
                    {points.map((item) => {
                        const width = Math.max(
                            (item.value / max) * 100,
                            item.value > 0 ? 4 : 0,
                        );
                        const secondaryWidth = Math.max(
                            ((item.secondary ?? 0) / max) * 100,
                            (item.secondary ?? 0) > 0 ? 4 : 0,
                        );

                        return (
                            <div key={item.label} className="min-w-0 space-y-1">
                                <div className="flex min-w-0 items-center justify-between gap-2 text-xs">
                                    <span
                                        className="min-w-0 truncate font-medium text-muted-foreground"
                                        title={item.label}
                                    >
                                        {item.label}
                                    </span>
                                    <span className="shrink-0 font-semibold tabular-nums text-brand-700">
                                        {dual
                                            ? `${item.value} / ${item.secondary ?? 0}`
                                            : item.value}
                                    </span>
                                </div>
                                {dual ? (
                                    <div className="space-y-1">
                                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-brand-500 transition-all"
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-[#9ec4e8] transition-all"
                                                style={{
                                                    width: `${secondaryWidth}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${width}%`,
                                                backgroundColor:
                                                    item.color ?? '#1e4d8c',
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
