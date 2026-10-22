import { Head, router, usePage } from '@inertiajs/react';
import {
    ProviderUnitBars,
    type ProviderUnitBar,
} from '@/components/reports/provider-unit-bars';
import { WeekSlicer } from '@/components/reports/week-slicer';
import {
    SstWeeklyVerticalBars,
    type SstDetailBar,
} from '@/components/sst-board/sst-item-detail-charts';
import { dashboard } from '@/routes';

type TemplateOption = { value: string; label: string };

type Filters = {
    year: number;
    week: number;
    template: string;
};

type PageProps = {
    year: number;
    week: number;
    week_label: string;
    units: ProviderUnitBar[];
    weekly_bars: SstDetailBar[];
    available_weeks: number[];
    template_label: string;
    templates: TemplateOption[];
    filters: Filters;
};

function visit(filters: Filters) {
    const params: Record<string, string | number> = {
        year: filters.year,
        week: filters.week,
        template: filters.template,
    };

    router.get('/reporte-proveedores', params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
}

export default function ProviderComplianceReportPage() {
    const {
        year,
        week,
        week_label,
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
                        {template_label} · {week_label}
                    </p>
                    <h1 className="mt-1 text-xl font-bold text-[#1a2b4c] sm:text-3xl">
                        Cumplimiento por proveedor
                    </h1>
                    <p className="mt-2 text-sm text-[#5a7390]">
                        Porcentaje Pareto de cada unidad (proveedor y placa) en
                        la semana elegida. El promedio semanal resume todas las
                        unidades inspeccionadas en esa semana.
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
                    <label className="text-xs font-semibold text-[#1a2b4c]">
                        Año
                        <select
                            className="mt-1 block rounded-lg border border-[#c5d5e6] bg-white px-3 py-2 text-xs font-medium text-[#1a2b4c]"
                            value={filters.year}
                            onChange={(event) =>
                                visit({
                                    ...filters,
                                    year: Number(event.target.value),
                                })
                            }
                        >
                            {[year - 1, year, year + 1].map((entry) => (
                                <option key={entry} value={entry}>
                                    {entry}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <WeekSlicer
                    year={year}
                    week={week}
                    availableWeeks={available_weeks}
                    onSelect={(nextWeek) =>
                        visit({ ...filters, week: nextWeek })
                    }
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
                        Promedio semanal ({year})
                    </h2>
                    <p className="mt-0.5 text-xs text-[#6b8ead]">
                        Promedio del % Pareto de unidades inspeccionadas por
                        semana ISO
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
