import { Head, Link } from '@inertiajs/react';
import {
    Building2,
    Bus,
    CheckCircle2,
    Globe,
    PauseCircle,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { DashboardBarChart } from '@/components/dashboard/bar-chart';
import { DashboardDonutChart } from '@/components/dashboard/donut-chart';
import { StatBadge } from '@/components/data-page';
import type { ChartPoint, DashboardKpi } from '@/components/dashboard/types';
import { cn } from '@/lib/utils';

type RecentTenant = {
    id: string;
    name: string;
    status: string;
    schema: string;
    domains: string[];
    url: string;
    created_at: string | null;
    users: number;
    units: number;
};

type Props = {
    generatedAt: string;
    kpis: DashboardKpi[];
    charts: {
        status: ChartPoint[];
        created: ChartPoint[];
        units: ChartPoint[];
    };
    recent: RecentTenant[];
};

const kpiIcons: Record<string, LucideIcon> = {
    tenants: Building2,
    active: CheckCircle2,
    suspended: PauseCircle,
    domains: Globe,
    users: Users,
    units: Bus,
};

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

export default function CentralDashboard({ kpis, charts, recent }: Props) {
    return (
        <>
            <Head title="Panel · Grupo Indelsi" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                            Grupo Indelsi
                        </p>
                        <h1 className="mt-1 text-xl font-semibold tracking-tight text-brand-700 sm:text-2xl">
                            Panel de administración
                        </h1>
                        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                            Resumen de empresas, dominios y operación.
                        </p>
                    </div>
                    <Link
                        href="/plataforma/empresas"
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-700 px-3 text-xs font-medium text-white hover:bg-brand-700"
                    >
                        <Building2 className="size-3.5" />
                        Ver empresas
                    </Link>
                </header>

                <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-brand-200 bg-brand-200 sm:grid-cols-3 xl:grid-cols-6">
                    {kpis.map((kpi) => {
                        const Icon = kpiIcons[kpi.key] ?? Building2;
                        const body = (
                            <div className="flex h-full items-center gap-3 bg-white px-3.5 py-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                                    <Icon className="size-3.5" strokeWidth={2.25} />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-lg font-semibold leading-none text-brand-700">
                                        {kpi.value}
                                    </p>
                                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
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
                        title="Estado"
                        subtitle="Activas y suspendidas"
                        data={charts.status}
                    />
                    <DashboardBarChart
                        title="Altas por mes"
                        subtitle="Últimos 6 meses"
                        data={charts.created}
                        className="xl:col-span-2"
                    />
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                    <DashboardBarChart
                        title="Unidades por empresa"
                        subtitle="Flota en cada tenant"
                        data={charts.units}
                    />

                    <div className="overflow-hidden rounded-xl border border-brand-200 bg-white">
                        <div className="border-b border-muted px-4 py-3">
                            <h3 className="text-sm font-semibold text-brand-700">
                                Empresas recientes
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Últimos tenants registrados
                            </p>
                        </div>

                        {recent.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                Aún no hay empresas.
                            </p>
                        ) : (
                            <ul className="divide-y divide-muted">
                                {recent.map((tenant) => (
                                    <li
                                        key={tenant.id}
                                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-brand-700">
                                                {tenant.name}
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {tenant.users} usuarios · {tenant.units} unidades
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <StatBadge
                                                label={
                                                    tenant.status === 'active'
                                                        ? 'Activa'
                                                        : 'Suspendida'
                                                }
                                                value=""
                                                variant={
                                                    tenant.status === 'active'
                                                        ? 'success'
                                                        : 'warning'
                                                }
                                            />
                                            <span className="hidden w-20 text-right text-[11px] text-muted-foreground sm:block">
                                                {formatDate(tenant.created_at)}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
}

CentralDashboard.layout = {
    breadcrumbs: [{ title: 'Panel', href: '/plataforma' }],
};
