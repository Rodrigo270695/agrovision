import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import {
    SstDetailDonut,
    SstSummaryStrip,
    SstWeeklyVerticalBars,
    type SstDetailBar,
    type SstDetailSummary,
    type SstSummaryStatusKey,
} from '@/components/sst-board/sst-item-detail-charts';
import {
    SstStatusUnitsModal,
    type SstStatusUnit,
} from '@/components/sst-board/sst-status-units-modal';
import { dashboard } from '@/routes';
import { sstBoardQueryParams, type SstBoardFilters } from '@/lib/sst-board-query';

type PageProps = {
    item: { key: string; label: string };
    summary: SstDetailSummary;
    units_by_status: Record<SstSummaryStatusKey, SstStatusUnit[]>;
    bars: SstDetailBar[];
    source_label: string;
    filters: SstBoardFilters;
    summary_meta: {
        template_label: string;
        week_label: string;
    };
};

function buildQueryString(filters: SstBoardFilters): string {
    return new URLSearchParams(
        Object.entries(sstBoardQueryParams(filters)).flatMap(([key, value]) => {
            if (value === undefined) {
                return [];
            }

            if (Array.isArray(value)) {
                return value.map((entry) => [`${key}[]`, entry]);
            }

            return [[key, String(value)]];
        }) as [string, string][],
    ).toString();
}

export default function SstBoardItemDetailPage() {
    const {
        item,
        summary,
        units_by_status,
        bars,
        source_label,
        filters,
        summary_meta,
    } = usePage<PageProps>().props;
    const [statusOpen, setStatusOpen] = useState<SstSummaryStatusKey | null>(
        null,
    );

    const backHref = `/tablero-sst?${buildQueryString(filters)}`;

    const units = useMemo(
        () => (statusOpen ? (units_by_status?.[statusOpen] ?? []) : []),
        [statusOpen, units_by_status],
    );

    const excelHref = useMemo(() => {
        if (!statusOpen) {
            return null;
        }

        const params = new URLSearchParams(buildQueryString(filters));
        params.set('status', statusOpen);

        return `/tablero-sst/detalle/${encodeURIComponent(item.key)}/excel?${params.toString()}`;
    }, [filters, item.key, statusOpen]);

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

            <div className="flex w-full min-w-0 max-w-none flex-col gap-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-start gap-3 border-b-2 border-brand-700 pb-4">
                    <Link
                        href={backHref}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand-300 bg-white px-3 py-2 text-xs font-semibold text-brand-700 shadow-sm transition hover:bg-background"
                    >
                        <ArrowLeft className="size-4" />
                        Volver al tablero
                    </Link>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                            {summary_meta.template_label} ·{' '}
                            {summary_meta.week_label}
                        </p>
                        <h1 className="mt-1 text-xl font-bold text-brand-700 underline decoration-brand-700/30 underline-offset-4 sm:text-3xl">
                            {item.label}
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            A continuación se detallan los porcentajes de las
                            unidades móviles que cumplen este requisito. Cada
                            semana agrupa la planilla cargada en esa fecha
                            (placas únicas, sin repetir).
                        </p>
                        <p className="mt-2 text-sm font-semibold text-brand-700">
                            Unidades en el rango ({summary_meta.week_label}):{' '}
                            <span className="text-lg tabular-nums">
                                {summary.total}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
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
                    <p className="max-w-xl text-xs text-muted-foreground">
                        Solo se listan semanas con unidades en el rango
                        (planilla o inspección).
                    </p>
                </div>

                <section className="w-full min-w-0 rounded-2xl border border-brand-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-6">
                    <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Resumen del rango seleccionado
                    </p>
                    <SstSummaryStrip
                        summary={summary}
                        onSelect={setStatusOpen}
                    />
                </section>

                <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
                    <section className="min-w-0 overflow-hidden rounded-2xl border border-brand-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-6">
                        <h2 className="text-sm font-semibold text-brand-700">
                            % OK por semana
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Barras verdes: cumplimiento del ítem en la carga de
                            esa semana
                        </p>
                        <div className="mt-4">
                            <SstWeeklyVerticalBars bars={bars} />
                        </div>
                    </section>

                    <section className="min-w-0 rounded-2xl border border-brand-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-6">
                        <SstDetailDonut
                            title={item.label}
                            summary={summary}
                            onSelect={setStatusOpen}
                        />
                        <p className="mt-4 text-center text-[10px] text-muted-foreground">
                            Fuente: {source_label}
                        </p>
                    </section>
                </div>
            </div>

            <SstStatusUnitsModal
                open={statusOpen !== null}
                status={statusOpen}
                itemLabel={item.label}
                units={units}
                excelHref={excelHref}
                onClose={() => setStatusOpen(null)}
            />
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
