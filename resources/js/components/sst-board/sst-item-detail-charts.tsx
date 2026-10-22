const OK = '#22c55e';
const PENDIENTE = '#eab308';
const BAJA = '#94a3b8';
const FALTA = '#ef4444';

export type SstDetailBar = {
    label: string;
    week: number;
    year: number;
    percent_ok: number;
    total: number;
};

export type SstDetailSummary = {
    ok: number;
    falta: number;
    baja: number;
    pendiente: number;
    total: number;
    percent: number;
};

export function SstSummaryStrip({ summary }: { summary: SstDetailSummary }) {
    const cells = [
        { key: 'pendiente', label: 'Pendiente', value: summary.pendiente, bg: '#fef3c7', color: '#a16207' },
        { key: 'baja', label: 'Baja', value: summary.baja, bg: '#e2e8f0', color: '#475569' },
        { key: 'ok', label: 'OK', value: summary.ok, bg: '#dcfce7', color: '#166534' },
        { key: 'falta', label: 'Falta', value: summary.falta, bg: '#fee2e2', color: '#b91c1c' },
    ];

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-center text-sm">
                <thead>
                    <tr>
                        {cells.map((cell) => (
                            <th
                                key={cell.key}
                                className="border border-[#d7e3f0] px-4 py-2 text-xs font-bold tracking-wide uppercase"
                                style={{ backgroundColor: cell.bg, color: cell.color }}
                            >
                                {cell.label}
                            </th>
                        ))}
                        <th className="border border-[#d7e3f0] bg-[#f8fafc] px-4 py-2 text-xs font-bold tracking-wide text-[#1a2b4c] uppercase">
                            Total general
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="font-bold text-[#1a2b4c]">
                        {cells.map((cell) => (
                            <td
                                key={cell.key}
                                className="border border-[#d7e3f0] px-4 py-3 tabular-nums"
                            >
                                {cell.value}
                            </td>
                        ))}
                        <td className="border border-[#d7e3f0] bg-[#f8fafc] px-4 py-3 tabular-nums">
                            {summary.total}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export function SstWeeklyVerticalBars({
    bars,
    goalPercent = 85,
}: {
    bars: SstDetailBar[];
    goalPercent?: number;
}) {
    const withData = bars.filter((bar) => bar.total > 0);

    if (withData.length === 0) {
        return (
            <p className="py-16 text-center text-sm text-[#6b8ead]">
                Sin datos para graficar en el rango.
            </p>
        );
    }

    const maxPercent = 100;
    const chartHeight = 200;
    const goalLineBottom = Math.round((goalPercent / maxPercent) * chartHeight);

    return (
        <div className="w-full min-w-0">
            <div className="w-full overflow-x-auto">
                <div
                    className={`relative inline-flex min-w-full items-end gap-3 px-1 pb-2 sm:gap-4 ${withData.length <= 8 ? 'justify-center' : 'justify-start'}`}
                    style={{ minHeight: `${chartHeight + 48}px` }}
                >
                    <div
                        className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-[#94a3b8]"
                        style={{ bottom: `${goalLineBottom + 28}px` }}
                    />
                    <span
                        className="pointer-events-none absolute left-0 text-[10px] font-medium text-[#64748b]"
                        style={{ bottom: `${goalLineBottom + 32}px` }}
                    >
                        {goalPercent}%
                    </span>

                    {withData.map((bar) => {
                        const barHeightPx = Math.max(
                            12,
                            Math.round((bar.percent_ok / maxPercent) * chartHeight),
                        );

                        return (
                            <div
                                key={`${bar.year}-${bar.week}`}
                                className="flex w-11 shrink-0 flex-col items-center sm:w-12"
                            >
                                <span className="mb-1 text-[11px] font-bold tabular-nums text-[#1a2b4c]">
                                    {bar.percent_ok}%
                                </span>
                                <div
                                    className="relative flex w-full items-end justify-center"
                                    style={{ height: `${chartHeight}px` }}
                                >
                                    <div
                                        className="w-full min-h-[12px] rounded-t-md bg-[#22c55e] shadow-sm"
                                        style={{ height: `${barHeightPx}px` }}
                                        title={`${bar.label}: ${bar.percent_ok}% OK (${bar.total} unidades)`}
                                    />
                                </div>
                                <span className="mt-2 text-center text-[10px] font-semibold leading-tight text-[#5a7390]">
                                    {bar.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export function SstDetailDonut({
    title,
    summary,
}: {
    title: string;
    summary: SstDetailSummary;
}) {
    const segments = [
        { label: 'OK', value: summary.ok, color: OK },
        { label: 'Pendiente', value: summary.pendiente, color: PENDIENTE },
        { label: 'Baja', value: summary.baja, color: BAJA },
        { label: 'Falta', value: summary.falta, color: FALTA },
    ].filter((row) => row.value > 0);

    const total = summary.total;
    const radius = 58;
    const stroke = 18;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const arcs =
        total === 0
            ? []
            : segments.map((segment) => {
                  const length = (segment.value / total) * circumference;
                  const arc = {
                      ...segment,
                      dash: length,
                      gap: circumference - length,
                      offset,
                  };
                  offset += length;

                  return arc;
              });

    return (
        <div className="flex h-full flex-col">
            <h3 className="text-center text-sm font-bold text-[#1a2b4c] uppercase">
                {title}
            </h3>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
                <div className="relative size-44">
                    <svg viewBox="0 0 140 140" className="size-full -rotate-90">
                        <circle
                            cx="70"
                            cy="70"
                            r={radius}
                            fill="none"
                            stroke="#eef3f8"
                            strokeWidth={stroke}
                        />
                        {arcs.map((arc) => (
                            <circle
                                key={arc.label}
                                cx="70"
                                cy="70"
                                r={radius}
                                fill="none"
                                stroke={arc.color}
                                strokeWidth={stroke}
                                strokeDasharray={`${arc.dash} ${arc.gap}`}
                                strokeDashoffset={-arc.offset}
                            />
                        ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-[#1a2b4c]">
                            {summary.percent}%
                        </span>
                    </div>
                </div>
                <ul className="w-full space-y-1 text-xs text-[#5a7390]">
                    {segments.map((segment) => (
                        <li
                            key={segment.label}
                            className="flex items-center justify-between gap-2"
                        >
                            <span className="inline-flex items-center gap-2">
                                <span
                                    className="size-2.5 shrink-0 rounded-sm"
                                    style={{ backgroundColor: segment.color }}
                                />
                                {segment.label}
                            </span>
                            <span className="font-semibold tabular-nums text-[#1a2b4c]">
                                {segment.value}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
