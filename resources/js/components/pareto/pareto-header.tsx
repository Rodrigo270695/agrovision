import {
    AlertTriangle,
    CalendarClock,
    ChartPie,
    Plus,
    Scale,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import type { ParetoStats } from '@/components/pareto/pareto-table';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: ParetoStats;
    templateType: string;
    onCreate: () => void;
};

export function ParetoHeader({ stats, templateType, onCreate }: Props) {
    const { can } = useCan();

    const redistribute = () => {
        if (!can('pareto.update') || templateType === 'all') {
            return;
        }

        router.post(
            '/pareto/redistribuir',
            { template_type: templateType },
            { preserveScroll: true },
        );
    };

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
                    {can('pareto.update') && templateType !== 'all' ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={redistribute}
                            className="cursor-pointer gap-2 border-[#c5d5e6] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                            title="Divide 100% en partes iguales"
                        >
                            <Scale className="size-4" />
                            <span className="hidden sm:inline">
                                Redistribuir pesos
                            </span>
                            <span className="sm:hidden">Pesos</span>
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
