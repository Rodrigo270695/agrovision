import { CalendarRange, CheckCircle2, PauseCircle, Plus } from 'lucide-react';
import { PageHeader } from '@/components/data-page';
import type { PeriodsStatsData } from '@/components/periods/periods-stats';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: PeriodsStatsData;
    onCreate: () => void;
};

export function PeriodsHeader({ stats, onCreate }: Props) {
    const { can } = useCan();

    return (
        <PageHeader
            title="Periodos"
            description="Gestión de periodos operativos de las unidades."
            stats={[
                {
                    label: 'Total',
                    value: stats.periods,
                    variant: 'info',
                    icon: CalendarRange,
                },
                {
                    label: 'Activos',
                    value: stats.active,
                    variant: 'success',
                    icon: CheckCircle2,
                },
                {
                    label: 'Inactivos',
                    value: stats.inactive,
                    variant: 'muted',
                    icon: PauseCircle,
                },
                {
                    label: 'En pantalla',
                    value: stats.on_screen,
                    variant: 'primary',
                    icon: CalendarRange,
                },
            ]}
            action={
                can('periods.create') ? (
                    <Button
                        type="button"
                        onClick={onCreate}
                        className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        <Plus className="size-4" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo periodo</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                ) : null
            }
        />
    );
}
