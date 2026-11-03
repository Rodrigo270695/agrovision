export type InductionStatsData = {
    total: number;
    scheduled: number;
    in_progress: number;
    closed: number;
    page?: string;
    types?: number;
};

type Props = {
    stats: InductionStatsData;
};

export function InductionsStats({ stats }: Props) {
    const items = [
        { label: 'Total', value: stats.total },
        { label: 'Programadas', value: stats.scheduled },
        { label: 'En curso', value: stats.in_progress },
        { label: 'Cerradas', value: stats.closed },
        { label: 'Página', value: stats.page },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <span
                    key={item.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-background px-2.5 py-1 text-xs text-muted-foreground"
                >
                    <span className="font-medium text-brand-700">{item.label}</span>
                    <span className="font-semibold text-brand-500">{item.value}</span>
                </span>
            ))}
        </div>
    );
}
