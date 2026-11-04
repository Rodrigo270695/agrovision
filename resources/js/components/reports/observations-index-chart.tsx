import { Button } from '@/components/ui/button';

export type ObservationIndexRow = {
    observation: string;
    count: number;
    plates: string[];
};

type Props = {
    rows: ObservationIndexRow[];
    onViewPlates: (row: ObservationIndexRow) => void;
};

export function ObservationsIndexChart({ rows, onViewPlates }: Props) {
    if (rows.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                No hay observaciones en el rango seleccionado.
            </p>
        );
    }

    const max = Math.max(...rows.map((row) => row.count), 1);

    return (
        <div className="space-y-3">
            {rows.map((row) => {
                const width = Math.round((row.count / max) * 100);

                return (
                    <div
                        key={row.observation}
                        className="grid min-w-0 gap-2 border-b border-[#e8eef5] pb-3 last:border-0 md:grid-cols-[minmax(0,1fr)_minmax(8rem,12rem)_auto] md:items-center"
                    >
                        <p
                            className="text-xs font-semibold leading-snug break-words text-brand-500 uppercase"
                            title={row.observation}
                        >
                            {row.observation}
                        </p>
                        <div className="flex min-w-0 items-center gap-2">
                            <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-[#f1f5f9]">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#dc2626] to-[#f87171]"
                                    style={{ width: `${width}%` }}
                                />
                            </div>
                            <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-brand-700">
                                {row.count}
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-full shrink-0 border-brand-300 text-[11px] font-semibold text-brand-700 md:w-auto"
                            onClick={() => onViewPlates(row)}
                        >
                            Ver placas ({row.count})
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}
