import { cn } from '@/lib/utils';

export type WeekPoint = {
    week: number;
    year: number;
};

type Props = {
    rangeLabel: string;
    week: number | null;
    weekYear: number | null;
    availableWeeks: WeekPoint[];
    allowAll?: boolean;
    onSelect: (point: WeekPoint | null) => void;
};

function weekKey(point: WeekPoint): string {
    return `${point.year}-${point.week}`;
}

export function WeekSlicer({
    rangeLabel,
    week,
    weekYear,
    availableWeeks,
    allowAll = false,
    onSelect,
}: Props) {
    const selectedKey =
        week !== null && weekYear !== null ? `${weekYear}-${week}` : null;
    const allActive = allowAll && selectedKey === null;

    if (availableWeeks.length === 0) {
        return (
            <section className="rounded-2xl border border-brand-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">
                    No hay inspecciones en el rango ({rangeLabel}) para elegir
                    semana.
                </p>
            </section>
        );
    }

    return (
        <section className="rounded-2xl border border-brand-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold tracking-wide text-brand-700 uppercase">
                    Semana · {rangeLabel}
                </p>
                <p className="text-[10px] text-muted-foreground">
                    {availableWeeks.length} con datos en el rango
                </p>
            </div>
            <div className="max-h-40 overflow-y-auto pr-1">
                <div className="flex flex-wrap gap-2">
                    {allowAll ? (
                        <button
                            type="button"
                            onClick={() => onSelect(null)}
                            className={cn(
                                'cursor-pointer rounded-md border px-3 py-2 text-xs font-bold transition',
                                allActive
                                    ? 'border-brand-700 bg-brand-700 text-white'
                                    : 'border-[#bae6fd] bg-[#e0f2fe] text-[#0c4a6e] hover:bg-[#bae6fd]',
                            )}
                        >
                            Todas
                        </button>
                    ) : null}
                    {availableWeeks.map((entry) => {
                        const active = weekKey(entry) === selectedKey;

                        return (
                            <button
                                key={weekKey(entry)}
                                type="button"
                                onClick={() => onSelect(entry)}
                                className={cn(
                                    'cursor-pointer rounded-md border px-3 py-2 text-xs font-bold tabular-nums transition',
                                    active
                                        ? 'border-brand-700 bg-brand-700 text-white'
                                        : 'border-[#bae6fd] bg-[#e0f2fe] text-[#0c4a6e] hover:bg-[#bae6fd]',
                                )}
                                title={`Año ${entry.year}`}
                            >
                                {entry.week}
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
