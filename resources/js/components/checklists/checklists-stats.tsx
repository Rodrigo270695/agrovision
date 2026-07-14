import { FileText, ClipboardCheck, ClipboardList, LayoutGrid, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChecklistsStatsData = {
    total: number;
    draft: number;
    completed: number;
    page: string;
    on_screen: number;
};

const items = [
    {
        key: 'total',
        label: 'Total',
        icon: ClipboardList,
        className: 'bg-[#e8f1fa] text-[#2e5a9e]',
    },
    {
        key: 'draft',
        label: 'Borradores',
        icon: FileText,
        className: 'bg-[#fff1e6] text-[#c2410c]',
    },
    {
        key: 'completed',
        label: 'Completados',
        icon: CircleCheck,
        className: 'bg-[#e8f7ef] text-[#15803d]',
    },
    {
        key: 'page',
        label: 'Página',
        icon: ClipboardCheck,
        className: 'bg-[#efe8fb] text-[#6d28d9]',
    },
    {
        key: 'on_screen',
        label: 'En pantalla',
        icon: LayoutGrid,
        className: 'bg-[#eef1f5] text-[#64748b]',
    },
] as const;

type Props = {
    stats: ChecklistsStatsData;
};

export function ChecklistsStats({ stats }: Props) {
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
