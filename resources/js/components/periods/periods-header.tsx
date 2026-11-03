import { Plus } from 'lucide-react';
import type { PeriodsStatsData } from '@/components/periods/periods-stats';
import {
    PlatformHero,
    PlatformToolbar,
} from '@/components/platform';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: PeriodsStatsData;
    onCreate: () => void;
};

export function PeriodsHeader({ stats, onCreate }: Props) {
    const { can } = useCan();

    return (
        <div className="flex flex-col gap-3">
            <PlatformHero
                title="Periodos"
                description="Gestión de periodos operativos de las unidades."
                stats={[
                    { label: 'Total', value: stats.periods, tone: 'navy' },
                    { label: 'Activos', value: stats.active, tone: 'emerald' },
                    { label: 'Inactivos', value: stats.inactive, tone: 'amber' },
                    {
                        label: 'En pantalla',
                        value: stats.on_screen,
                        tone: 'sky',
                    },
                ]}
            />

            {can('periods.create') ? (
                <PlatformToolbar>
                    <Button
                        type="button"
                        size="sm"
                        onClick={onCreate}
                        className="cursor-pointer gap-1.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
                    >
                        <Plus className="size-3.5" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo periodo</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                </PlatformToolbar>
            ) : null}
        </div>
    );
}
