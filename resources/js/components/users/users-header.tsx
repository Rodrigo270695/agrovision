import { Plus, Shield, ShieldOff, Users } from 'lucide-react';
import { PageHeader } from '@/components/data-page';
import type { UsersStatsData } from '@/components/users/users-stats';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: UsersStatsData;
    onCreate: () => void;
};

export function UsersHeader({ stats, onCreate }: Props) {
    const { can } = useCan();

    return (
        <PageHeader
            title="Usuarios"
            description="Gestión de usuarios y asignación de roles."
            stats={[
                {
                    label: 'Total',
                    value: stats.users,
                    variant: 'info',
                    icon: Users,
                },
                {
                    label: 'Con roles',
                    value: stats.with_roles,
                    variant: 'success',
                    icon: Shield,
                },
                {
                    label: 'Sin roles',
                    value: stats.without_roles,
                    variant: 'warning',
                    icon: ShieldOff,
                },
                {
                    label: 'En pantalla',
                    value: stats.on_screen,
                    variant: 'primary',
                    icon: Users,
                },
            ]}
            action={
                can('users.create') ? (
                    <Button
                        type="button"
                        onClick={onCreate}
                        className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        <Plus className="size-4" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo usuario</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                ) : null
            }
        />
    );
}
