import { Head, router, usePage } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type FleetRow = {
    type: string;
    count: number;
    delta: number | null;
};

type ExceptionRow = {
    number: number;
    status: 'ok' | 'baja' | 'pendiente';
    service_type: string;
    plate: string;
    coordinator: string;
    responsible: string;
    service_date: string;
    vehicle_type: string;
    inspection: 'OK' | 'NOK';
    observations: string;
};

type Summary = {
    total: number;
    ok: number;
    baja: number;
    pendiente: number;
    percent: number;
    week_label: string;
    previous_period: string | null;
};

type Filters = {
    week: string;
    coordinator_id: number | null;
};

type PageProps = {
    fleet: FleetRow[];
    summary: Summary;
    full_coverage: string[];
    exceptions: ExceptionRow[];
    filters: Filters;
    weeks: { value: string; label: string }[];
    coordinators: { id: number; name: string }[];
    scoped: boolean;
};

const OK = '#22c55e';
const BAJA = '#94a3b8';
const PENDIENTE = '#f59e0b';

export default function SecurityReportPage() {
    const { fleet, summary, full_coverage, exceptions, filters, weeks, coordinators, scoped } =
        usePage<PageProps>().props;

    const visit = (next: Partial<Filters>) => {
        const merged: Filters = { ...filters, ...next };

        router.get(
            '/reporte-sst',
            {
                week: merged.week,
                coordinator_id: merged.coordinator_id ?? undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Reporte SST" />
            <div className="mx-auto flex w-full max-w-350 flex-col gap-4">
                <div className="flex flex-col gap-3 border-b-2 border-[#1a2b4c] pb-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-lg font-bold tracking-wide text-[#1a2b4c] uppercase sm:text-2xl">
                            Inspecciones de seguridad
                        </h1>
                        <p className="mt-1 text-xs text-[#5a7390]">
                            Unidades del periodo activo. {summary.week_label}.
                            {summary.previous_period
                                ? ` La variación es frente a ${summary.previous_period}.`
                                : ''}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <label className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                            Semana
                            <select
                                value={filters.week}
                                onChange={(event) =>
                                    visit({ week: event.target.value })
                                }
                                className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-[#c5d5e6] bg-white px-2 text-xs font-medium text-[#1a2b4c] normal-case sm:w-64"
                            >
                                {weeks.map((week) => (
                                    <option key={week.value} value={week.value}>
                                        {week.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
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
                                className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-[#c5d5e6] bg-white px-2 text-xs font-medium text-[#1a2b4c] normal-case sm:w-64"
                            >
                                {scoped ? null : <option value="">Todos</option>}
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
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                        <h2 className="text-base font-bold tracking-wide text-[#1a2b4c] uppercase underline decoration-2 underline-offset-4">
                            Unidades móviles activas
                        </h2>
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-72 text-sm">
                                <thead>
                                    <tr className="bg-[#e8eef8] text-left text-[11px] font-bold tracking-wide text-[#1a2b4c] uppercase">
                                        <th className="px-3 py-2">Tipo de unidad</th>
                                        <th className="px-3 py-2">Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fleet.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={2}
                                                className="px-3 py-6 text-center text-xs text-[#6b8ead]"
                                            >
                                                No hay unidades en el periodo
                                                activo.
                                            </td>
                                        </tr>
                                    ) : (
                                        fleet.map((row) => (
                                            <tr
                                                key={row.type}
                                                className="border-b border-[#e8eef5]"
                                            >
                                                <td className="px-3 py-2 font-medium text-[#1a2b4c]">
                                                    {row.type}
                                                </td>
                                                <td className="px-3 py-2 text-[#1a2b4c]">
                                                    {row.count}
                                                    {row.delta === null
                                                        ? ''
                                                        : ` (${formatDelta(row.delta)})`}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[#1a2b4c]">
                                Total de unidades para transporte de personal
                            </p>
                            <span className="inline-flex min-w-14 items-center justify-center rounded-md bg-[#1a2b4c] px-3 py-2 text-lg font-bold text-white">
                                {summary.total}
                            </span>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                        <h2 className="text-base font-bold tracking-wide text-[#1a2b4c] uppercase underline decoration-2 underline-offset-4">
                            Avance de inspecciones
                        </h2>
                        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                            <table className="w-full text-center text-sm">
                                <thead>
                                    <tr className="text-[11px] font-bold text-white uppercase">
                                        <th className="bg-[#e8eef8] px-2 py-2 text-[#1a2b4c]" />
                                        <th className="bg-[#f59e0b] px-2 py-2">
                                            Pendientes
                                        </th>
                                        <th className="bg-[#94a3b8] px-2 py-2">
                                            Baja
                                        </th>
                                        <th className="bg-[#22c55e] px-2 py-2">
                                            OK
                                        </th>
                                        <th className="bg-[#e8eef8] px-2 py-2 text-[#1a2b4c]">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-[#e8eef5] font-semibold text-[#1a2b4c]">
                                        <td className="px-2 py-2 text-left">
                                            Total
                                        </td>
                                        <td className="px-2 py-2">
                                            {summary.pendiente}
                                        </td>
                                        <td className="px-2 py-2">
                                            {summary.baja}
                                        </td>
                                        <td className="px-2 py-2">{summary.ok}</td>
                                        <td className="px-2 py-2">
                                            {summary.total}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <Donut summary={summary} />
                        </div>
                        <div className="mt-4 text-xs text-[#1a2b4c]">
                            {full_coverage.length === 0 ? (
                                <p>
                                    Ningún requisito está al 100% en todas las
                                    unidades del filtro.
                                </p>
                            ) : (
                                <>
                                    <p className="font-semibold">
                                        Se inspeccionó al 100% en:
                                    </p>
                                    <ol className="mt-1 list-decimal pl-5">
                                        {full_coverage.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ol>
                                </>
                            )}
                        </div>
                    </section>
                </div>

                <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                    <h2 className="text-base font-bold tracking-wide text-[#1a2b4c] uppercase">
                        Unidades que no están OK
                    </h2>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[860px] border-collapse text-left text-xs">
                            <thead>
                                <tr className="bg-[#1a2b4c] text-[11px] font-bold tracking-wide text-white uppercase">
                                    <th className="px-2 py-2">N°</th>
                                    <th className="px-2 py-2">Tipo de servicio</th>
                                    <th className="px-2 py-2">Placa</th>
                                    <th className="px-2 py-2">Coordinador</th>
                                    <th className="px-2 py-2">Responsable</th>
                                    <th className="px-2 py-2">Fecha de ingreso</th>
                                    <th className="px-2 py-2">Tipo de vehículo</th>
                                    <th className="px-2 py-2">Insp. seg.</th>
                                    <th className="px-2 py-2">Observaciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exceptions.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-3 py-8 text-center text-sm text-[#5a7390]"
                                        >
                                            Todas las unidades del filtro están
                                            OK.
                                        </td>
                                    </tr>
                                ) : (
                                    exceptions.map((row) => (
                                        <tr
                                            key={`${row.plate}-${row.number}`}
                                            className="border-b border-[#e8eef5] text-[#1a2b4c]"
                                        >
                                            <td className="px-2 py-2">
                                                {row.number}
                                            </td>
                                            <td className="px-2 py-2">
                                                {row.service_type}
                                            </td>
                                            <td
                                                className={cn(
                                                    'px-2 py-2 font-semibold',
                                                    row.status === 'baja' &&
                                                        'bg-[#fde68a]',
                                                )}
                                            >
                                                {row.plate}
                                                {row.status === 'baja'
                                                    ? ' (*)'
                                                    : ''}
                                            </td>
                                            <td className="px-2 py-2">
                                                {row.coordinator}
                                            </td>
                                            <td className="px-2 py-2">
                                                {row.responsible}
                                            </td>
                                            <td className="px-2 py-2">
                                                {row.service_date}
                                            </td>
                                            <td className="px-2 py-2">
                                                {row.vehicle_type}
                                            </td>
                                            <td className="px-2 py-2">
                                                <span
                                                    className={cn(
                                                        'inline-flex min-w-10 justify-center px-2 py-1 font-bold text-white',
                                                        row.inspection === 'OK'
                                                            ? 'bg-[#22c55e]'
                                                            : 'bg-[#ef4444]',
                                                    )}
                                                >
                                                    {row.inspection}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                {row.observations}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 inline-block bg-[#fde68a] px-2 py-1 text-xs font-semibold text-[#1a2b4c]">
                        (*) Unidad de baja. Sale así cuando la observación de
                        la inspección dice baja.
                    </p>
                </section>
            </div>
        </>
    );
}

function formatDelta(delta: number): string {
    if (delta > 0) {
        return `+${delta}`;
    }

    return String(delta);
}

function Donut({ summary }: { summary: Summary }) {
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    const parts = [
        { key: 'ok', value: summary.ok, color: OK },
        { key: 'baja', value: summary.baja, color: BAJA },
        { key: 'pendiente', value: summary.pendiente, color: PENDIENTE },
    ].filter((part) => part.value > 0);

    let offset = 0;
    const arcs =
        summary.total === 0
            ? []
            : parts.map((part) => {
                  const length = (part.value / summary.total) * circumference;
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
        <div className="flex shrink-0 flex-col items-center">
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
                        {summary.total === 0 ? '—' : `${summary.percent}%`}
                    </span>
                </div>
            </div>
            <p className="mt-1 text-[11px] text-[#5a7390]">OK del total</p>
        </div>
    );
}

SecurityReportPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Plataforma', href: '#' },
        { title: 'Reporte SST', href: '/reporte-sst' },
    ],
};
