export type InductionStatsData = {
    total: number;
    scheduled: number;
    in_progress: number;
    closed: number;
    page: string;
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#d7e3f0] bg-[#f8fafc] px-2.5 py-1 text-xs text-[#5a7390]"
                >
                    <span className="font-medium text-[#1a2b4c]">{item.label}</span>
                    <span className="font-semibold text-[#2e5a9e]">{item.value}</span>
                </span>
            ))}
        </div>
    );
}
