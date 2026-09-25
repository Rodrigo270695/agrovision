import { Bus, FileStack, Pencil, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    type DataTableColumn,
    type SortState,
} from '@/components/data-page';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import {
    PeriodFilterSelect,
    type PeriodFilterOption,
} from '@/components/shared/period-filter-select';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { DocumentExpiryBadge } from '@/components/units/document-expiry-badge';
import { DocumentsProgressBar } from '@/components/units/documents-progress-bar';
import type { UnitDocumentItem } from '@/components/units/unit-documents-modal';
import { useCan } from '@/hooks/use-can';
import {
    getWorstDocumentExpiry,
    unitExpiryRowClass,
} from '@/lib/document-expiry';
import { asPaginated } from '@/lib/paginated';

export type UnitItem = {
    id: number;
    period_id: number;
    correlative: string;
    phone?: string | null;
    provider: string;
    route?: string | null;
    vehicle_type?: string | null;
    service_date?: string | null;
    driver_name?: string | null;
    plate_number?: string | null;
    responsible_person?: string | null;
    service_type?: string | null;
    ruc?: string | null;
    driver_dni?: string | null;
    category?: string | null;
    coordinator_id?: number | null;
    coordinatorUser?: {
        id: number;
        name: string;
        email?: string | null;
    } | null;
    documents?: UnitDocumentItem[];
    documents_count?: number;
    documents_progress?: {
        done: number;
        total: number;
        percent: number;
        types?: Array<{
            value: string;
            label: string;
            uploaded: boolean;
        }>;
    };
    created_at?: string | null;
    period?: {
        id: number;
        name: string;
        status?: string;
        date?: string;
    } | null;
};

export type UnitsPagination = {
    data: UnitItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type UnitsFilters = {
    search: string;
    period_id?: number | null;
    date_from?: string | null;
    date_to?: string | null;
    all_dates?: boolean;
    sort:
        | 'correlative'
        | 'provider'
        | 'plate_number'
        | 'driver_name'
        | 'vehicle_type'
        | 'service_date'
        | 'created_at';
    direction: 'asc' | 'desc';
    per_page: number;
};

type Props = {
    units: UnitsPagination;
    filters: UnitsFilters;
    periodOptions: PeriodFilterOption[];
    onEdit: (unit: UnitItem) => void;
    onDelete: (unit: UnitItem) => void;
    onDocuments: (unit: UnitItem) => void;
};

type SortKey = UnitsFilters['sort'];

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date
        .toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        .replace('.', '');
}

function formatPeriodLabel(period?: UnitItem['period'], empty = '—'): string {
    if (!period?.name) {
        return empty;
    }

    const periodDate = formatDate(period.date);

    return periodDate === '—'
        ? period.name
        : `${period.name} · ${periodDate}`;
}

function UnitActions({
    unit,
    onEdit,
    onDelete,
    onDocuments,
}: {
    unit: UnitItem;
    onEdit: (unit: UnitItem) => void;
    onDelete: (unit: UnitItem) => void;
    onDocuments: (unit: UnitItem) => void;
}) {
    const { can } = useCan();
    const docsCount = unit.documents_count ?? unit.documents?.length ?? 0;

    return (
        <RowActionsMenu
            label={`Acciones de ${unit.correlative}`}
            items={[
                can('units.view')
                    ? {
                          key: 'docs',
                          label:
                              docsCount > 0
                                  ? `Documentos (${docsCount})`
                                  : 'Documentos',
                          icon: FileStack,
                          onSelect: () => onDocuments(unit),
                      }
                    : null,
                can('units.update')
                    ? {
                          key: 'edit',
                          label: 'Editar',
                          icon: Pencil,
                          onSelect: () => onEdit(unit),
                      }
                    : null,
                can('units.delete')
                    ? {
                          key: 'delete',
                          label: 'Eliminar',
                          icon: Trash2,
                          tone: 'danger' as const,
                          separatorBefore: true,
                          onSelect: () => onDelete(unit),
                      }
                    : null,
            ].filter((item): item is NonNullable<typeof item> => Boolean(item))}
        />
    );
}

