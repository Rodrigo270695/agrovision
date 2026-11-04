import { Head, router, usePage } from '@inertiajs/react';
import { Radio, ShieldCheck } from 'lucide-react';
import {
    PlatformContentPanel,
    PlatformHero,
    PlatformPageShell,
    PlatformToolbar,
} from '@/components/platform';
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

            <PlatformPageShell>
                <PlatformHero
                    eyebrow={`Reportes · Flota · ${range_label}`}
                    title="Cumplimiento Seguro RC y GPS"
                    description="Porcentaje de unidades con seguro RC vigente o GPS instalado, agrupado por semana según la fecha de carga del archivo (placas únicas por semana)."
                    stats={[
                        { label: 'Unidades', value: summary.total, tone: 'navy' },
                        { label: 'OK', value: summary.ok, tone: 'emerald' },
                        {
                            label: 'Pendiente',
                            value: summary.pendiente,
                            tone: 'amber',
                        },
                        { label: 'Falta', value: summary.falta, tone: 'rose' },
                    ]}
                />

                <PlatformToolbar
                    leading={
                        <div className="flex flex-wrap gap-2">
                            {tabs.map((entry) => {
                                const Icon = entry.icon;
                                const active = tab === entry.id;

                                return (
                                    <button
                                        key={entry.id}
                                        type="button"
                                        onClick={() =>
                                            visit({ tab: entry.id })
                                        }
                                        className={cn(
                                            'inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold shadow-sm transition',
                                            active
                                                ? 'border-brand-700 bg-brand-700 text-white'
                                                : 'border-brand-300 bg-white text-brand-700 hover:bg-background',
                                        )}
                                    >
                                        <Icon className="size-4" />
                                        {entry.label}
                                    </button>
                                );
                            })}
                        </div>
                    }
                >
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
                                    date_from: dateFrom,
                                    date_to: dateTo,
                                })
                            }
                            onClear={() =>
                                visit({ date_from: null, date_to: null })
                            }
                        />
                    </div>
                    <p className="w-full text-xs text-muted-foreground sm:max-w-sm">
                        Solo se listan semanas con unidades en el rango (carga
                        de archivo o periodo en fechas).
                    </p>
                </PlatformToolbar>

                <PlatformContentPanel className="p-4 sm:p-6">
                    <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Resumen del rango seleccionado — {title}
                    </p>
                    <SstSummaryStrip summary={summary} />
                </PlatformContentPanel>

                <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
                    <PlatformContentPanel className="min-w-0 p-4 sm:p-6">
                        <h2 className="text-sm font-semibold text-brand-700">
                            % OK por semana
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Barras verdes: cumplimiento en la carga de esa
                            semana ({title})
                        </p>
                        <div className="mt-4">
                            <SstWeeklyVerticalBars bars={bars} />
                        </div>
                    </PlatformContentPanel>

                    <PlatformContentPanel className="min-w-0 p-4 sm:p-6">
                        <SstDetailDonut title={title} summary={summary} />
                        <p className="mt-4 text-center text-[10px] text-muted-foreground">
                            Fuente: {source_label}
                        </p>
                    </PlatformContentPanel>
                </div>
            </PlatformPageShell>
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
