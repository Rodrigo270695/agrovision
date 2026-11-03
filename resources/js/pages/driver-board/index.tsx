import { Head, router, usePage } from '@inertiajs/react';
import {
    PlatformHero,
    PlatformPageShell,
    PlatformToolbar,
} from '@/components/platform';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

type Metric = {
    key: string;
    label: string;
    value: number;
    tone: 'ok' | 'bad' | 'muted' | 'info';
};

type Ring = {
    key: string;
    label: string;
    activity: string;
    detail: string;
    percent: number;
    metrics: Metric[];
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
        baja: number;
        week_label: string;
        coordinators: string[];
    };
    filters: Filters;
    coordinators: PersonOption[];
    inspectors: PersonOption[];
    sedes: PersonOption[];
    scoped: boolean;
};

const TONE = {
    ok: { bar: '#22c55e', text: 'text-[#166534]' },
    bad: { bar: '#ef4444', text: 'text-[#b91c1c]' },
    muted: { bar: '#94a3b8', text: 'text-[#64748b]' },
    info: { bar: '#0f1f3a', text: 'text-brand-700' },
};

const CHART_KEYS = new Set(['tienen', 'faltan']);

const selectClass =
    'mt-1 h-10 w-full cursor-pointer rounded-lg border border-brand-300 bg-white px-2 text-xs font-medium text-brand-700 normal-case disabled:cursor-not-allowed disabled:opacity-60';

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
                ...(!merged.date_from && !merged.date_to
                    ? { all_dates: 1 }
                    : {}),
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
            <PlatformPageShell>
                <PlatformHero
                    eyebrow="Reportes · Conductores"
                    title="Tablero de mando SST conductores"
                    description={
                        <>
                            Cada tarjeta es un tema de inducción. El anillo es
                            cuántos activos ya la tienen. {summary.week_label}.
                        </>
                    }
                    stats={[
                        { label: 'Activos', value: summary.drivers, tone: 'navy' },
                        { label: 'De baja', value: summary.baja, tone: 'rose' },
                        { label: 'Temas', value: items.length, tone: 'sky' },
                    ]}
                />

                <PlatformToolbar>
                    <div className="w-full sm:w-auto">
                        <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
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
                    <label className="w-full text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:w-56">
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
                    <label className="w-full text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:w-64">
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
                    <label className="w-full text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:w-56">
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
                    <a
                        href={excelHref(filters)}
                        className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-brand-700 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                    >
                        Descargar Excel
                    </a>
                </PlatformToolbar>

                {items.length === 0 ? (
                    <section className="rounded-2xl border border-brand-200 bg-white p-8 text-center text-sm text-muted-foreground shadow-sm">
                        No hay inducciones para este filtro.
                    </section>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {items.map((item) => (
                            <RingCard key={item.key} ring={item} />
                        ))}
                    </div>
                )}
            </PlatformPageShell>
        </>
    );
}

function excelHref(filters: Filters): string {
    const params = new URLSearchParams();

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    if (filters.coordinator_id) {
        params.set('coordinator_id', String(filters.coordinator_id));
    }

    if (filters.inspector_id) {
        params.set('inspector_id', String(filters.inspector_id));
    }

    if (filters.sede) {
        params.set('sede', String(filters.sede));
    }

    params.set('export', 'excel');

    return `/tablero-conductores?${params.toString()}`;
}

function RingCard({ ring }: { ring: Ring }) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const chartTotal = ring.metrics
        .filter((metric) => CHART_KEYS.has(metric.key))
        .reduce((sum, metric) => sum + metric.value, 0);
    const parts = ring.metrics.filter(
        (metric) => CHART_KEYS.has(metric.key) && metric.value > 0,
    );
    let offset = 0;
    const arcs =
        chartTotal === 0
            ? []
            : parts.map((part) => {
                  const length = (part.value / chartTotal) * circumference;
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
        <article className="flex flex-col rounded-2xl border border-brand-200 bg-white p-4 shadow-sm">
            <p className="text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {ring.activity}
            </p>
            <h2 className="mt-1 line-clamp-2 min-h-10 text-center text-xs font-bold tracking-wide text-brand-700 uppercase">
                {ring.label}
            </h2>
            <p className="mt-1 text-center text-[11px] text-muted-foreground">
                {ring.detail}
            </p>
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
                            stroke={TONE[arc.tone].bar}
                            strokeWidth="12"
                            strokeDasharray={`${arc.dash} ${arc.gap}`}
                            strokeDashoffset={-arc.offset}
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-brand-700">
                        {chartTotal === 0 ? '—' : `${ring.percent}%`}
                    </span>
                </div>
            </div>
            <div
                className={cn(
                    'mt-3 grid gap-2 border-t border-[#e8eef5] pt-3 text-center',
                    ring.metrics.length > 3 ? 'grid-cols-2' : 'grid-cols-3',
                )}
            >
                {ring.metrics.map((metric) => (
                        <Count
                            key={metric.key}
                            label={metric.label}
                            value={metric.value}
                            className={TONE[metric.tone].text}
                        />
                    ))}
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
        <div>
            <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
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
