export type ProviderUnitBar = {
    provider: string;
    plate: string;
    percent: number;
    label: string;
};

export function ProviderUnitBars({ units }: { units: ProviderUnitBar[] }) {
    if (units.length === 0) {
        return (
            <p className="py-16 text-center text-sm text-[#6b8ead]">
                Sin unidades inspeccionadas en la semana seleccionada.
            </p>
        );
    }

    const chartHeight = 220;
    const maxDisplay = 100;

    return (
        <div className="w-full min-w-0 overflow-x-auto">
            <div
                className="inline-flex min-w-full items-end justify-start gap-2 px-1 pb-2 sm:gap-3"
                style={{ minHeight: `${chartHeight + 72}px` }}
            >
                {units.map((unit) => {
                    const height = Math.min(
                        maxDisplay,
                        Math.max(0, unit.percent),
                    );
                    const barHeight = Math.round(
                        (height / maxDisplay) * chartHeight,
                    );

                    return (
                        <div
                            key={`${unit.plate}-${unit.provider}`}
                            className="flex w-[4.5rem] shrink-0 flex-col items-center sm:w-[5.5rem]"
                        >
                            <div
                                className="relative flex w-full flex-col justify-end"
                                style={{ height: `${chartHeight}px` }}
                            >
                                <div
                                    className="mx-auto w-[70%] rounded-t-md bg-gradient-to-t from-[#15803d] to-[#86efac] shadow-sm"
                                    style={{ height: `${barHeight}px` }}
                                >
                                    <span
                                        className="absolute left-1/2 z-10 -translate-x-1/2 rounded bg-[#1a2b4c] px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums"
                                        style={{
                                            bottom: `${barHeight + 4}px`,
                                        }}
                                    >
                                        {unit.percent}%
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 w-full text-center">
                                <p
                                    className="line-clamp-3 text-[9px] leading-tight font-semibold text-[#2e5a9e] uppercase"
                                    title={unit.provider}
                                >
                                    {unit.provider}
                                </p>
                                <p className="mt-0.5 text-[10px] font-bold text-[#6b8ead] tabular-nums">
                                    {unit.plate}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
