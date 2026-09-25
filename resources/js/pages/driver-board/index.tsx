import { Head, router, usePage } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type Ring = {
    key: string;
    label: string;
    mode: 'status' | 'programar';
    ok: number;
    baja: number;
    falta: number;
    programar: number;
    total: number;
    percent: number;
};

type Section = {
    key: string;
    title: string;
    items: Ring[];
};

type Filters = {
    week: string;
    coordinator_id: number | null;
    sede: string | null;
};

type WeekOption = {
    value: string;
    label: string;
};

type CoordinatorOption = {
    id: number;
    name: string;
};

type PageProps = {
    sections: Section[];
    summary: {
        drivers: number;
        week_label: string;
        week_number: number | null;
        coordinators: string[];
        sede: string | null;
    };
    filters: Filters;
    weeks: WeekOption[];
    coordinators: CoordinatorOption[];
    sedes: string[];
    scoped: boolean;
};

const OK = '#22c55e';
const BAJA = '#94a3b8';
const FALTA = '#ef4444';
const PROGRAMAR = '#3b82f6';

export default function DriverBoardPage() {
    const {
        sections,
        summary,
        filters,
        weeks,
        coordinators,
        sedes,
        scoped,
    } = usePage<PageProps>().props;

    const visit = (next: Partial<Filters>) => {
        const merged: Filters = { ...filters, ...next };

        router.get(
            '/tablero-conductores',
            {
                week: merged.week,
                coordinator_id: merged.coordinator_id ?? undefined,
                sede: merged.sede ?? undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Tablero conductores" />
            <div className="mx-auto flex w-full max-w-350 flex-col gap-4">
                <div className="border-b-2 border-[#1a2b4c] pb-3">
                    <h1 className="text-lg font-bold tracking-wide text-[#1a2b4c] uppercase sm:text-2xl">
                        Tablero de mando SST conductores
                    </h1>
                    <p className="mt-1 text-xs text-[#5a7390]">
                        La licencia sale del documento de la unidad. Las
                        capacitaciones salen del título o temario de la
                        inducción. Si en la semana no hay sesión, el anillo
                        queda por programar.
                    </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
                    <aside className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                            Conductores
                        </p>
                        <p className="font-display text-4xl font-semibold text-[#1a2b4c]">
                            {summary.drivers}
                        </p>
                        <p className="mt-1 text-xs text-[#5a7390]">
                            {summary.week_label}
                        </p>

                        <label className="mt-4 block text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                            Semana
                            <select
                                value={filters.week}
                                onChange={(event) =>
                                    visit({ week: event.target.value })
                                }
                                className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-[#c5d5e6] bg-white px-2 text-xs font-medium text-[#1a2b4c] normal-case"
                            >
                                {weeks.map((week) => (
                                    <option key={week.value} value={week.value}>
                                        {week.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="mt-4">
                            <p className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                                Coordinador
                            </p>
                            <div className="mt-2 flex flex-col gap-1">
                                {scoped ? null : (
                                    <FilterButton
                                        active={filters.coordinator_id === null}
                                        onClick={() =>
                                            visit({ coordinator_id: null })
                                        }
                                        label="Todos"
                                    />
                                )}
                                {coordinators.map((coordinator) => (
                                    <FilterButton
                                        key={coordinator.id}
                                        active={
                                            filters.coordinator_id ===
                                            coordinator.id
                                        }
                                        onClick={() =>
                                            visit({
                                                coordinator_id: coordinator.id,
                                            })
                                        }
                                        label={coordinator.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mt-4">
                            <p className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                                Sede
                            </p>
                            <div className="mt-2 flex flex-col gap-1">
                                <FilterButton
                                    active={filters.sede === null}
                                    onClick={() => visit({ sede: null })}
                                    label="Todas"
                                />
                                {sedes.length === 0 ? (
                                    <p className="px-2 text-xs text-[#6b8ead]">
                                        Sin sedes en inducciones.
                                    </p>
                                ) : (
                                    sedes.map((sede) => (
                                        <FilterButton
                                            key={sede}
                                            active={filters.sede === sede}
                                            onClick={() => visit({ sede })}
                                            label={sede}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        <p className="mt-4 text-[11px] text-[#6b8ead]">
                            Estatus: periodo activo. La sede filtra las
                            capacitaciones.
                        </p>
                    </aside>

                    <div className="grid gap-4 lg:grid-cols-3">
                        {sections.map((section) => (
                            <section
                                key={section.key}
                                className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm"
                            >
                                <h2 className="border-b border-[#1a2b4c] pb-1 text-center text-[11px] font-bold tracking-wide text-[#1a2b4c] uppercase">
                                    {section.title}
                                </h2>
                                <div className="mt-4 flex flex-col gap-6">
                                    {section.items.map((item) => (
                                        <RingCard key={item.key} ring={item} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

function FilterButton({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'cursor-pointer rounded-md px-2 py-1.5 text-left text-xs font-medium',
                active
                    ? 'bg-[#1a2b4c] text-white'
                    : 'text-[#1a2b4c] hover:bg-[#eef3f8]',
            )}
        >
            {label}
        </button>
    );
}

function RingCard({ ring }: { ring: Ring }) {
    const radius = 46;
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
        <div className="flex flex-col items-center">
            <p className="mb-2 text-center text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                {ring.label}
            </p>
            <div className="relative size-36">
                <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke="#e8eef5"
                        strokeWidth="14"
                    />
                    {arcs.map((arc) => (
                        <circle
                            key={arc.key}
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="none"
                            stroke={arc.color}
                            strokeWidth="14"
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
            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-[#5a7390]">
                {ring.mode === 'programar' ? (
                    <Legend
                        color={PROGRAMAR}
                        label="Por programar"
                        value={ring.programar}
                    />
                ) : (
                    <>
                        <Legend color={OK} label="OK" value={ring.ok} />
                        <Legend color={BAJA} label="Baja" value={ring.baja} />
                        <Legend
                            color={FALTA}
                            label="Falta"
                            value={ring.falta}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

function Legend({
    color,
    label,
    value,
}: {
    color: string;
    label: string;
    value: number;
}) {
    return (
        <span className="inline-flex items-center gap-1">
            <span
                className="size-2 rounded-full"
                style={{ backgroundColor: color }}
            />
            {label} {value}
        </span>
    );
}

DriverBoardPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Plataforma', href: '#' },
        { title: 'Tablero conductores', href: '/tablero-conductores' },
    ],
};
