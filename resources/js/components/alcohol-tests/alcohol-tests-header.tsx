import { Plus } from 'lucide-react';
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
        <div className="rounded-2xl border border-[#d7e3f0] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                    <div>
                        <h1 className="font-display inline-block border-b-2 border-[#4a90e2] pb-1 text-2xl font-semibold text-[#1a2b4c]">
                            Alcohómetro
                        </h1>
                        <p className="mt-2 text-sm text-[#5a7390]">
                            {isCoordinatorView
                                ? 'Solo ves operativos ya enviados con tests de tus unidades (positivos y negativos). Se destaca cuántos no pasaron.'
                                : 'Crea un paquete, registra tests con evidencia, envía a coordinadores y cierra cuando termines. Tolerancia 0.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eef4fb] px-2.5 py-1 text-xs font-medium text-[#1a2b4c]">
                            Paquetes {stats.total}
                        </span>
                        <span className="rounded-full bg-[#eef4fb] px-2.5 py-1 text-xs font-medium text-[#1a2b4c]">
                            {isCoordinatorView ? 'Tus tests' : 'Tests'}{' '}
                            {stats.tests}
                        </span>
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">
                            {isCoordinatorView
                                ? `No pasaron ${stats.positive}`
                                : `Positivos ${stats.positive}`}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Pendientes {stats.pending}
                        </span>
                    </div>
                </div>

                {!isCoordinatorView && can('alcoholtests.create') ? (
                    <Button
                        type="button"
                        onClick={onCreate}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        <Plus className="size-4" />
                        Nuevo paquete
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
