import { Head, usePage } from '@inertiajs/react';
import { DashboardPage } from '@/components/dashboard/dashboard-page';
import type { DashboardProps } from '@/components/dashboard/types';
import { dashboard } from '@/routes';

const emptyCharts = {
    inspections: [],
    documents_expiry: [],
    vehicles: [],
    providers: [],
    units_trend: [],
    inductions: [],
    docs_progress: [],
    inspection_compare: [],
};

export default function Dashboard() {
    const page = usePage().props as unknown as Partial<DashboardProps>;

    const data: DashboardProps = {
        generatedAt: page.generatedAt ?? '',
        activePeriod: page.activePeriod ?? null,
        kpis: page.kpis ?? [],
        semaforos: page.semaforos ?? [],
        charts: {
            ...emptyCharts,
            ...(page.charts ?? {}),
        },
        comparisons: {
            this_month_units: page.comparisons?.this_month_units ?? 0,
            prev_month_units: page.comparisons?.prev_month_units ?? 0,
            this_month_inspections:
                page.comparisons?.this_month_inspections ?? 0,
            prev_month_inspections:
                page.comparisons?.prev_month_inspections ?? 0,
            docs_avg_percent: page.comparisons?.docs_avg_percent ?? 0,
            first_pass_rate: page.comparisons?.first_pass_rate ?? null,
            second_pass_rate: page.comparisons?.second_pass_rate ?? null,
        },
        inductionsSummary: {
            attended: page.inductionsSummary?.attended ?? 0,
            registered: page.inductionsSummary?.registered ?? 0,
        },
        alerts: page.alerts ?? [],
    };

    return (
        <>
            <Head title="Panel operativo" />
            <DashboardPage data={data} />
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
