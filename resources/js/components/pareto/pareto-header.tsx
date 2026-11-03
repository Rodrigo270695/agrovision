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
                'rounded-2xl border border-white/10 bg-gradient-to-br px-3 py-2.5 backdrop-blur-sm',
                tones[tone],
            )}
        >
            <p className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">
                {label}
            </p>
            <p className="mt-0.5 font-[Manrope] text-2xl font-bold tabular-nums">
                {value}
            </p>
        </div>
    );
}

export function ParetoHeader({ stats, onCreate, onVehicleTypes }: Props) {
    const { can } = useCan();

    return (
        <div className="flex flex-col gap-4 sm:gap-5">
            <header className="overflow-hidden rounded-3xl border border-white/70 bg-[#0f1f3a] text-white shadow-[0_24px_60px_-28px_rgba(15,31,58,0.65)]">
                <div className="relative px-5 py-6 sm:px-7 sm:py-7">
                    <div
                        aria-hidden
                        className="absolute -right-16 -top-20 size-56 rounded-full bg-amber-400/20 blur-3xl"
                    />
                    <div
                        aria-hidden
                        className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-sky-400/15 blur-3xl"
                    />

                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-sky-100 uppercase backdrop-blur-sm">
                                <Sparkles
                                    className="size-3.5"
                                    aria-hidden
                                />
                                Plataforma · Inspecciones
                            </div>
                            <h1 className="mt-3 font-[Manrope] text-3xl font-bold tracking-tight sm:text-4xl">
                                Pareto
                            </h1>
                            <p className="mt-2 max-w-xl text-sm leading-relaxed text-sky-100/85 sm:text-[15px]">
                                Exigencias con peso para el checklist. La suma
                                de pesos activos debe ser exactamente 100% para
                                poder inspeccionar con criterio.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
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

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div
                    className={cn(
                        'inline-flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ring-1 ring-inset',
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
                            onClick={onVehicleTypes}
                            className="cursor-pointer gap-2 rounded-xl border-slate-200 text-[#0f1f3a] hover:bg-slate-50"
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
                            className="cursor-pointer gap-2 rounded-xl bg-[#1e4d8c] text-white hover:bg-[#163a6b]"
                        >
                            <Plus className="size-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">Nuevo ítem</span>
                            <span className="sm:hidden">Nuevo</span>
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
