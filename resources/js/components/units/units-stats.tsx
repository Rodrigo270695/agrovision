import { Bus, Building2, FileText, LayoutGrid, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UnitsStatsData = {
    units: number;
    providers: number;
    page: string;
    on_screen: number;
    without_plate: number;
};

const items = [
    {
        key: 'units',
        label: 'Unidades',
        icon: Bus,
        className: 'bg-[#e8f1fa] text-[#2e5a9e]',
    },
    {
        key: 'providers',
        label: 'Proveedores',
        icon: Building2,
        className: 'bg-[#efe8fb] text-[#6d28d9]',
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
        className: 'bg-[#e8f7ef] text-[#15803d]',
    },
    {
        key: 'without_plate',
        label: 'Sin placa',
        icon: TriangleAlert,
        className: 'bg-[#eef1f5] text-[#64748b]',
    },
] as const;

type Props = {
    stats: UnitsStatsData;
};

export function UnitsStats({ stats }: Props) {
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
