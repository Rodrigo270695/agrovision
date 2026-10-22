import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import {
    SstDetailDonut,
    SstSummaryStrip,
    SstWeeklyVerticalBars,
    type SstDetailBar,
    type SstDetailSummary,
} from '@/components/sst-board/sst-item-detail-charts';
import { dashboard } from '@/routes';
import { sstBoardQueryParams, type SstBoardFilters } from '@/lib/sst-board-query';

type PageProps = {
    item: { key: string; label: string };
    summary: SstDetailSummary;
    bars: SstDetailBar[];
    source_label: string;
    filters: SstBoardFilters;
    summary_meta: {
        template_label: string;
        week_label: string;
    };
};

export default function SstBoardItemDetailPage() {
    const { item, summary, bars, source_label, filters, summary_meta } =
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

    const visit = (next: Partial<SstBoardFilters>) => {
        router.get(
            `/tablero-sst/detalle/${encodeURIComponent(item.key)}`,
            sstBoardQueryParams({ ...filters, ...next }),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <>
            <Head title={`${item.label} — Tablero SST`} />

            <div className="flex w-full flex-col gap-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-start gap-3 border-b-2 border-[#1a2b4c] pb-4">
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
                            className="mt-1 text-xl font-bold text-[#1a2b4c] underline decoration-[#1a2b4c]/30 underline-offset-4 sm:text-3xl"
                        >
                            {item.label}
                        </h1>
                        <p className="mt-2 text-sm text-[#5a7390]">
                            A continuación se detallan los porcentajes de las
                            unidades móviles que cumplen este requisito. Cada
                            semana agrupa la planilla cargada en esa fecha
                            (placas únicas, sin repetir).
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#1a2b4c]">
                            Total de unidades:{' '}
                            <span className="text-lg tabular-nums">
                                {summary.total}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <p className="mb-1 text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                            Rango de fechas
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
                    <p className="text-xs text-[#5a7390]">
                        Las barras muestran cada semana del rango; una unidad
                        cuenta en la semana de su planilla o de su inspección.
                    </p>
                </div>

                <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-6">
                    <SstSummaryStrip summary={summary} />
                </section>

                <div className="grid gap-4 lg:grid-cols-[1fr_minmax(16rem,22rem)]">
                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-6">
                        <h2 className="text-sm font-semibold text-[#1a2b4c]">
                            % OK por semana
                        </h2>
                        <p className="mt-0.5 text-xs text-[#6b8ead]">
                            Barras verdes: cumplimiento del ítem en la carga de
                            esa semana
                        </p>
                        <div className="mt-4">
                            <SstWeeklyVerticalBars bars={bars} />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-6">
                        <SstDetailDonut title={item.label} summary={summary} />
                        <p className="mt-4 text-center text-[10px] text-[#6b8ead]">
                            Fuente: {source_label}
                        </p>
                    </section>
                </div>
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
