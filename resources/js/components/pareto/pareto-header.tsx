import {
    AlertTriangle,
    CalendarClock,
    Car,
    ChartPie,
    Plus,
    Scale,
} from 'lucide-react';
import type { ParetoStats } from '@/components/pareto/pareto-table';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: ParetoStats;
    onCreate: () => void;
    onVehicleTypes: () => void;
};

export function ParetoHeader({ stats, onCreate, onVehicleTypes }: Props) {
    const { can } = useCan();

    return (
        <PageHeader
            title="Pareto"
            description="Exigencias de inspección con peso. La suma de pesos activos debe ser 100%."
            stats={[
                {
                    label: 'Ítems',
                    value: stats.total,
                    variant: 'info',
                    icon: ChartPie,
                },
                {
                    label: 'Peso total',
                    value: `${stats.weight_total}%`,
                    variant: stats.weight_ok ? 'success' : 'warning',
                    icon: Scale,
                },
                {
                    label: 'Observación',
                    value: stats.observation,
                    variant: 'muted',
                    icon: AlertTriangle,
                },
                {
                    label: 'Vencimiento',
                    value: stats.expiry,
                    variant: 'primary',
                    icon: CalendarClock,
                },
            ]}
            action={
                <div className="flex flex-wrap items-center gap-2">
                    {can('pareto.view') ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onVehicleTypes}
                            className="cursor-pointer gap-2 border-[#1a2b4c] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                        >
                            <Car className="size-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">
                                Tipos de vehículo
                            </span>
                            <span className="sm:hidden">Tipos</span>
                        </Button>
                    ) : null}
                    {can('pareto.create') ? (
                        <Button
                            type="button"
                            onClick={onCreate}
                            className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            <Plus className="size-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">Nuevo ítem</span>
                            <span className="sm:hidden">Nuevo</span>
                        </Button>
                    ) : null}
                </div>
            }
        />
    );
}
