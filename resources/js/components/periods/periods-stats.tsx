import { CalendarRange, CheckCircle2, FileText, LayoutGrid, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PeriodsStatsData = {
    periods: number;
    active: number;
    page: string;
    on_screen: number;
    inactive: number;
};

const items = [
    {
        key: 'periods',
        label: 'Periodos',
        icon: CalendarRange,
        className: 'bg-[#e8f1fa] text-[#2e5a9e]',
    },
    {
        key: 'active',
        label: 'Activos',
        icon: CheckCircle2,
        className: 'bg-[#e8f7ef] text-[#15803d]',
    },
    {
        key: 'page',
        label: 'Página',
        icon: FileText,
        className: 'bg-[#fff1e6] text-[#c2410c]',
    },
    {
        key: 'on_screen',
        label: 'En pantalla',
        icon: LayoutGrid,
        className: 'bg-[#efe8fb] text-[#6d28d9]',
    },
    {
        key: 'inactive',
        label: 'Inactivos',
        icon: PauseCircle,
        className: 'bg-[#eef1f5] text-[#64748b]',
    },
] as const;

type Props = {
    stats: PeriodsStatsData;
};

export function PeriodsStats({ stats }: Props) {
    return (
        <div className="flex flex-wrap gap-2">
            {items.map(({ key, label, icon: Icon, className }) => (
                <div
                    key={key}
                    className={cn(
                        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium',
                        className,
                    )}
                >
                    <Icon className="size-3.5 shrink-0" />
                    <span>
                        {label}{' '}
                        <strong className="font-semibold">{stats[key]}</strong>
                    </span>
                </div>
            ))}
        </div>
    );
}
