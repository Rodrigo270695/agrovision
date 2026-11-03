import {
    AlertTriangle,
    CalendarClock,
    Car,
    ChartPie,
    Plus,
    Scale,
} from 'lucide-react';
import type { ParetoStats } from '@/components/pareto/pareto-table';
import {
    PlatformHero,
    PlatformToolbar,
} from '@/components/platform';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';

type Props = {
    stats: ParetoStats;
    onCreate: () => void;
    onVehicleTypes: () => void;
};

export function ParetoHeader({ stats, onCreate, onVehicleTypes }: Props) {
    const { can } = useCan();

    return (
        <div className="flex flex-col gap-3">
            <PlatformHero
                eyebrow="Plataforma · Inspecciones"
                title="Pareto"
                description="Exigencias con peso para el checklist. La suma de pesos activos debe ser exactamente 100%."
                stats={[
                    { label: 'Ítems', value: stats.total, tone: 'navy' },
                    {
                        label: 'Peso total',
                        value: `${stats.weight_total}%`,
                        tone: stats.weight_ok ? 'emerald' : 'amber',
                    },
                    {
                        label: 'Observación',
                        value: stats.observation,
                        tone: 'amber',
                    },
                    {
                        label: 'Vencimiento',
                        value: stats.expiry,
                        tone: 'sky',
                    },
                ]}
            />

            <PlatformToolbar
                leading={
                    <div
                        className={cn(
                            'inline-flex max-w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset',
                            stats.weight_ok
                                ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                                : 'bg-amber-50 text-amber-950 ring-amber-200',
                        )}
                        role="status"
                        aria-atomic="true"
                    >
                        <Scale
                            className="size-3.5 shrink-0"
                            strokeWidth={2.5}
                        />
                        <span className="min-w-0">
                            {stats.weight_ok
                                ? 'Balance correcto · listo para inspecciones'
                                : `Balance incompleto · ${stats.weight_total}% de 100% · ajusta pesos activos`}
                        </span>
                    </div>
                }
            >
                <span className="mr-1 hidden items-center gap-3 text-xs font-medium text-slate-500 sm:inline-flex">
                    <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="size-3.5 text-amber-500" />
                        Obs.
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-3.5 text-sky-500" />
                        Venc.
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <ChartPie className="size-3.5 text-[#1e4d8c]" />
                        Peso
                    </span>
                </span>

                {can('pareto.view') ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onVehicleTypes}
                        className="cursor-pointer gap-1.5 rounded-xl border-slate-200 text-[#0f1f3a] hover:bg-slate-50"
                    >
                        <Car className="size-3.5" strokeWidth={2.5} />
                        <span className="hidden sm:inline">
                            Tipos de vehículo
                        </span>
                        <span className="sm:hidden">Tipos</span>
                    </Button>
                ) : null}
                {can('pareto.create') ? (
                    <Button
                        type="button"
                        size="sm"
                        onClick={onCreate}
                        className="cursor-pointer gap-1.5 rounded-xl bg-[#1e4d8c] text-white hover:bg-[#163a6b]"
                    >
                        <Plus className="size-3.5" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo ítem</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                ) : null}
            </PlatformToolbar>
        </div>
    );
}
