export type ObservationIndexRow = {
    observation: string;
    count: number;
    plates: string[];
};

export function ObservationsIndexChart({ rows }: { rows: ObservationIndexRow[] }) {
    if (rows.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-[#6b8ead]">
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
                        className="grid gap-2 border-b border-[#e8eef5] pb-3 last:border-0 md:grid-cols-[minmax(0,1fr)_minmax(6rem,10rem)] md:items-center"
                    >
                        <p
                            className="text-xs font-semibold text-[#2e5a9e] uppercase leading-snug"
                            title={row.observation}
                        >
                            {row.observation}
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#f1f5f9]">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#dc2626] to-[#f87171]"
                                    style={{ width: `${width}%` }}
                                />
                            </div>
                            <span className="w-8 text-right text-xs font-bold tabular-nums text-[#1a2b4c]">
                                {row.count}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
