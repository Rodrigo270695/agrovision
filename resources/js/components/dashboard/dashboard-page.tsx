import { Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Bus,
    CalendarRange,
    ClipboardCheck,
    FileStack,
    GraduationCap,
    Percent,
    type LucideIcon,
} from 'lucide-react';
import { DashboardBarChart } from '@/components/dashboard/bar-chart';
import { DashboardDonutChart } from '@/components/dashboard/donut-chart';
import type {
    DashboardAlert,
    DashboardKpi,
    DashboardProps,
} from '@/components/dashboard/types';
import { cn } from '@/lib/utils';

const kpiIcons: Record<string, LucideIcon> = {
    units: Bus,
    docs: FileStack,
    inspections: ClipboardCheck,
    pass_rate: Percent,
    expiring: AlertTriangle,
    inductions: GraduationCap,
};

function AlertsBody({ alerts }: { alerts: DashboardAlert[] }) {
    if (alerts.length === 0) {
        return (
            <p className="px-4 py-8 text-center text-sm text-[#6b8ead]">
                Sin alertas de vencimiento en la flota.
            </p>
        );
    }

    return (
        <ul className="divide-y divide-[#eef3f8]">
            {alerts.slice(0, 8).map((alert) => (
                <li
                    key={`${alert.unit_id}-${alert.type}-${alert.expires_at}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#1a2b4c]">
                            {alert.correlative}
                            {alert.plate ? ` · ${alert.plate}` : ''}
                        </p>
                        <p className="truncate text-[11px] text-[#6b8ead]">
                            {alert.type_label} · vence {alert.expires_at}
                        </p>
                    </div>
                    <span
                        className={cn(
                            'shrink-0 text-[11px] font-medium',
                            alert.level === 'warning'
                                ? 'text-[#8a6d3b]'
                                : 'text-[#8b3a3a]',
                        )}
                    >
                        {alert.days_left < 0
                            ? `${Math.abs(alert.days_left)}d vencido`
                            : alert.days_left === 0
                              ? 'Hoy'
                              : `${alert.days_left}d`}
                    </span>
                </li>
            ))}
        </ul>
    );
}

const stripKeys = [
    'units',
    'docs',
    'inspections',
    'pass_rate',
    'expiring',
    'inductions',
];

export function DashboardPage({ data }: { data: DashboardProps }) {
    const tenant = usePage().props.tenant;
    const tenantName = tenant?.name ?? 'Empresa';
    const {
        activePeriod,
        kpis = [],
        charts,
        inductionsSummary,
        alerts = [],
    } = data;

    const strip = stripKeys
        .map((key) => kpis.find((kpi) => kpi.key === key))
        .filter((kpi): kpi is DashboardKpi => Boolean(kpi));

    const expiry = charts?.documents_expiry ?? [];
    const inspections = charts?.inspections ?? [];
    const unitsTrend = (charts?.units_trend ?? []).map((item) => ({
        ...item,
        color: '#2e5a9e',
    }));
    const inductions = charts?.inductions ?? [];

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.16em] text-[#6b8ead] uppercase">
                        {tenantName}
                    </p>
                    <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#1a2b4c] sm:text-2xl">
                        Panel de operación
                    </h1>
                    <p className="mt-1 max-w-xl text-sm text-[#5a7390]">
                        SST: unidades, documentación, inspecciones e
                        inducciones.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {activePeriod ? (
                        <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d7e3f0] bg-white px-3 text-xs text-[#1a2b4c]">
                            <CalendarRange className="size-3.5 text-[#2e5a9e]" />
                            Periodo <strong>{activePeriod.name}</strong>
                        </div>
                    ) : (
                        <div className="inline-flex h-9 items-center rounded-lg border border-[#e6dcc0] bg-[#fbf7ee] px-3 text-xs text-[#8a6d3b]">
                            Sin periodo activo
                        </div>
                    )}
                    <Link
                        href="/unidades"
                        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[#1a2b4c] px-3 text-xs font-medium text-white hover:bg-[#122038]"
                    >
                        <Bus className="size-3.5" />
                        Ver unidades
                    </Link>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#d7e3f0] bg-[#d7e3f0] sm:grid-cols-3 xl:grid-cols-6">
                {strip.map((kpi) => {
                    const Icon = kpiIcons[kpi.key] ?? Bus;
                    const body = (
                        <div className="flex h-full items-center gap-3 bg-white px-3.5 py-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f4f7fb] text-[#2e5a9e]">
                                <Icon className="size-3.5" strokeWidth={2.25} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-lg leading-none font-semibold text-[#1a2b4c]">
                                    {kpi.value}
                                </p>
                                <p className="mt-1 truncate text-[11px] text-[#5a7390]">
                                    {kpi.label}
                                </p>
                            </div>
                        </div>
                    );

                    if (!kpi.href) {
                        return <div key={kpi.key}>{body}</div>;
                    }

                    return (
                        <Link
                            key={kpi.key}
                            href={kpi.href}
                            className={cn(
                                'block cursor-pointer transition-colors hover:bg-[#f4f8fc]',
                            )}
                        >
                            {body}
                        </Link>
                    );
                })}
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
                <DashboardDonutChart
                    title="Vencimientos"
                    subtitle="Documentos de la flota"
                    data={expiry}
                />
                <DashboardBarChart
                    title="Unidades por mes"
                    subtitle="Últimos 6 meses"
                    data={unitsTrend}
                    className="xl:col-span-2"
                />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <DashboardBarChart
                    title="Inspecciones"
                    subtitle="Estado operativo de checklists"
                    data={inspections}
                />
                <DashboardDonutChart
                    title="Inducciones SST"
                    subtitle={`Asistentes ${inductionsSummary?.attended ?? 0} · Registrados ${inductionsSummary?.registered ?? 0}`}
                    data={inductions}
                />
            </section>

            <section className="overflow-hidden rounded-xl border border-[#d7e3f0] bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-[#eef3f8] px-4 py-3">
                    <div>
                        <h3 className="text-sm font-semibold text-[#1a2b4c]">
                            Alertas documentales
                        </h3>
                        <p className="text-xs text-[#6b8ead]">
                            Vencidos o por vencer
                        </p>
                    </div>
                    <Link
                        href="/unidades"
                        className="text-xs font-medium text-[#2e5a9e] hover:underline"
                    >
                        Ver unidades
                    </Link>
                </div>
                <AlertsBody alerts={alerts} />
            </section>
        </div>
    );
}
