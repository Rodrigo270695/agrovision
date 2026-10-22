import { Head, router, usePage } from '@inertiajs/react';
import {
    ProviderUnitBars,
    type ProviderUnitBar,
} from '@/components/reports/provider-unit-bars';
import {
    WeekSlicer,
    type WeekPoint,
} from '@/components/reports/week-slicer';
import {
    SstWeeklyVerticalBars,
    type SstDetailBar,
} from '@/components/sst-board/sst-item-detail-charts';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import { dashboard } from '@/routes';

type TemplateOption = { value: string; label: string };

type Filters = {
    date_from: string | null;
    date_to: string | null;
    week: number | null;
    week_year: number | null;
    template: string;
};

type PageProps = {
    week_label: string;
    range_label: string;
    units: ProviderUnitBar[];
    weekly_bars: SstDetailBar[];
    available_weeks: WeekPoint[];
    template_label: string;
    templates: TemplateOption[];
    filters: Filters;
};

function visit(filters: Filters) {
    const params: Record<string, string> = { template: filters.template };

    if (filters.date_from) {
        params.date_from = filters.date_from;
    }

    if (filters.date_to) {
        params.date_to = filters.date_to;
    }

    if (filters.week !== null && filters.week_year !== null) {
        params.week = String(filters.week);
        params.week_year = String(filters.week_year);
    }

    router.get('/reporte-proveedores', params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
}

export default function ProviderComplianceReportPage() {
    const {
        week_label,
        range_label,
        units,
        weekly_bars,
        available_weeks,
        template_label,
        templates,
        filters,
    } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Cumplimiento por proveedor" />

            <div className="flex w-full min-w-0 max-w-none flex-col gap-6 p-4 sm:p-6">
                <div className="border-b-2 border-[#1a2b4c] pb-4">
                    <p className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                        {template_label} · {range_label} · {week_label}
                    </p>
                    <h1 className="mt-1 text-xl font-bold text-[#1a2b4c] sm:text-3xl">
                        Cumplimiento por proveedor
                    </h1>
                    <p className="mt-2 text-sm text-[#5a7390]">
                        Elige el rango de fechas y la semana dentro de ese
                        rango. Cada barra es proveedor + placa con % Pareto.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs font-semibold text-[#1a2b4c]">
                        Plantilla
                        <select
                            className="mt-1 block rounded-lg border border-[#c5d5e6] bg-white px-3 py-2 text-xs font-medium text-[#1a2b4c]"
                            value={filters.template}
                            onChange={(event) =>
                                visit({
                                    ...filters,
                                    template: event.target.value,
                                })
                            }
                        >
                            {templates.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
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
                                    ...filters,
                                    date_from: dateFrom,
                                    date_to: dateTo,
                                    week: null,
                                    week_year: null,
                                })
                            }
                            onClear={() =>
                                visit({
                                    ...filters,
                                    date_from: null,
                                    date_to: null,
                                    week: null,
                                    week_year: null,
                                })
                            }
                        />
                    </div>
                </div>

                <WeekSlicer
                    rangeLabel={range_label}
                    week={filters.week}
                    weekYear={filters.week_year}
                    availableWeeks={available_weeks}
                    onSelect={(point) => {
                        if (!point) {
                            return;
                        }

                        visit({
                            ...filters,
                            week: point.week,
                            week_year: point.year,
                        });
                    }}
                />

                <section className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
                    <div className="bg-[#1a2b4c] px-4 py-2 text-center text-xs font-bold tracking-wide text-[#fde047] uppercase">
                        % cumplimiento por proveedor
                    </div>
                    <div className="p-4 sm:p-6">
                        <ProviderUnitBars units={units} />
                    </div>
                </section>

                <section className="min-w-0 overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-6">
                    <h2 className="text-sm font-semibold text-[#1a2b4c]">
                        Promedio semanal en el rango
                    </h2>
                    <p className="mt-0.5 text-xs text-[#6b8ead]">
                        Solo semanas con inspecciones dentro de las fechas
                        filtradas
                    </p>
                    <div className="mt-4">
                        <SstWeeklyVerticalBars bars={weekly_bars} />
                    </div>
                </section>
            </div>
        </>
    );
}

ProviderComplianceReportPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Reportes', href: '#' },
        { title: 'Cumplimiento por proveedor', href: '#' },
    ],
};
