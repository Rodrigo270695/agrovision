import { Plus } from 'lucide-react';
import {
    PlatformHero,
    PlatformToolbar,
} from '@/components/platform';
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
        <div className="flex flex-col gap-3">
            <PlatformHero
                title="Alcohómetro"
                description={
                    isCoordinatorView
                        ? 'Solo ves operativos ya enviados con tests de tus unidades. Se destaca cuántos no pasaron.'
                        : 'Crea un paquete, registra tests con evidencia, envía a coordinadores y cierra cuando termines. Tolerancia 0.'
                }
                stats={[
                    { label: 'Paquetes', value: stats.total, tone: 'navy' },
                    {
                        label: isCoordinatorView ? 'Tus tests' : 'Tests',
                        value: stats.tests,
                        tone: 'sky',
                    },
                    {
                        label: isCoordinatorView ? 'No pasaron' : 'Positivos',
                        value: stats.positive,
                        tone: 'rose',
                    },
                    {
                        label: 'Pendientes',
                        value: stats.pending,
                        tone: 'amber',
                    },
                ]}
            />

            {!isCoordinatorView && can('alcoholtests.create') ? (
                <PlatformToolbar>
                    <Button
                        type="button"
                        size="sm"
                        onClick={onCreate}
                        className="cursor-pointer gap-1.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
                    >
                        <Plus className="size-3.5" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo paquete</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                </PlatformToolbar>
            ) : null}
        </div>
    );
}
