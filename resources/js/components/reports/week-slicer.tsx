import { cn } from '@/lib/utils';

type Props = {
    year: number;
    week: number;
    availableWeeks: number[];
    onSelect: (week: number) => void;
};

export function WeekSlicer({ year, week, availableWeeks, onSelect }: Props) {
    const weeks = availableWeeks.length > 0
        ? availableWeeks
        : Array.from({ length: 52 }, (_, index) => index + 1);

    return (
        <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-bold tracking-wide text-[#1a2b4c] uppercase">
                    Semana · {year}
                </p>
                <p className="text-[10px] text-[#6b8ead]">
                    {availableWeeks.length} con datos
                </p>
            </div>
            <div className="max-h-40 overflow-y-auto pr-1">
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                    {weeks.map((entry) => {
                        const active = entry === week;
                        const hasData = availableWeeks.includes(entry);

                        return (
                            <button
                                key={entry}
                                type="button"
                                onClick={() => onSelect(entry)}
                                className={cn(
                                    'cursor-pointer rounded-md border px-2 py-2 text-xs font-bold tabular-nums transition',
                                    active
                                        ? 'border-[#1a2b4c] bg-[#1a2b4c] text-white'
                                        : hasData
                                          ? 'border-[#bae6fd] bg-[#e0f2fe] text-[#0c4a6e] hover:bg-[#bae6fd]'
                                          : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:bg-[#f1f5f9]',
                                )}
                            >
                                {entry}
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
