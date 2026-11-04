import type { ChartPoint } from '@/components/dashboard/types';
import { cn } from '@/lib/utils';

type Props = {
    title: string;
    subtitle?: string;
    data?: ChartPoint[];
    className?: string;
};

export function DashboardDonutChart({
    title,
    subtitle,
    data = [],
    className,
}: Props) {
    const points = Array.isArray(data) ? data : [];
    const total = points.reduce((sum, item) => sum + item.value, 0);
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const arcs =
        total === 0
            ? []
            : points
                  .filter((item) => item.value > 0)
                  .map((item) => {
                      const length = (item.value / total) * circumference;
                      const arc = {
                          ...item,
                          dash: length,
                          gap: circumference - length,
                          offset,
                      };
                      offset += length;

                      return arc;
                  });

    return (
        <div
            className={cn(
                'min-w-0 overflow-hidden rounded-2xl border border-brand-200 bg-white p-4 shadow-sm',
                className,
            )}
        >
            <div className="mb-4 min-w-0">
                <h3 className="text-sm font-semibold text-brand-700">{title}</h3>
                {subtitle ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {subtitle}
                    </p>
                ) : null}
            </div>

            <div className="flex min-w-0 flex-col items-center gap-4">
                <div className="relative size-36 shrink-0 sm:size-40">
                    <svg viewBox="0 0 140 140" className="size-full -rotate-90">
                        <circle
                            cx="70"
                            cy="70"
                            r={radius}
                            fill="none"
                            stroke="#eef3f8"
                            strokeWidth="16"
                        />
                        {arcs.map((arc) => (
                            <circle
                                key={arc.label}
                                cx="70"
                                cy="70"
                                r={radius}
                                fill="none"
                                stroke={arc.color ?? '#1e4d8c'}
                                strokeWidth="16"
                                strokeDasharray={`${arc.dash} ${arc.gap}`}
                                strokeDashoffset={-arc.offset}
                                strokeLinecap="butt"
                            />
                        ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-semibold text-brand-700">
                            {total}
                        </span>
                        <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                            Total
                        </span>
                    </div>
                </div>

                <ul className="w-full min-w-0 space-y-2">
                    {points.map((item) => {
                        const percent =
                            total > 0
                                ? Math.round((item.value / total) * 100)
                                : 0;

                        return (
                            <li
                                key={item.label}
                                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0.5 text-xs"
                            >
                                <span className="flex min-w-0 items-start gap-2 text-muted-foreground">
                                    <span
                                        className="mt-1 size-2.5 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor:
                                                item.color ?? '#1e4d8c',
                                        }}
                                    />
                                    <span className="min-w-0 break-words leading-snug">
                                        {item.label}
                                    </span>
                                </span>
                                <span className="shrink-0 text-right font-semibold tabular-nums text-brand-700">
                                    {item.value}
                                    <span className="ml-1 font-normal text-muted-foreground">
                                        ({percent}%)
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
