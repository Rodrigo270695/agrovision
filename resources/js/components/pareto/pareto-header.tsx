import {
    AlertTriangle,
    CalendarClock,
    Car,
    ChartPie,
    Plus,
    Scale,
    Sparkles,
} from 'lucide-react';
import type { ParetoStats } from '@/components/pareto/pareto-table';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';

type Props = {
    stats: ParetoStats;
    onCreate: () => void;
    onVehicleTypes: () => void;
};

function StatPill({
    label,
    value,
    tone,
}: {
    label: string;
    value: number | string;
    tone: 'navy' | 'amber' | 'rose' | 'emerald' | 'sky';
}) {
    const tones = {
        navy: 'from-white/15 to-white/5 text-white',
        amber: 'from-amber-400/25 to-amber-500/10 text-amber-50',
        rose: 'from-rose-400/25 to-rose-500/10 text-rose-50',
        emerald: 'from-emerald-400/25 to-emerald-500/10 text-emerald-50',
        sky: 'from-sky-400/25 to-sky-500/10 text-sky-50',
    };

    return (
        <div
            className={cn(
                'rounded-xl border border-white/10 bg-gradient-to-br px-2.5 py-1.5 backdrop-blur-sm',
                tones[tone],
            )}
        >
            <p className="text-[9px] font-semibold tracking-wide text-white/70 uppercase">
                {label}
            </p>
            <p className="font-[Manrope] text-xl font-bold tabular-nums leading-tight">
                {value}
            </p>
        </div>
    );
}

export function ParetoHeader({ stats, onCreate, onVehicleTypes }: Props) {
    const { can } = useCan();

    return (
        <div className="flex flex-col gap-3">
            <header className="overflow-hidden rounded-2xl border border-white/70 bg-[#0f1f3a] text-white shadow-[0_18px_40px_-24px_rgba(15,31,58,0.55)]">
                <div className="relative px-4 py-4 sm:px-5 sm:py-4">
                    <div
                        aria-hidden
                        className="absolute -right-12 -top-16 size-40 rounded-full bg-amber-400/20 blur-3xl"
                    />
                    <div
                        aria-hidden
                        className="absolute -bottom-20 left-1/3 size-48 rounded-full bg-sky-400/15 blur-3xl"
                    />

                    <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-sky-100 uppercase backdrop-blur-sm">
                                <Sparkles
                                    className="size-3"
                                    aria-hidden
                                />
                                Plataforma · Inspecciones
                            </div>
                            <h1 className="mt-1.5 font-[Manrope] text-2xl font-bold tracking-tight sm:text-[1.75rem]">
                                Pareto
                            </h1>
                            <p className="mt-1 max-w-2xl text-xs leading-snug text-sky-100/85 sm:text-sm">
                                Exigencias con peso para el checklist. La suma
                                de pesos activos debe ser exactamente 100%.
                            </p>
                        </div>

                        <div className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-4 lg:w-auto lg:min-w-[380px]">
                            <StatPill
                                label="Ítems"
                                value={stats.total}
                                tone="navy"
                            />
                            <StatPill
                                label="Peso total"
                                value={`${stats.weight_total}%`}
                                tone={stats.weight_ok ? 'emerald' : 'amber'}
                            />
                            <StatPill
                                label="Observación"
                                value={stats.observation}
                                tone="amber"
                            />
                            <StatPill
                                label="Vencimiento"
                                value={stats.expiry}
                                tone="sky"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
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
                    <Scale className="size-3.5 shrink-0" strokeWidth={2.5} />
                    <span className="min-w-0">
                        {stats.weight_ok
                            ? 'Balance correcto · listo para inspecciones'
                            : `Balance incompleto · ${stats.weight_total}% de 100% · ajusta pesos activos`}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                </div>
            </div>
        </div>
    );
}
