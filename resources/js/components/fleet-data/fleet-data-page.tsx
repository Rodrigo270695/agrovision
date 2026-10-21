import { router, usePage } from '@inertiajs/react';
import { Download, FileSpreadsheet, History, Radio, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FleetDataTable } from '@/components/fleet-data/fleet-data-table';
import { FleetImportModal } from '@/components/fleet-data/fleet-import-modal';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import type { PeriodOption } from '@/components/units/unit-form-fields';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';

export type FleetTab = 'rc' | 'gps';

export type FleetFilters = {
    tab: FleetTab;
    view: 'records' | 'history';
    search: string;
    period_id: number | null;
    date_from: string | null;
    date_to: string | null;
    all_dates: boolean;
    per_page: number;
};

export type FleetStats = {
    records: number;
    active: number;
    inactive: number;
    movements: number;
    on_screen: number;
};

export type FleetPagination<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type RcRecordRow = {
    id: number;
    plate_number: string;
    unit_class?: string | null;
    vehicle_type?: string | null;
    usage?: string | null;
    condition_flag?: string | null;
    supervisor_tdp?: string | null;
    procedure?: string | null;
    activated_on?: string | null;
    expires_on?: string | null;
    service_date?: string | null;
    status?: string | null;
};

export type RcMovementRow = RcRecordRow & { service_date: string };

export type GpsRecordRow = {
    id: number;
    plate_number: string;
    imei?: string | null;
    installed_on?: string | null;
    service_date?: string | null;
    status?: string | null;
};

export type GpsMovementRow = GpsRecordRow & { service_date: string };

type PageProps = {
    tab: FleetTab;
    filters: FleetFilters;
    stats: FleetStats;
    records: FleetPagination<RcRecordRow | GpsRecordRow> | null;
    movements: FleetPagination<RcMovementRow | GpsMovementRow> | null;
    periodOptions: PeriodOption[];
};

function buildExportUrl(tab: FleetTab, filters: FleetFilters): string {
    const base =
        tab === 'rc' ? '/datos-flota/rc/exportar' : '/datos-flota/gps/exportar';
    const params = new URLSearchParams();

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.period_id) {
        params.set('period_id', String(filters.period_id));
    }

    if (filters.view) {
        params.set('view', filters.view);
    }

    if (filters.all_dates) {
        params.set('all_dates', '1');
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    const query = params.toString();

    return query ? `${base}?${query}` : base;
}

export function FleetDataPage() {
    const { tab, filters, stats, records, movements, periodOptions } =
        usePage().props as unknown as PageProps;
    const { can } = useCan();
    const [importOpen, setImportOpen] = useState(false);
    const exportUrl = useMemo(
        () => buildExportUrl(tab, filters),
        [tab, filters],
    );

    const setTab = (next: FleetTab) => {
        router.get(
            '/datos-flota',
            { ...filters, tab: next, view: 'records' },
            { preserveState: true, replace: true },
        );
    };

    const setView = (view: 'records' | 'history') => {
        router.get(
            '/datos-flota',
            { ...filters, view },
            { preserveState: true, replace: true },
        );
    };

    const tabLabel = tab === 'rc' ? 'Seguro RC' : 'GPS';

    return (
        <div className="flex flex-col gap-4 p-4">
            <PageHeader
                title="Seguro RC y GPS"
                description="Carga masiva por periodo. El último Excel del día actualiza el catálogo y guarda historial por fecha."
                stats={[
                    {
                        label: 'Registros',
                        value: stats.records,
                        variant: 'info',
                        icon: tab === 'rc' ? ShieldCheck : Radio,
                    },
                    {
                        label: 'Activos',
                        value: stats.active,
                        variant: 'success',
                        icon: ShieldCheck,
                    },
                    {
                        label: 'Inactivos',
                        value: stats.inactive,
                        variant: 'muted',
                        icon: ShieldCheck,
                    },
                    {
                        label: 'Historial',
                        value: stats.movements,
                        variant: 'primary',
                        icon: History,
                    },
                ]}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        {can('fleet_data.view') ? (
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="gap-2"
                            >
                                <a href={exportUrl}>
                                    <Download className="size-4" />
                                    Descargar Excel
                                </a>
                            </Button>
                        ) : null}
                        {can('fleet_data.import') ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() => setImportOpen(true)}
                            >
                                <FileSpreadsheet className="size-4" />
                                Importar {tabLabel}
                            </Button>
                        ) : null}
                    </div>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-[#d7e3f0] bg-white p-1">
                    <button
                        type="button"
                        className={cn(
                            'cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium',
                            tab === 'rc'
                                ? 'bg-[#1a2b4c] text-white'
                                : 'text-[#1a2b4c] hover:bg-[#e8f1fa]',
                        )}
                        onClick={() => setTab('rc')}
                    >
                        Seguro RC
                    </button>
                    <button
                        type="button"
                        className={cn(
                            'cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium',
                            tab === 'gps'
                                ? 'bg-[#1a2b4c] text-white'
                                : 'text-[#1a2b4c] hover:bg-[#e8f1fa]',
                        )}
                        onClick={() => setTab('gps')}
                    >
                        GPS
                    </button>
                </div>

                <div className="inline-flex rounded-lg border border-[#d7e3f0] bg-white p-1">
                    <button
                        type="button"
                        className={cn(
                            'cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium',
                            filters.view === 'records'
                                ? 'bg-[#1a2b4c] text-white'
                                : 'text-[#1a2b4c] hover:bg-[#e8f1fa]',
                        )}
                        onClick={() => setView('records')}
                    >
                        Catálogo
                    </button>
                    <button
                        type="button"
                        className={cn(
                            'cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium',
                            filters.view === 'history'
                                ? 'bg-[#1a2b4c] text-white'
                                : 'text-[#1a2b4c] hover:bg-[#e8f1fa]',
                        )}
                        onClick={() => setView('history')}
                    >
                        Historial
                    </button>
                </div>
            </div>

            <FleetDataTable
                tab={tab}
                filters={filters}
                records={records}
                movements={movements}
                periodOptions={periodOptions}
            />

            <FleetImportModal
                open={importOpen}
                tab={tab}
                periodOptions={periodOptions}
                onClose={() => setImportOpen(false)}
            />
        </div>
    );
}
