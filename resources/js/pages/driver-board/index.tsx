import { Head, router, usePage } from '@inertiajs/react';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type Ring = {
    key: string;
    label: string;
    source: 'inspeccion' | 'induccion';
    mode: 'status' | 'programar';
    ok: number;
    baja: number;
    falta: number;
    programar: number;
    total: number;
    percent: number;
};

type Filters = {
    date_from: string | null;
    date_to: string | null;
    coordinator_id: number | null;
    inspector_id: number | null;
    sede: number | null;
};

type PersonOption = {
    id: number;
    name: string;
};

type PageProps = {
    items: Ring[];
    summary: {
        drivers: number;
        week_label: string;
        coordinators: string[];
    };
    filters: Filters;
    coordinators: PersonOption[];
    inspectors: PersonOption[];
    sedes: PersonOption[];
    scoped: boolean;
};

const OK = '#22c55e';
const BAJA = '#94a3b8';
const FALTA = '#ef4444';
const PROGRAMAR = '#3b82f6';

const SOURCE: Record<Ring['source'], string> = {
    inspeccion: 'Inspección',
    induccion: 'Inducción',
};

const selectClass =
    'mt-1 h-10 w-full cursor-pointer rounded-lg border border-[#c5d5e6] bg-white px-2 text-xs font-medium text-[#1a2b4c] normal-case disabled:cursor-not-allowed disabled:opacity-60';

export default function DriverBoardPage() {
    const {
        items = [],
        summary,
        filters,
        coordinators,
        inspectors,
        sedes,
        scoped,
    } = usePage<PageProps>().props;

    const visit = (next: Partial<Filters>) => {
        const merged: Filters = { ...filters, ...next };

        router.get(
            '/tablero-conductores',
            {
                date_from: merged.date_from || undefined,
                date_to: merged.date_to || undefined,
                coordinator_id: merged.coordinator_id ?? undefined,
                inspector_id: merged.inspector_id ?? undefined,
                sede: merged.sede ?? undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Tablero conductores" />
            <div className="flex w-full flex-col gap-4 p-4 sm:p-6">
                <div className="border-b-2 border-[#1a2b4c] pb-4">
                    <h1 className="text-lg font-bold tracking-wide text-[#1a2b4c] uppercase sm:text-2xl">
                        Tablero de mando SST conductores
                    </h1>
                    <p className="mt-1 text-xs text-[#5a7390]">
                        {summary.drivers} conductores. {summary.week_label}. Las
                        inspecciones salen de las inspecciones cerradas. Cada
                        inducción es el título de la sesión que ya existe.
                    </p>
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                        <div className="w-full sm:w-auto">
                            <p className="mb-1 text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                                Fecha
                            </p>
                            <DateRangeFilter
                                desde={filters.date_from}
                                hasta={filters.date_to}
                                align="start"
                                onApply={(dateFrom, dateTo) =>
                                    visit({
                                        date_from: dateFrom,
                                        date_to: dateTo,
                                    })
                                }
                                onClear={() =>
                                    visit({ date_from: null, date_to: null })
                                }
                            />
                        </div>
                        <label className="w-full text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase sm:w-56">
                            Inspector
                            <select
                                value={filters.inspector_id ?? ''}
                                onChange={(event) =>
                                    visit({
                                        inspector_id:
                                            event.target.value === ''
                                                ? null
                                                : Number(event.target.value),
                                    })
                                }
                                className={selectClass}
                            >
                                <option value="">Todos</option>
                                {inspectors.map((inspector) => (
                                    <option
                                        key={inspector.id}
                                        value={inspector.id}
                                    >
                                        {inspector.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="w-full text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase sm:w-64">
                            Coordinador
                            <select
                                value={filters.coordinator_id ?? ''}
                                onChange={(event) =>
                                    visit({
                                        coordinator_id:
                                            event.target.value === ''
                                                ? null
                                                : Number(event.target.value),
                                    })
                                }
                                disabled={scoped}
                                className={selectClass}
                            >
                                {scoped ? null : (
                                    <option value="">Todos</option>
                                )}
                                {coordinators.map((coordinator) => (
                                    <option
                                        key={coordinator.id}
                                        value={coordinator.id}
                                    >
                                        {coordinator.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="w-full text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase sm:w-56">
                            Sede
                            <select
                                value={filters.sede ?? ''}
                                onChange={(event) =>
                                    visit({
                                        sede:
                                            event.target.value === ''
                                                ? null
                                                : Number(event.target.value),
                                    })
                                }
                                className={selectClass}
                            >
                                <option value="">Todas</option>
                                {sedes.map((sede) => (
                                    <option key={sede.id} value={sede.id}>
                                        {sede.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                {items.length === 0 ? (
                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-8 text-center text-sm text-[#5a7390] shadow-sm">
                        No hay datos de conductores para este filtro.
                    </section>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {items.map((item) => (
                            <RingCard key={item.key} ring={item} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

function RingCard({ ring }: { ring: Ring }) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const parts =
        ring.mode === 'programar'
            ? [{ key: 'programar', value: ring.programar, color: PROGRAMAR }]
            : [
                  { key: 'ok', value: ring.ok, color: OK },
                  { key: 'baja', value: ring.baja, color: BAJA },
                  { key: 'falta', value: ring.falta, color: FALTA },
              ];
    const visible = parts.filter((part) => part.value > 0);
    let offset = 0;
    const arcs =
        ring.total === 0
            ? []
            : visible.map((part) => {
                  const length = (part.value / ring.total) * circumference;
                  const arc = {
                      ...part,
                      dash: length,
                      gap: circumference - length,
                      offset,
                  };
                  offset += length;

                  return arc;
              });

    return (
        <article className="flex flex-col rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
            <p className="text-center text-[10px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                {SOURCE[ring.source]}
            </p>
            <h2 className="mt-1 line-clamp-2 min-h-10 text-center text-xs font-bold tracking-wide text-[#1a2b4c] uppercase">
                {ring.label}
            </h2>
            <div className="relative mx-auto mt-2 size-32">
                <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke="#e8eef5"
                        strokeWidth="12"
                    />
                    {arcs.map((arc) => (
                        <circle
                            key={arc.key}
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="none"
                            stroke={arc.color}
                            strokeWidth="12"
                            strokeDasharray={`${arc.dash} ${arc.gap}`}
                            strokeDashoffset={-arc.offset}
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-[#1a2b4c]">
                        {ring.total === 0 ? '—' : `${ring.percent}%`}
                    </span>
                </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#e8eef5] pt-3 text-center">
                {ring.mode === 'programar' ? (
                    <Count
                        label="Por programar"
                        value={ring.programar}
                        className="col-span-3 text-[#1d4ed8]"
                    />
                ) : (
                    <>
                        <Count
                            label="OK"
                            value={ring.ok}
                            className="text-[#166534]"
                        />
                        <Count
                            label="Baja"
                            value={ring.baja}
                            className="text-[#64748b]"
                        />
                        <Count
                            label="Falta"
                            value={ring.falta}
                            className="text-[#b91c1c]"
                        />
                    </>
                )}
            </div>
        </article>
    );
}

function Count({
    label,
    value,
    className,
}: {
    label: string;
    value: number;
    className: string;
}) {
    return (
        <div className={className.includes('col-span') ? 'col-span-3' : undefined}>
            <p className="text-[10px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                {label}
            </p>
            <p className={cn('text-lg font-bold', className)}>{value}</p>
        </div>
    );
}

DriverBoardPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Reportes', href: '#' },
        { title: 'Tablero conductores', href: '/tablero-conductores' },
    ],
};
