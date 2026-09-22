import { KeyRound, Plus, Shield, ShieldOff } from 'lucide-react';
import { PageHeader } from '@/components/data-page';
import type { RolesStatsData } from '@/components/roles/roles-stats';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: RolesStatsData;
    onCreate: () => void;
};

export function RolesHeader({ stats, onCreate }: Props) {
    const { can } = useCan();

    return (
        <PageHeader
            title="Roles"
            description="Gestión de roles y permisos del sistema."
            stats={[
                {
                    label: 'Roles',
                    value: stats.roles,
                    variant: 'info',
                    icon: Shield,
                },
                {
                    label: 'Tipos de permiso',
                    value: stats.permission_types,
                    variant: 'primary',
                    icon: KeyRound,
                },
                {
                    label: 'Sin permisos',
                    value: stats.without_permissions,
                    variant: 'warning',
                    icon: ShieldOff,
                },
                {
                    label: 'En pantalla',
                    value: stats.on_screen,
                    variant: 'success',
                    icon: Shield,
                },
            ]}
            action={
                can('roles.create') ? (
                    <Button
                        type="button"
                        onClick={onCreate}
                        className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        <Plus className="size-4" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo rol</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                ) : null
            }
        />
    );
}
