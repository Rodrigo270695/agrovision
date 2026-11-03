import { Plus } from 'lucide-react';
import {
    PlatformHero,
    PlatformToolbar,
} from '@/components/platform';
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
        <div className="flex flex-col gap-3">
            <PlatformHero
                eyebrow="Usuarios · Acceso"
                title="Roles"
                description="Gestión de roles y permisos del sistema."
                stats={[
                    { label: 'Roles', value: stats.roles, tone: 'navy' },
                    {
                        label: 'Tipos de permiso',
                        value: stats.permission_types,
                        tone: 'sky',
                    },
                    {
                        label: 'Sin permisos',
                        value: stats.without_permissions,
                        tone: 'amber',
                    },
                    {
                        label: 'En pantalla',
                        value: stats.on_screen,
                        tone: 'emerald',
                    },
                ]}
            />

            {can('roles.create') ? (
                <PlatformToolbar>
                    <Button
                        type="button"
                        size="sm"
                        onClick={onCreate}
                        className="cursor-pointer gap-1.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
                    >
                        <Plus className="size-3.5" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo rol</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                </PlatformToolbar>
            ) : null}
        </div>
    );
}
