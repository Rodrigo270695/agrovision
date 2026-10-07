import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { ConsolidatedTab } from '@/components/company-reports/consolidated-tab';
import { InductionsTab } from '@/components/company-reports/inductions-tab';
import { InspectionsTab } from '@/components/company-reports/inspections-tab';
import { QuotaTab } from '@/components/company-reports/quota-tab';
import type {
    InductionRow,
    InspectionDetail,
    InspectorRow,
    QuotaRow,
    ReportFilters,
    ReportSummary,
} from '@/components/company-reports/types';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import { cn } from '@/lib/utils';

type TabId = 'cuotas' | 'inducciones' | 'inspecciones' | 'consolidado';

type Props = {
    company: { id: string; name: string };
    baseUrl: string;
    filters: ReportFilters;
    quotas: QuotaRow[];
    inductions: InductionRow[];
    inspectors: InspectorRow[];
    details: InspectionDetail[];
    details_total: number;
    summary: ReportSummary;
};

const TABS: Array<{ id: TabId; label: string }> = [
    { id: 'cuotas', label: 'Cuota de inspectores' },
    { id: 'inducciones', label: 'Capacitaciones' },
    { id: 'inspecciones', label: 'Inspecciones' },
    { id: 'consolidado', label: 'Consolidado' },
];

export default function CompanyReportsPage({
    company,
    baseUrl,
    filters,
    quotas,
    inductions,
    inspectors,
    details,
    details_total,
    summary,
}: Props) {
    const [tab, setTab] = useState<TabId>('cuotas');
    const daysMet = inspectors.reduce((sum, row) => sum + row.days_met, 0);
    const daysWorked = inspectors.reduce(
        (sum, row) => sum + row.days_with_work,
        0,
    );
    const daysPercent =
        daysWorked > 0 ? Math.round((daysMet / daysWorked) * 100) : 0;

    return (
        <>
            <Head title={`Reportes · ${company.name}`} />
            <div className="flex w-full flex-col gap-4 p-4 sm:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold tracking-wide text-[#6b8ead] uppercase">
                            {company.name}
                        </p>
                        <h1 className="font-display text-2xl font-semibold text-[#1a2b4c]">
                            Reportes de la empresa
                        </h1>
                        <p className="mt-1 text-sm text-[#5a7390]">
                            {filters.label}. Solo el dueño de la empresa ve estos
                            reportes. La hora es la de Perú.
                        </p>
                    </div>
                    <DateRangeFilter
                        desde={filters.date_from}
                        hasta={filters.date_to}
                        align="end"
                        onApply={(desde, hasta) =>
                            router.get(
                                baseUrl,
                                { date_from: desde, date_to: hasta },
                                { preserveScroll: true, preserveState: true },
                            )
                        }
                        onClear={() =>
                            router.get(baseUrl, {}, {
                                preserveScroll: true,
                                preserveState: true,
                            })
                        }
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    {TABS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setTab(item.id)}
                            className={cn(
                                'cursor-pointer rounded-full px-3 py-1.5 text-sm',
                                tab === item.id
                                    ? 'bg-[#1a2b4c] text-white'
                                    : 'bg-white text-[#1a2b4c] ring-1 ring-[#d7e3f0]',
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {tab === 'cuotas' ? (
                    <QuotaTab
                        rows={quotas}
                        baseUrl={baseUrl}
                        goalPercent={summary.today_goal_percent}
                    />
                ) : null}
                {tab === 'inducciones' ? (
                    <InductionsTab
                        rows={inductions}
                        attendancePercent={summary.attendance_percent}
                        signedPercent={summary.signed_percent}
                    />
                ) : null}
                {tab === 'inspecciones' ? (
                    <InspectionsTab
                        inspectors={inspectors}
                        details={details}
                        detailsTotal={details_total}
                        goalPercent={daysPercent}
                    />
                ) : null}
                {tab === 'consolidado' ? (
                    <ConsolidatedTab
                        summary={summary}
                        baseUrl={baseUrl}
                        dateFrom={filters.date_from}
                        dateTo={filters.date_to}
                    />
                ) : null}
            </div>
        </>
    );
}
