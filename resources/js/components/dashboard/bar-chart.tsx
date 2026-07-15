import { cn } from '@/lib/utils';

export type ChartPoint = {
    label: string;
    value: number;
    color?: string;
};

type Props = {
    title: string;
    subtitle?: string;
    data?: ChartPoint[];
    className?: string;
};

export function DashboardBarChart({ title, subtitle, data = [], className }: Props) {
    const points = Array.isArray(data) ? data : [];
    const max = Math.max(...points.map((item) => item.value), 1);

    return (
        <div
            className={cn(
                'rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm',
                className,
            )}
        >
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#1a2b4c]">{title}</h3>
                {subtitle ? (
                    <p className="mt-0.5 text-xs text-[#6b8ead]">{subtitle}</p>
                ) : null}
            </div>

            {points.length === 0 || points.every((item) => item.value === 0) ? (
                <p className="py-10 text-center text-sm text-[#6b8ead]">
                    Sin datos para graficar
                </p>
            ) : (
                <div className="space-y-2.5">
                    {points.map((item) => {
                        const width = Math.max(
                            (item.value / max) * 100,
                            item.value > 0 ? 4 : 0,
                        );

                        return (
                            <div
                                key={item.label}
                                className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2"
                            >
                                <span
                                    className="truncate text-xs text-[#5a7390]"
                                    title={item.label}
                                >
                                    {item.label}
                                </span>
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
                                <span className="text-right text-xs font-semibold text-[#1a2b4c]">
                                    {item.value}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
