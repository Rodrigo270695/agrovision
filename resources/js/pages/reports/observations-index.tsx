import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    ObservationsIndexChart,
    type ObservationIndexRow,
} from '@/components/reports/observations-index-chart';
import {
    WeekSlicer,
    type WeekPoint,
} from '@/components/reports/week-slicer';
import { AppModal } from '@/components/shared/app-modal';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import { Button } from '@/components/ui/button';
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
    rows: ObservationIndexRow[];
    units_with_observations: number;
    template_label: string;
    range_label: string;
    available_weeks: WeekPoint[];
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

    router.get('/reporte-observaciones', params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
}

export default function ObservationsIndexReportPage() {
    const {
        rows,
        units_with_observations,
        template_label,
        range_label,
        available_weeks,
        templates,
        filters,
    } = usePage<PageProps>().props;

    const [platesModal, setPlatesModal] = useState<ObservationIndexRow | null>(
        null,
    );

    return (
        <>
            <Head title="Índice de observaciones" />

            <div className="flex w-full min-w-0 max-w-none flex-col gap-6 p-4 sm:p-6">
                <div className="border-b-2 border-[#1a2b4c] pb-4">
                    <p className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                        {template_label} · {range_label}
                    </p>
                    <h1 className="mt-1 text-xl font-bold text-[#1a2b4c] sm:text-3xl">
                        Observaciones por unidad inspeccionada
                    </h1>
                    <p className="mt-2 text-sm text-[#5a7390]">
                        Vista inversa: cada observación y las placas que la tienen.
                        Usa el rango de fechas y, si quieres, una semana concreta
                        del rango.
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#1a2b4c]">
                        Unidades con observaciones:{' '}
                        <span className="text-lg tabular-nums">
                            {units_with_observations}
                        </span>
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
                    allowAll
                    onSelect={(point) =>
                        visit({
                            ...filters,
                            week: point?.week ?? null,
                            week_year: point?.year ?? null,
                        })
                    }
                />

                <section className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
                    <div className="bg-[#1a2b4c] px-4 py-2 text-center text-xs font-bold tracking-wide text-[#fde047] uppercase">
                        Observaciones por unidad inspeccionada
                    </div>
                    <div className="p-4 sm:p-6">
                        <ObservationsIndexChart
                            rows={rows}
                            onViewPlates={setPlatesModal}
                        />
                    </div>
                </section>
            </div>

            <AppModal
                open={platesModal !== null}
                onClose={() => setPlatesModal(null)}
                title="Placas con esta observación"
                description={platesModal?.observation}
                bodyClassName="max-h-[min(60vh,28rem)] overflow-y-auto"
                footer={
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPlatesModal(null)}
                    >
                        Cerrar
                    </Button>
                }
            >
                {platesModal ? (
                    <div className="flex flex-wrap gap-1.5">
                        {platesModal.plates.map((plate) => (
                            <span
                                key={plate}
                                className="rounded-md bg-[#f8fafc] px-2 py-1 text-xs font-semibold text-[#1a2b4c] ring-1 ring-[#d7e3f0]"
                            >
                                {plate}
                            </span>
                        ))}
                    </div>
                ) : null}
            </AppModal>
        </>
    );
}

ObservationsIndexReportPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Reportes', href: '#' },
        { title: 'Índice de observaciones', href: '#' },
    ],
};