export function UnitsTable({
    units,
    filters,
    periodOptions,
    onEdit,
    onDelete,
    onDocuments,
}: Props) {
    const visit = useCallback(
        (params: Partial<UnitsFilters> & { page?: number }) => {
            const nextPeriodId = Object.prototype.hasOwnProperty.call(
                params,
                'period_id',
            )
                ? params.period_id
                : filters.period_id;
            const nextDateFrom = Object.prototype.hasOwnProperty.call(
                params,
                'date_from',
            )
                ? params.date_from
                : filters.date_from;
            const nextDateTo = Object.prototype.hasOwnProperty.call(
                params,
                'date_to',
            )
                ? params.date_to
                : filters.date_to;
            const nextAllDates = Object.prototype.hasOwnProperty.call(
                params,
                'all_dates',
            )
                ? params.all_dates
                : filters.all_dates;

            router.get(
                '/unidades',
                {
                    search: params.search ?? filters.search,
                    ...(nextPeriodId ? { period_id: nextPeriodId } : {}),
                    ...(nextAllDates ? { all_dates: 1 } : {}),
                    ...(nextDateFrom ? { date_from: nextDateFrom } : {}),
                    ...(nextDateTo ? { date_to: nextDateTo } : {}),
                    sort: params.sort ?? filters.sort,
                    direction: params.direction ?? filters.direction,
                    per_page: params.per_page ?? filters.per_page,
                    page: params.page ?? 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        },
        [filters],
    );

    const sort: SortState | null = filters.sort
        ? { key: filters.sort, direction: filters.direction }
        : null;

    const columns = useMemo<DataTableColumn<UnitItem>[]>(
        () => [
            {
                key: 'correlative',
                header: 'Correlativo',
                sortable: true,
                cell: (unit) => (
                    <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-sm font-semibold text-foreground">
                            {unit.correlative}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                            {formatPeriodLabel(unit.period)}
                        </span>
                    </div>
                ),
            },
            {
                key: 'plate_number',
                header: 'Placa',
                sortable: true,
                cell: (unit) => (
                    <span className="text-xs text-muted-foreground">
                        {unit.plate_number || '—'}
                    </span>
                ),
            },
            {
                key: 'driver_name',
                header: 'Conductor',
                sortable: true,
                cell: (unit) => (
                    <span className="text-xs text-muted-foreground">
                        {unit.driver_name || '—'}
                    </span>
                ),
            },
            {
                key: 'vehicle_type',
                header: 'Vehículo',
                sortable: true,
                cell: (unit) => (
                    <span className="text-xs text-muted-foreground">
                        {unit.vehicle_type || '—'}
                    </span>
                ),
            },
            {
                key: 'provider',
                header: 'Proveedor',
                sortable: true,
                cell: (unit) => (
                    <span className="text-xs text-muted-foreground">
                        {unit.provider}
                    </span>
                ),
            },
            {
                key: 'coordinator',
                header: 'Coordinador',
                cell: (unit) => (
                    <span className="text-xs text-muted-foreground">
                        {unit.coordinatorUser?.name || '—'}
                    </span>
                ),
            },
            {
                key: 'documents',
                header: 'Docs',
                className: 'min-w-[8.5rem]',
                cell: (unit) => {
                    const expiry = getWorstDocumentExpiry(unit.documents ?? []);

                    return (
                        <div className="flex flex-col gap-1">
                            <DocumentsProgressBar
                                progress={
                                    unit.documents_progress ?? {
                                        done: 0,
                                        total: 6,
                                        percent: 0,
                                    }
                                }
                            />
                            <DocumentExpiryBadge info={expiry} compact />
                        </div>
                    );
                },
            },
            {
                key: 'service_date',
                header: 'Fecha',
                sortable: true,
                cell: (unit) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDate(unit.service_date)}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                className: 'w-12',
                cell: (unit) => (
                    <div className="flex justify-end">
                        <UnitActions
                            unit={unit}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onDocuments={onDocuments}
                        />
                    </div>
                ),
            },
        ],
        [onDelete, onDocuments, onEdit],
    );

    const hasFilters = Boolean(
        filters.search ||
            filters.period_id ||
            filters.date_from ||
            filters.date_to,
    );

    return (
        <DataTable
            columns={columns}
            data={units.data}
            rowKey={(unit) => unit.id}
            sort={sort}
            onSortChange={(next) => {
                if (!next) {
                    visit({ sort: 'correlative', direction: 'asc', page: 1 });
                    return;
                }

                visit({
                    sort: next.key as SortKey,
                    direction: next.direction,
                    page: 1,
                });
            }}
            getRowClassName={(unit) => {
                const expiry = getWorstDocumentExpiry(unit.documents ?? []);

                return unitExpiryRowClass(expiry.level);
            }}
            ariaLiveMessage={`${units.total} unidades encontradas`}
            toolbar={
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar correlativo, placa, conductor..."
                >
                    <PeriodFilterSelect
                        value={filters.period_id}
                        options={periodOptions}
                        onChange={(periodId) =>
                            visit({ period_id: periodId, page: 1 })
                        }
                    />
                    <DateRangeFilter
                        desde={filters.date_from ?? null}
                        hasta={filters.date_to ?? null}
                        onApply={(dateFrom, dateTo) =>
                            visit({
                                date_from: dateFrom,
                                date_to: dateTo,
                                all_dates: false,
                                page: 1,
                            })
                        }
                        onClear={() =>
                            visit({
                                date_from: null,
                                date_to: null,
                                all_dates: true,
                                page: 1,
                            })
                        }
                    />
                </DataToolbar>
            }
            footer={
                <DataPagination
                    meta={asPaginated(units, '/unidades')}
                    onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
                    preservedQuery={{
                        search: filters.search || undefined,
                        per_page: filters.per_page,
                        sort: filters.sort,
                        direction: filters.direction,
                        period_id: filters.period_id ?? undefined,
                        date_from: filters.date_from || undefined,
                        date_to: filters.date_to || undefined,
                        all_dates: filters.all_dates ? 1 : undefined,
                    }}
                />
            }
            emptyState={
                <EmptyState
                    icon={Bus}
                    title={hasFilters ? 'Sin resultados' : 'Aún no hay unidades'}
                    description={
                        hasFilters
                            ? 'Prueba con otro filtro o limpia la búsqueda.'
                            : 'Crea la primera unidad o impórtala desde Excel.'
                    }
                />
            }
        />
    );
}
