import { Head, router, usePage } from '@inertiajs/react';
import { Radio, ShieldCheck } from 'lucide-react';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import {
    SstDetailDonut,
    SstSummaryStrip,
    SstWeeklyVerticalBars,
    type SstDetailBar,
    type SstDetailSummary,
} from '@/components/sst-board/sst-item-detail-charts';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

type FleetTab = 'rc' | 'gps';

type FleetFilters = {
    tab: FleetTab;
    date_from: string | null;
    date_to: string | null;
};

type PageProps = {
    tab: FleetTab;
    title: string;
    summary: SstDetailSummary;
    bars: SstDetailBar[];
    source_label: string;
    filters: FleetFilters;
    range_label: string;
};

function queryParams(filters: FleetFilters): Record<string, string> {
    const params: Record<string, string> = { tab: filters.tab };

    if (filters.date_from) {
        params.date_from = filters.date_from;
    }

    if (filters.date_to) {
        params.date_to = filters.date_to;
    }

    return params;
}

export default function FleetComplianceReportPage() {
    const { tab, title, summary, bars, source_label, filters, range_label } =
        usePage<PageProps>().props;

    const visit = (patch: Partial<FleetFilters>) => {
        router.get(
            '/reporte-flota',
            queryParams({ ...filters, ...patch }),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const tabs: { id: FleetTab; label: string; icon: typeof ShieldCheck }[] = [
        { id: 'rc', label: 'Seguro RC', icon: ShieldCheck },
        { id: 'gps', label: 'GPS', icon: Radio },
    ];

    return (
        <>
            <Head title={`${title} — Reporte flota`} />

            <div className="flex w-full min-w-0 max-w-none flex-col gap-6 p-4 sm:p-6">
                <div className="border-b-2 border-[#1a2b4c] pb-4">
                    <p className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                        Reporte flota · {range_label}
                    </p>
                    <h1
                        className="mt-1 text-xl font-bold text-[#1a2b4c] underline decoration-[#1a2b4c]/30 underline-offset-4 sm:text-3xl"
                    >
                        Cumplimiento Seguro RC y GPS
                    </h1>
                    <p className="mt-2 text-sm text-[#5a7390]">
                        Porcentaje de unidades con seguro RC vigente o GPS
                        instalado, agrupado por semana según la fecha de carga
                        del archivo (placas únicas por semana).
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#1a2b4c]">
                        Unidades en el rango ({range_label}):{' '}
                        <span className="text-lg tabular-nums">
                            {summary.total}
                        </span>
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {tabs.map((entry) => {
                            const Icon = entry.icon;
                            const active = tab === entry.id;

                            return (
                                <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => visit({ tab: entry.id })}
                                    className={cn(
                                        'inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold shadow-sm transition',
                                        active
                                            ? 'border-[#1a2b4c] bg-[#1a2b4c] text-white'
                                            : 'border-[#c5d5e6] bg-white text-[#1a2b4c] hover:bg-[#f8fafc]',
                                    )}
                                >
                                    <Icon className="size-4" />
                                    {entry.label}
                                </button>
                            );
                        })}
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
                    <p className="max-w-xl text-xs text-[#5a7390]">
                        Solo se listan semanas con unidades en el rango (carga
                        de archivo o periodo en fechas).
                    </p>
                </div>

                <section className="w-full min-w-0 rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-6">
                    <p className="mb-3 text-xs font-semibold tracking-wide text-[#6b8ead] uppercase">
                        Resumen del rango seleccionado — {title}
                    </p>
                    <SstSummaryStrip summary={summary} />
                </section>

                <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
                    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-6">
                        <h2 className="text-sm font-semibold text-[#1a2b4c]">
                            % OK por semana
                        </h2>
                        <p className="mt-0.5 text-xs text-[#6b8ead]">
                            Barras verdes: cumplimiento en la carga de esa
                            semana ({title})
                        </p>
                        <div className="mt-4">
                            <SstWeeklyVerticalBars bars={bars} />
                        </div>
                    </section>

                    <section className="min-w-0 rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-6">
                        <SstDetailDonut title={title} summary={summary} />
                        <p className="mt-4 text-center text-[10px] text-[#6b8ead]">
                            Fuente: {source_label}
                        </p>
                    </section>
                </div>
            </div>
        </>
    );
}

FleetComplianceReportPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Reportes', href: '#' },
        { title: 'Seguro RC / GPS', href: '#' },
    ],
};
