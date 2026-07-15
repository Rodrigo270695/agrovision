import { Head, Link } from '@inertiajs/react';
import {
    CalendarRange,
    Leaf,
    RefreshCw,
    Sprout,
} from 'lucide-react';
import { DashboardAlertsList, type DashboardAlert } from '@/components/dashboard/alerts-list';
import { DashboardBarChart, type ChartPoint } from '@/components/dashboard/bar-chart';
import { DashboardDonutChart } from '@/components/dashboard/donut-chart';
import { DashboardKpiCard, type DashboardKpi } from '@/components/dashboard/kpi-card';
import { SemaforoCard, type SemaforoItem } from '@/components/dashboard/semaforo-card';
import { dashboard } from '@/routes';

type Props = {
    generatedAt: string;
    activePeriod: { id: number; name: string; date?: string | null } | null;
    kpis: DashboardKpi[];
    semaforos: SemaforoItem[];
    charts: {
        inspections: ChartPoint[];
        documents_expiry: ChartPoint[];
        vehicles: ChartPoint[];
        providers: ChartPoint[];
        units_trend: ChartPoint[];
        inductions: ChartPoint[];
    };
    inductionsSummary: {
        attended: number;
        registered: number;
    };
    alerts: DashboardAlert[];
};

function formatGeneratedAt(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function Dashboard({
    generatedAt,
    activePeriod,
    kpis,
    semaforos,
    charts,
    inductionsSummary,
    alerts,
}: Props) {
    return (
        <>
            <Head title="Panel operativo" />

            <div className="relative isolate min-h-full overflow-hidden">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-linear-to-b from-[#e8f1fa] via-[#f4f8fc] to-transparent"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-10 -right-10 size-56 rounded-full bg-[#9ec4e8]/25 blur-3xl"
                />

                <div className="relative space-y-5 p-4 sm:p-5 lg:p-6">
                    <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#cfe0f0] bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[#2e5a9e] uppercase shadow-sm">
                                <Leaf className="size-3.5" />
                                Agrovisión · SST / Flota
                            </div>
                            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#1a2b4c] sm:text-3xl">
                                Panel operativo
                            </h1>
                            <p className="max-w-2xl text-sm leading-relaxed text-[#5a7390]">
                                KPI de agroindustria: cumplimiento documental,
                                inspecciones de seguridad, vencimientos y
                                capacitación (inducción) en un solo tablero.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {activePeriod ? (
                                <div className="inline-flex items-center gap-2 rounded-xl border border-[#cfe0f0] bg-white px-3 py-2 text-xs text-[#1a2b4c] shadow-sm">
                                    <CalendarRange className="size-3.5 text-[#2e5a9e]" />
                                    <span>
                                        Periodo activo:{' '}
                                        <strong>{activePeriod.name}</strong>
                                    </span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 rounded-xl border border-[#e6dcc0] bg-[#fbf7ee] px-3 py-2 text-xs text-[#8a6d3b]">
                                    <Sprout className="size-3.5" />
                                    Sin periodo activo
                                </div>
                            )}
                            <div className="inline-flex items-center gap-2 rounded-xl border border-[#e2eaf3] bg-white/90 px-3 py-2 text-[11px] text-[#6b8ead]">
                                <RefreshCw className="size-3.5" />
                                Actualizado {formatGeneratedAt(generatedAt)}
                            </div>
                        </div>
                    </header>

                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {kpis.map((kpi) => (
                            <DashboardKpiCard key={kpi.key} kpi={kpi} />
                        ))}
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-end justify-between gap-2">
                            <div>
                                <h2 className="text-sm font-semibold text-[#1a2b4c]">
                                    Semáforos de gestión
                                </h2>
                                <p className="text-xs text-[#6b8ead]">
                                    Verde ≥ meta · Ámbar atención · Rojo crítico
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {semaforos.map((item) => (
                                <SemaforoCard key={item.key} item={item} />
                            ))}
                        </div>
                    </section>

                    <section className="grid gap-3 xl:grid-cols-2">
                        <DashboardDonutChart
                            title="Estado de vencimientos"
                            subtitle="Documentos subidos (excluye DNI sin fecha)"
                            data={charts.documents_expiry}
                        />
                        <DashboardDonutChart
                            title="Inducciones SST"
                            subtitle={`Asistentes: ${inductionsSummary.attended} · Registrados: ${inductionsSummary.registered}`}
                            data={charts.inductions}
                        />
                    </section>

                    <section className="grid gap-3 xl:grid-cols-2">
                        <DashboardBarChart
                            title="Inspecciones y consolidados"
                            subtitle="Distribución operativa de checklists"
                            data={charts.inspections}
                        />
                        <DashboardBarChart
                            title="Unidades por mes"
                            subtitle="Tendencia últimos 6 meses (fecha de servicio)"
                            data={charts.units_trend.map((item) => ({
                                ...item,
                                color: '#2e5a9e',
                            }))}
                        />
                    </section>

                    <section className="grid gap-3 xl:grid-cols-3">
                        <DashboardBarChart
                            title="Flota por tipo de vehículo"
                            data={charts.vehicles.map((item, index) => ({
                                ...item,
                                color: ['#1a2b4c', '#2e5a9e', '#4a90e2', '#6fa88a', '#d4a84b', '#c07070', '#7c6bb5', '#64748b'][index % 8],
                            }))}
                            className="xl:col-span-1"
                        />
                        <DashboardBarChart
                            title="Top proveedores"
                            data={charts.providers.map((item, index) => ({
                                ...item,
                                color: ['#2e5a9e', '#3d8b6e', '#6d28d9', '#c2410c', '#0f766e', '#475569'][index % 6],
                            }))}
                            className="xl:col-span-1"
                        />
                        <DashboardAlertsList alerts={alerts} />
                    </section>

                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                        <h2 className="mb-3 text-sm font-semibold text-[#1a2b4c]">
                            Accesos rápidos
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { href: '/unidades', label: 'Unidades' },
                                { href: '/inspecciones', label: 'Inspecciones' },
                                { href: '/consolidados', label: 'Consolidados' },
                                { href: '/inducciones', label: 'Inducciones' },
                                { href: '/periodos', label: 'Periodos' },
                                { href: '/pareto', label: 'Pareto' },
                            ].map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="rounded-full border border-[#cfe0f0] bg-[#f4f8fc] px-3 py-1.5 text-xs font-medium text-[#1a2b4c] transition hover:bg-[#e8f1fa]"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Panel',
            href: dashboard(),
        },
    ],
};
