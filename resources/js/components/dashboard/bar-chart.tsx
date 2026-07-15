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
                'rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm',
                className,
            )}
        >
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-[#1a2b4c]">
                        {title}
                    </h3>
                    {subtitle ? (
                        <p className="mt-0.5 text-xs text-[#6b8ead]">
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                {dual ? (
                    <div className="flex flex-wrap gap-2 text-[10px] text-[#5a7390]">
                        <span className="inline-flex items-center gap-1">
                            <span className="size-2 rounded-sm bg-[#2e5a9e]" />
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
                <p className="py-10 text-center text-sm text-[#6b8ead]">
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
                            <div key={item.label} className="space-y-1">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                    <span
                                        className="truncate font-medium text-[#5a7390]"
                                        title={item.label}
                                    >
                                        {item.label}
                                    </span>
                                    <span className="shrink-0 font-semibold text-[#1a2b4c]">
                                        {dual
                                            ? `${item.value} / ${item.secondary ?? 0}`
                                            : item.value}
                                    </span>
                                </div>
                                {dual ? (
                                    <div className="space-y-1">
                                        <div className="h-2 overflow-hidden rounded-full bg-[#eef3f8]">
                                            <div
                                                className="h-full rounded-full bg-[#2e5a9e] transition-all"
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-[#eef3f8]">
                                            <div
                                                className="h-full rounded-full bg-[#9ec4e8] transition-all"
                                                style={{
                                                    width: `${secondaryWidth}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-2.5 overflow-hidden rounded-full bg-[#eef3f8]">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${width}%`,
                                                backgroundColor:
                                                    item.color ?? '#2e5a9e',
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
