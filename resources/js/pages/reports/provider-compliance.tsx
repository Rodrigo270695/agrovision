import { Head, router, usePage } from '@inertiajs/react';
import {
    PlatformHero,
    PlatformPageShell,
    PlatformToolbar,
} from '@/components/platform';
import {
    ProviderUnitBars
    
} from '@/components/reports/provider-unit-bars';
import type {ProviderUnitBar} from '@/components/reports/provider-unit-bars';
import {
    WeekSlicer
    
} from '@/components/reports/week-slicer';
import type {WeekPoint} from '@/components/reports/week-slicer';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import {
    SstWeeklyVerticalBars
    
} from '@/components/sst-board/sst-item-detail-charts';
import type {SstDetailBar} from '@/components/sst-board/sst-item-detail-charts';
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

            <PlatformPageShell>
                <PlatformHero
                    eyebrow="Reportes · SST"
                    title="Cumplimiento por proveedor"
                    description="Elige el rango de fechas y la semana dentro de ese rango. Cada barra es proveedor + placa con % Pareto."
                    stats={[
                        { label: 'Plantilla', value: template_label, tone: 'navy' },
                        { label: 'Rango', value: range_label, tone: 'sky' },
                        { label: 'Semana', value: week_label, tone: 'amber' },
                        { label: 'Unidades', value: units.length, tone: 'emerald' },
                    ]}
                />

                <PlatformToolbar>
                    <label className="min-w-0 flex-1 text-xs font-semibold text-brand-700 sm:flex-none">
                        Plantilla
                        <select
                            className="mt-1 block w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-xs font-medium text-brand-700 sm:w-auto"
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
                    <div className="min-w-0 w-full sm:w-auto">
                        <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
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
                </PlatformToolbar>

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

                <section className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm">
                    <div className="bg-brand-700 px-4 py-2 text-center text-xs font-bold tracking-wide text-[#fde047] uppercase">
                        % cumplimiento por proveedor
                    </div>
                    <div className="p-4 sm:p-6">
                        <ProviderUnitBars units={units} />
                    </div>
                </section>

                <section className="min-w-0 overflow-hidden rounded-2xl border border-brand-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 className="text-sm font-semibold text-brand-700">
                        Promedio semanal en el rango
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Solo semanas con inspecciones dentro de las fechas
                        filtradas
                    </p>
                    <div className="mt-4">
                        <SstWeeklyVerticalBars bars={weekly_bars} />
                    </div>
                </section>
            </PlatformPageShell>
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
