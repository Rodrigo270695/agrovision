import { Plus } from 'lucide-react';
import {
    PlatformHero,
    PlatformToolbar,
} from '@/components/platform';
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
        <div className="flex flex-col gap-3">
            <PlatformHero
                eyebrow="Usuarios · Acceso"
                title="Usuarios"
                description="Gestión de usuarios y asignación de roles."
                stats={[
                    { label: 'Total', value: stats.users, tone: 'navy' },
                    {
                        label: 'Con roles',
                        value: stats.with_roles,
                        tone: 'emerald',
                    },
                    {
                        label: 'Sin roles',
                        value: stats.without_roles,
                        tone: 'amber',
                    },
                    {
                        label: 'En pantalla',
                        value: stats.on_screen,
                        tone: 'sky',
                    },
                ]}
            />

            {can('users.create') ? (
                <PlatformToolbar>
                    <Button
                        type="button"
                        size="sm"
                        onClick={onCreate}
                        className="cursor-pointer gap-1.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
                    >
                        <Plus className="size-3.5" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo usuario</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                </PlatformToolbar>
            ) : null}
        </div>
    );
}
