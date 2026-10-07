import { cn } from '@/lib/utils';
import type { ReportTone } from '@/components/company-reports/types';

const TONE: Record<ReportTone, { label: string; chip: string; bar: string }> = {
    ok: {
        label: 'En meta',
        chip: 'bg-emerald-50 text-emerald-700',
        bar: 'bg-emerald-500',
    },
    mid: {
        label: 'En riesgo',
        chip: 'bg-amber-50 text-amber-800',
        bar: 'bg-amber-500',
    },
    bad: {
        label: 'Bajo la meta',
        chip: 'bg-red-50 text-red-700',
        bar: 'bg-red-500',
    },
    muted: {
        label: 'Sin cuota',
        chip: 'bg-slate-100 text-slate-600',
        bar: 'bg-slate-400',
    },
};

export function toneOf(percent: number): ReportTone {
    if (percent >= 100) {
        return 'ok';
    }

    if (percent >= 70) {
        return 'mid';
    }

    return 'bad';
}

export function Semaphore({ tone }: { tone: ReportTone }) {
    const item = TONE[tone];

    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                item.chip,
            )}
        >
            {item.label}
        </span>
    );
}

export function Ring({
    percent,
    label,
}: {
    percent: number;
    label: string;
}) {
    const radius = 36;
    const length = 2 * Math.PI * radius;
    const tone = toneOf(percent);
    const color =
        tone === 'ok' ? '#16a34a' : tone === 'mid' ? '#d97706' : '#dc2626';
    const dash = (Math.min(Math.max(percent, 0), 100) / 100) * length;

    return (
        <div className="flex flex-col items-center gap-1">
            <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden>
                <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke="#e8eef5"
                    strokeWidth="10"
                />
                <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="10"
                    strokeDasharray={`${dash} ${length}`}
                    strokeLinecap="round"
                    transform="rotate(-90 48 48)"
                />
                <text
                    x="48"
                    y="52"
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="700"
                    fill="#1a2b4c"
                >
                    {percent}%
                </text>
            </svg>
            <p className="max-w-28 text-center text-[11px] text-[#5a7390]">
                {label}
            </p>
        </div>
    );
}

export function BarChart({
    rows,
}: {
    rows: Array<{ label: string; value: number; max: number; tone: ReportTone }>;
}) {
    if (rows.length === 0) {
        return (
            <p className="text-sm text-[#5a7390]">No hay datos para el gráfico.</p>
        );
    }

    return (
        <div className="space-y-2">
            {rows.map((row) => {
                const width =
                    row.max > 0 ? Math.min(100, (row.value / row.max) * 100) : 0;

                return (
                    <div key={row.label}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-xs text-[#1a2b4c]">
                            <span className="truncate">{row.label}</span>
                            <span className="tabular-nums">{row.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#e8eef5]">
                            <div
                                className={cn('h-full rounded-full', TONE[row.tone].bar)}
                                style={{ width: `${width}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
