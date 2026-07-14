import { FileText, LayoutGrid, Shield, ShieldOff, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UsersStatsData = {
    users: number;
    with_roles: number;
    page: string;
    on_screen: number;
    without_roles: number;
};

const items = [
    {
        key: 'users',
        label: 'Usuarios',
        icon: Users,
        className: 'bg-[#e8f1fa] text-[#2e5a9e]',
    },
    {
        key: 'with_roles',
        label: 'Con roles',
        icon: Shield,
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
        key: 'without_roles',
        label: 'Sin roles',
        icon: ShieldOff,
        className: 'bg-[#eef1f5] text-[#64748b]',
    },
] as const;

type Props = {
    stats: UsersStatsData;
};

export function UsersStats({ stats }: Props) {
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
