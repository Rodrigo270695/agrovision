import { AlertTriangle, Clock3, Plus, Wine } from 'lucide-react';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Stats = {
    total: number;
    tests: number;
    positive: number;
    pending: number;
};

type Props = {
    stats: Stats;
    onCreate: () => void;
    isCoordinatorView?: boolean;
};

export function AlcoholTestsHeader({
    stats,
    onCreate,
    isCoordinatorView = false,
}: Props) {
    const { can } = useCan();

    return (
        <PageHeader
            title="Alcohómetro"
            description={
                isCoordinatorView
                    ? 'Solo ves operativos ya enviados con tests de tus unidades. Se destaca cuántos no pasaron.'
                    : 'Crea un paquete, registra tests con evidencia, envía a coordinadores y cierra cuando termines. Tolerancia 0.'
            }
            stats={[
                {
                    label: 'Paquetes',
                    value: stats.total,
                    variant: 'info',
                    icon: Wine,
                },
                {
                    label: isCoordinatorView ? 'Tus tests' : 'Tests',
                    value: stats.tests,
                    variant: 'primary',
                    icon: Wine,
                },
                {
                    label: isCoordinatorView ? 'No pasaron' : 'Positivos',
                    value: stats.positive,
                    variant: 'danger',
                    icon: AlertTriangle,
                },
                {
                    label: 'Pendientes',
                    value: stats.pending,
                    variant: 'warning',
                    icon: Clock3,
                },
            ]}
            action={
                !isCoordinatorView && can('alcoholtests.create') ? (
                    <Button
                        type="button"
                        onClick={onCreate}
                        className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        <Plus className="size-4" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo paquete</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                ) : null
            }
        />
    );
}
