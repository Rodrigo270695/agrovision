import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { DashboardBarChart } from '@/components/dashboard/bar-chart';
import { DashboardDonutChart } from '@/components/dashboard/donut-chart';
import type { ChartPoint } from '@/components/dashboard/types';
import { dashboard } from '@/routes';
import { sstBoardQueryParams, type SstBoardFilters } from '@/lib/sst-board-query';
const OK = '#22c55e';
const PENDIENTE = '#eab308';
const BAJA = '#94a3b8';
const FALTA = '#ef4444';

type WeekRow = {
    period_id: number;
    label: string;
    date: string | null;
    ok: number;
    falta: number;
    baja: number;
    pendiente: number;
    total: number;
    percent_ok: number;
};

type PageProps = {
    item: { key: string; label: string };
    summary: {
        ok: number;
        falta: number;
        baja: number;
        pendiente: number;
        total: number;
        percent: number;
    };
    weeks: WeekRow[];
    source_label: string;
    filters: SstBoardFilters;
    summary_meta: {
        template_label: string;
        week_label: string;
    };
};

export default function SstBoardItemDetailPage() {
    const { item, summary, weeks, source_label, filters, summary_meta } =
        usePage<PageProps>().props;

    const backHref = `/tablero-sst?${new URLSearchParams(
        Object.entries(sstBoardQueryParams(filters)).flatMap(([key, value]) => {
            if (value === undefined) {
                return [];
            }

            if (Array.isArray(value)) {
                return value.map((entry) => [`${key}[]`, entry]);
            }

            return [[key, String(value)]];
        }) as [string, string][],
    ).toString()}`;

    const barData: ChartPoint[] = useMemo(
        () =>
            weeks.map((week) => ({
                label: week.label,
                value: week.percent_ok,
                color:
                    week.percent_ok >= 95
                        ? OK
                        : week.percent_ok >= 85
                          ? '#2e5a9e'
                          : PENDIENTE,
            })),
        [weeks],
    );

    const donutData: ChartPoint[] = useMemo(
        () =>
            [
                { label: 'OK', value: summary.ok, color: OK },
                {
                    label: 'Pendiente',
                    value: summary.pendiente,
                    color: PENDIENTE,
                },
                { label: 'Baja', value: summary.baja, color: BAJA },
                { label: 'Falta', value: summary.falta, color: FALTA },
            ].filter((row) => row.value > 0),
        [summary],
    );

    return (
        <>
            <Head title={`${item.label} — Tablero SST`} />

            <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href={backHref}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#c5d5e6] bg-white px-3 py-2 text-xs font-semibold text-[#1a2b4c] shadow-sm transition hover:bg-[#f8fafc]"
                    >
                        <ArrowLeft className="size-4" />
                        Volver al tablero
                    </Link>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                            {summary_meta.template_label} ·{' '}
                            {summary_meta.week_label}
                        </p>
                        <h1
                            className="mt-1 text-xl font-bold text-[#1a2b4c] underline decoration-[#1a2b4c]/25 underline-offset-4 sm:text-2xl"
                        >
                            {item.label}
                        </h1>
                        <p className="mt-2 max-w-3xl text-sm text-[#5a7390]">
                            Porcentaje de unidades de cada carga semanal que
                            cumplen este requisito. Cada semana cuenta placas
                            únicas de la planilla, sin repetir.
                        </p>
                    </div>
                </div>

                <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-6">
                    <p className="text-sm font-semibold text-[#1a2b4c]">
                        Total de unidades (suma por semanas en el rango):{' '}
                        <span className="text-lg tabular-nums">
                            {summary.total}
                        </span>
                    </p>

                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[32rem] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-[#d7e3f0] text-left text-[11px] font-bold tracking-wide text-[#6b8ead] uppercase">
                                    <th className="py-2 pr-4"> </th>
                                    <th className="px-3 py-2 text-center text-[#ca8a04]">
                                        Pendiente
                                    </th>
                                    <th className="px-3 py-2 text-center text-[#64748b]">
                                        Baja
                                    </th>
                                    <th className="px-3 py-2 text-center text-[#166534]">
                                        OK
                                    </th>
                                    <th className="px-3 py-2 text-center text-[#b91c1c]">
                                        Falta
                                    </th>
                                    <th className="px-3 py-2 text-center text-[#1a2b4c]">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-[#e8eef5] font-semibold text-[#1a2b4c]">
                                    <td className="py-3 pr-4">Total general</td>
                                    <td className="px-3 py-3 text-center tabular-nums text-[#ca8a04]">
                                        {summary.pendiente}
                                    </td>
                                    <td className="px-3 py-3 text-center tabular-nums text-[#64748b]">
                                        {summary.baja}
                                    </td>
                                    <td className="px-3 py-3 text-center tabular-nums text-[#166534]">
                                        {summary.ok}
                                    </td>
                                    <td className="px-3 py-3 text-center tabular-nums text-[#b91c1c]">
                                        {summary.falta}
                                    </td>
                                    <td className="px-3 py-3 text-center tabular-nums">
                                        {summary.total}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {weeks.length > 0 ? (
                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full min-w-[40rem] border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-[#d7e3f0] text-[10px] font-bold tracking-wide text-[#6b8ead] uppercase">
                                        <th className="py-2 pr-3 text-left">
                                            Semana / periodo
                                        </th>
                                        <th className="px-2 py-2 text-center">
                                            Unidades
                                        </th>
                                        <th className="px-2 py-2 text-center">
                                            % OK
                                        </th>
                                        <th className="px-2 py-2 text-center">
                                            Pend.
                                        </th>
                                        <th className="px-2 py-2 text-center">
                                            Baja
                                        </th>
                                        <th className="px-2 py-2 text-center">
                                            OK
                                        </th>
                                        <th className="px-2 py-2 text-center">
                                            Falta
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeks.map((week) => (
                                        <tr
                                            key={week.period_id}
                                            className="border-b border-[#f1f5f9] text-[#1a2b4c]"
                                        >
                                            <td className="py-2 pr-3 font-medium">
                                                {week.label}
                                            </td>
                                            <td className="px-2 py-2 text-center tabular-nums">
                                                {week.total}
                                            </td>
                                            <td className="px-2 py-2 text-center tabular-nums font-semibold">
                                                {week.percent_ok}%
                                            </td>
                                            <td className="px-2 py-2 text-center tabular-nums text-[#ca8a04]">
                                                {week.pendiente}
                                            </td>
                                            <td className="px-2 py-2 text-center tabular-nums text-[#64748b]">
                                                {week.baja}
                                            </td>
                                            <td className="px-2 py-2 text-center tabular-nums text-[#166534]">
                                                {week.ok}
                                            </td>
                                            <td className="px-2 py-2 text-center tabular-nums text-[#b91c1c]">
                                                {week.falta}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-[#5a7390]">
                            No hay periodos con unidades en el rango de fechas
                            seleccionado.
                        </p>
                    )}
                </section>

                <div className="grid gap-4 lg:grid-cols-3">
                    <DashboardBarChart
                        className="lg:col-span-2"
                        title="% OK por semana"
                        subtitle="Meta visual: barras más altas = más unidades cumplen el ítem"
                        data={barData}
                    />
                    <DashboardDonutChart
                        title={item.label}
                        subtitle={`${summary.percent}% OK en el rango`}
                        data={donutData}
                    />
                </div>

                <p className="text-center text-[11px] text-[#6b8ead]">
                    Fuente: {source_label}
                </p>
            </div>
        </>
    );
}

SstBoardItemDetailPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Reportes', href: '#' },
        { title: 'Tablero SST', href: '/tablero-sst' },
        { title: 'Detalle ítem', href: '#' },
    ],
};
