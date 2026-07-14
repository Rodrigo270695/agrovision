import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RolesStats, type RolesStatsData } from '@/components/roles/roles-stats';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: RolesStatsData;
    onCreate: () => void;
};

export function RolesHeader({ stats, onCreate }: Props) {
    const { can } = useCan();

    return (
        <div className="rounded-2xl border border-[#d7e3f0] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                    <div>
                        <h1 className="font-display inline-block border-b-2 border-[#4a90e2] pb-1 text-2xl font-semibold text-[#1a2b4c]">
                            Roles
                        </h1>
                        <p className="mt-2 text-sm text-[#5a7390]">
                            Gestión de roles y permisos del sistema.
                        </p>
                    </div>
                    <RolesStats stats={stats} />
                </div>

                {can('roles.create') ? (
                    <Button
                        type="button"
                        onClick={onCreate}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        <Plus className="size-4" />
                        Nuevo rol
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
