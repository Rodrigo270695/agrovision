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
                'rounded-2xl border border-brand-200 bg-white p-4 shadow-sm',
                className,
            )}
        >
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-brand-700">{title}</h3>
                {subtitle ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
                ) : null}
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="relative size-40 shrink-0">
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

                <ul className="w-full space-y-2">
                    {points.map((item) => (
                        <li
                            key={item.label}
                            className="flex items-center justify-between gap-3 text-xs"
                        >
                            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                                <span
                                    className="size-2.5 shrink-0 rounded-full"
                                    style={{
                                        backgroundColor: item.color ?? '#1e4d8c',
                                    }}
                                />
                                <span className="truncate">{item.label}</span>
                            </span>
                            <span className="font-semibold text-brand-700">
                                {item.value}
                                {total > 0 ? (
                                    <span className="ml-1 font-normal text-muted-foreground">
                                        ({Math.round((item.value / total) * 100)}
                                        %)
                                    </span>
                                ) : null}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
