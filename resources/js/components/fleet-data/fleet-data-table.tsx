import { router } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    StatBadge,
    type DataTableColumn,
} from '@/components/data-page';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import {
    PeriodFilterSelect,
    type PeriodFilterOption,
} from '@/components/shared/period-filter-select';
import type {
    FleetFilters,
    FleetPagination,
    FleetTab,
    GpsMovementRow,
    GpsRecordRow,
    RcMovementRow,
    RcRecordRow,
} from '@/components/fleet-data/fleet-data-page';
import { asPaginated } from '@/lib/paginated';

type Props = {
    tab: FleetTab;
    filters: FleetFilters;
    records: FleetPagination<RcRecordRow | GpsRecordRow> | null;
    movements: FleetPagination<RcMovementRow | GpsMovementRow> | null;
    periodOptions: PeriodFilterOption[];
};

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const [year, month, day] = value.slice(0, 10).split('-');
    if (!year || !month || !day) {
        return value;
    }

    return `${day}/${month}/${year}`;
}

export function FleetDataTable({
    tab,
    filters,
    records,
    movements,
    periodOptions,
}: Props) {
    const history = filters.view === 'history';
    const paginated = (history ? movements : records) as FleetPagination<
        RcRecordRow | GpsRecordRow | RcMovementRow | GpsMovementRow
    > | null;

    const applyFilters = useCallback(
        (patch: Partial<FleetFilters>) => {
            router.get(
                '/datos-flota',
                { ...filters, ...patch },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        },
        [filters],
    );

    const rcRecordColumns = useMemo<
        DataTableColumn<RcRecordRow>[]
    >(
        () => [
            {
                key: 'plate_number',
                header: 'Placa',
                cell: (row) => (
                    <span className="text-xs font-semibold">{row.plate_number}</span>
                ),
            },
            {
                key: 'vehicle_type',
                header: 'Tipo',
                cell: (row) => (
                    <span className="text-xs text-muted-foreground">
                        {row.vehicle_type || '—'}
                    </span>
                ),
            },
            {
                key: 'supervisor_tdp',
                header: 'Sup. TDP',
                cell: (row) => (
                    <span className="text-xs text-muted-foreground">
                        {row.supervisor_tdp || '—'}
                    </span>
                ),
            },
            {
                key: 'expires_on',
                header: 'Vencimiento',
                cell: (row) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDate(row.expires_on)}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Estado',
                cell: (row) => (
                    <StatBadge
                        label={row.status === 'inactive' ? 'Inactivo' : 'Activo'}
                        value=""
                        variant={
                            row.status === 'inactive' ? 'muted' : 'success'
                        }
                    />
                ),
            },
            {
                key: 'service_date',
                header: 'Última carga',
                cell: (row) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDate(row.service_date)}
                    </span>
                ),
            },
        ],
        [],
    );

    const rcHistoryColumns = useMemo<DataTableColumn<RcMovementRow>[]>(
        () => [
            {
                key: 'service_date',
                header: 'Fecha carga',
                cell: (row) => (
                    <span className="text-xs font-medium">
                        {formatDate(row.service_date)}
                    </span>
                ),
            },
            {
                key: 'plate_number',
                header: 'Placa',
                cell: (row) => (
                    <span className="text-xs font-semibold">{row.plate_number}</span>
                ),
            },
            {
                key: 'vehicle_type',
                header: 'Tipo',
                cell: (row) => row.vehicle_type || '—',
            },
            {
                key: 'supervisor_tdp',
                header: 'Sup. TDP',
                cell: (row) => row.supervisor_tdp || '—',
            },
            {
                key: 'expires_on',
                header: 'Vencimiento',
                cell: (row) => formatDate(row.expires_on),
            },
        ],
        [],
    );

    const gpsRecordColumns = useMemo<DataTableColumn<GpsRecordRow>[]>(
        () => [
            {
                key: 'plate_number',
                header: 'Placa',
                cell: (row) => (
                    <span className="text-xs font-semibold">{row.plate_number}</span>
                ),
            },
            {
                key: 'imei',
                header: 'IMEI',
                cell: (row) => (
                    <span className="text-xs text-muted-foreground">
                        {row.imei || '—'}
                    </span>
                ),
            },
            {
                key: 'installed_on',
                header: 'Instalación',
                cell: (row) => formatDate(row.installed_on),
            },
            {
                key: 'status',
                header: 'Estado',
                cell: (row) => (
                    <StatBadge
                        label={row.status === 'inactive' ? 'Inactivo' : 'Activo'}
                        value=""
                        variant={
                            row.status === 'inactive' ? 'muted' : 'success'
                        }
                    />
                ),
            },
            {
                key: 'service_date',
                header: 'Última carga',
                cell: (row) => formatDate(row.service_date),
            },
        ],
        [],
    );

    const gpsHistoryColumns = useMemo<DataTableColumn<GpsMovementRow>[]>(
        () => [
            {
                key: 'service_date',
                header: 'Fecha carga',
                cell: (row) => formatDate(row.service_date),
            },
            {
                key: 'plate_number',
                header: 'Placa',
                cell: (row) => row.plate_number,
            },
            {
                key: 'imei',
                header: 'IMEI',
                cell: (row) => row.imei || '—',
            },
            {
                key: 'installed_on',
                header: 'Instalación',
                cell: (row) => formatDate(row.installed_on),
            },
        ],
        [],
    );

    const columns = useMemo(() => {
        if (tab === 'gps') {
            return history ? gpsHistoryColumns : gpsRecordColumns;
        }

        return history ? rcHistoryColumns : rcRecordColumns;
    }, [
        tab,
        history,
        gpsHistoryColumns,
        gpsRecordColumns,
        rcHistoryColumns,
        rcRecordColumns,
    ]);

    const rows = paginated?.data ?? [];

    return (
        <div className="space-y-3">
            <DataToolbar
                search={filters.search}
                searchPlaceholder="Buscar placa…"
                onSearchChange={(value) => applyFilters({ search: value })}
            >
                <PeriodFilterSelect
                    value={filters.period_id}
                    options={periodOptions}
                    onChange={(value) =>
                        applyFilters({ period_id: value ?? null })
                    }
                />
                {history ? (
                    <DateRangeFilter
                        dateFrom={filters.date_from}
                        dateTo={filters.date_to}
                        allDates={filters.all_dates}
                        onChange={(range) =>
                            applyFilters({
                                date_from: range.from,
                                date_to: range.to,
                                all_dates: range.allDates,
                            })
                        }
                    />
                ) : null}
            </DataToolbar>

            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => String(row.id)}
                emptyState={
                    <EmptyState
                        title="Sin registros"
                        description="Importa la plantilla del día o ajusta los filtros."
                    />
                }
            />

            {paginated ? (
                <DataPagination
                    meta={asPaginated(paginated, '/datos-flota')}
                    perPage={filters.per_page}
                    onPerPageChange={(perPage) =>
                        applyFilters({ per_page: perPage })
                    }
                />
            ) : null}
        </div>
    );
}
