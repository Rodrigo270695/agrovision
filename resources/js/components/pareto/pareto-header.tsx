import {
    AlertTriangle,
    CalendarClock,
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
};

export function ParetoHeader({ stats, onCreate }: Props) {
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
                can('pareto.create') ? (
                    <Button
                        type="button"
                        onClick={onCreate}
                        className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        <Plus className="size-4" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo ítem</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                ) : null
            }
        />
    );
}
