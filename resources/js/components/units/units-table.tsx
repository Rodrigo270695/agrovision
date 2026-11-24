import {
    Bus,
    CheckCircle2,
    ClipboardCheck,
    Download,
    FileStack,
    Layers,
    PauseCircle,
    Pencil,
    Trash2,
    UserRound,
    XCircle,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    StatBadge,
    type DataTableColumn,
    type SortState,
} from '@/components/data-page';
import { FilterChips } from '@/components/data-page/filter-chips';
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
import { rangeThisMonth } from '@/lib/date-range-presets';
import { isBrowserOnline } from '@/lib/offline/ids';
import { asPaginated } from '@/lib/paginated';
import { toast } from 'sonner';

export type UnitItem = {
    id: number | string;
    pending_sync?: boolean;
    period_id: number;
    correlative: string;
    phone?: string | null;
    provider: string;
    route?: string | null;
    sede?: string | null;
    garita?: string | null;
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
    status?: string | null;
    has_inspection?: boolean;
    last_inactive_on?: string | null;
    last_active_on?: string | null;
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

export type MovementItem = {
    id: number;
    correlative: string;
    service_date?: string | null;
    plate_number?: string | null;
    driver_name?: string | null;
    route?: string | null;
    sede?: string | null;
    garita?: string | null;
    service_type?: string | null;
    provider?: string | null;
    vehicle_type?: string | null;
    coordinator?: {
        id: number;
        name: string;
    } | null;
    period?: {
        id: number;
        name: string;
        date?: string;
    } | null;
};

export type MovementsPagination = {
    data: MovementItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
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
    status?: 'active' | 'inactive' | null;
    coordinator_id?: number | null;
    inspection?: 'yes' | 'no' | null;
    template_type?: string | null;
    view?: 'units' | 'movements' | 'files' | 'reconcile';
    import_id?: number | null;
    reconcile_filter?: 'all' | 'mismatch' | 'ok';
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

export type ChecklistTemplateFilterOption = {
    value: string;
    label: string;
};

export type ImportFileItem = {
    id: number;
    imported_on?: string | null;
    created_at?: string | null;
    original_name?: string | null;
    rows: number;
    period?: { id: number; name: string } | null;
    user?: { id: number; name: string } | null;
    download_url?: string | null;
};

export type UnitReconcileRow = {
    kind: 'unit' | 'missing_unit';
    unit_id: number | null;
    correlative?: string | null;
    plate_number?: string | null;
    driver_name?: string | null;
    provider?: string | null;
    coordinator?: string | null;
    in_excel: boolean;
    in_scope?: boolean;
    expected_status: 'active' | 'inactive' | null;
    actual_status: 'active' | 'inactive' | null;
    match: boolean | null;
    service_date?: string | null;
    note?: string | null;
};

export type UnitReconcilePayload = {
    missing_import?: boolean;
    message?: string;
    report?: {
        import: {
            id: number;
            imported_on?: string | null;
            original_name?: string | null;
            scope_label?: string;
            period?: { id: number; name: string };
            user?: { id: number; name: string } | null;
            download_url?: string | null;
            movements_count?: number;
        };
        file: {
            rows_with_data: number;
            unique_plates: number;
            file_missing: boolean;
            file_movement_mismatch: boolean;
            read_errors: Array<{ row: number; messages: string[] }>;
        };
        summary: {
            units_checked: number;
            matches: number;
            mismatches: number;
            skipped_scope: number;
            all_ok: boolean;
        };
        rows: UnitReconcileRow[];
    };
    import_options?: ImportFileItem[];
};

type Props = {
    units: UnitsPagination;
    movements?: MovementsPagination | null;
    imports?: ImportFileItem[];
    reconcile?: UnitReconcilePayload | null;
    filters: UnitsFilters;
    periodOptions: PeriodFilterOption[];
    coordinatorOptions?: { id: number; name: string }[];
    checklistTemplateOptions?: ChecklistTemplateFilterOption[];
    onEdit: (unit: UnitItem) => void;
    onDelete: (unit: UnitItem) => void;
    onDocuments: (unit: UnitItem) => void;
};

type SortKey = UnitsFilters['sort'];

function isoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

function thisMonthQuery(): {
    date_from: string;
    date_to: string;
    all_dates: false;
    page: number;
} {
    const range = rangeThisMonth();

    return {
        date_from: isoDate(range.from),
        date_to: isoDate(range.to),
        all_dates: false,
        page: 1,
    };
}

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

function formatDay(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const [year, month, day] = value.slice(0, 10).split('-');

    if (!year || !month || !day) {
        return '—';
    }

    return `${day}/${month}/${year}`;
}

function formatClock(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function UnitsTable({
    units,
    movements = null,
    imports = [],
    reconcile = null,
    filters,
    periodOptions,
    coordinatorOptions = [],
    checklistTemplateOptions = [],
    onEdit,
    onDelete,
    onDocuments,
}: Props) {
    const showingHistory = filters.view === 'movements';
    const showingFiles = filters.view === 'files';
    const showingReconcile = filters.view === 'reconcile';
    const visit = useCallback(
        (params: Partial<UnitsFilters> & { page?: number }) => {
            if (!isBrowserOnline()) {
                toast.info(
                    'Sin conexión. Los filtros se habilitan al reconectar.',
                );

                return;
            }

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
            const nextStatus = Object.prototype.hasOwnProperty.call(
                params,
                'status',
            )
                ? params.status
                : filters.status;
            const nextCoordinatorId = Object.prototype.hasOwnProperty.call(
                params,
                'coordinator_id',
            )
                ? params.coordinator_id
                : filters.coordinator_id;
            const nextInspection = Object.prototype.hasOwnProperty.call(
                params,
                'inspection',
            )
                ? params.inspection
                : filters.inspection;
            const nextTemplateType = Object.prototype.hasOwnProperty.call(
                params,
                'template_type',
            )
                ? params.template_type
                : filters.template_type;

            router.get(
                '/unidades',
                {
                    search: params.search ?? filters.search,
                    ...(nextPeriodId ? { period_id: nextPeriodId } : {}),
                    ...(nextStatus ? { status: nextStatus } : {}),
                    ...(nextCoordinatorId
                        ? { coordinator_id: nextCoordinatorId }
                        : {}),
                    ...(nextInspection ? { inspection: nextInspection } : {}),
                    ...(nextTemplateType
                        ? { template_type: nextTemplateType }
                        : {}),
                    ...(nextAllDates ? { all_dates: 1 } : {}),
                    ...(nextDateFrom ? { date_from: nextDateFrom } : {}),
                    ...(nextDateTo ? { date_to: nextDateTo } : {}),
                    view: params.view ?? filters.view ?? 'units',
                    sort: params.sort ?? filters.sort,
                    direction: params.direction ?? filters.direction,
                    per_page: params.per_page ?? filters.per_page,
                    page: params.page ?? 1,
                    ...(params.import_id !== undefined
                        ? { import_id: params.import_id ?? undefined }
                        : filters.import_id
                          ? { import_id: filters.import_id }
                          : {}),
                    ...(params.reconcile_filter ?? filters.reconcile_filter
                        ? {
                              reconcile_filter:
                                  params.reconcile_filter ??
                                  filters.reconcile_filter,
                          }
                        : {}),
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
                key: 'status',
                header: 'Estado',
                cell: (unit) => (
                    <div className="flex min-w-0 flex-col gap-1">
                        {unit.pending_sync ? (
                            <StatBadge
                                label="En dispositivo"
                                value=""
                                variant="warning"
                            />
                        ) : unit.status === 'inactive' ? (
                            <StatBadge
                                label="Inactivo"
                                value=""
                                variant="muted"
                            />
                        ) : (
                            <StatBadge
                                label="Activo"
                                value=""
                                variant="success"
                            />
                        )}
                        {unit.last_inactive_on ? (
                            <span className="text-[11px] text-muted-foreground">
                                No estuvo {formatDate(unit.last_inactive_on)}
                            </span>
                        ) : null}
                        {unit.last_active_on ? (
                            <span className="text-[11px] text-muted-foreground">
                                Ingresó {formatDate(unit.last_active_on)}
                            </span>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'inspection',
                header: 'Inspección',
                cell: (unit) =>
                    unit.has_inspection ? (
                        <StatBadge
                            label="Sí"
                            value=""
                            variant="success"
                        />
                    ) : (
                        <StatBadge
                            label="No"
                            value=""
                            variant="muted"
                        />
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
                key: 'sede',
                header: 'Sede',
                sortable: true,
                cell: (unit) => (
                    <span className="text-xs text-muted-foreground">
                        {unit.sede?.trim() || '—'}
                    </span>
                ),
            },
            {
                key: 'garita',
                header: 'Garita',
                sortable: true,
                cell: (unit) => (
                    <span className="text-xs text-muted-foreground">
                        {unit.garita?.trim() || '—'}
                    </span>
                ),
            },
            {
                key: 'route',
                header: 'Ruta',
                sortable: true,
                cell: (unit) => (
                    <span className="text-xs text-muted-foreground">
                        {unit.route?.trim() || '—'}
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

    const historyColumns = useMemo<DataTableColumn<MovementItem>[]>(
        () => [
            {
                key: 'service_date',
                header: 'Fecha',
                sortable: true,
                cell: (movement) => (
                    <span className="text-xs font-medium text-foreground">
                        {formatDate(movement.service_date)}
                    </span>
                ),
            },
            {
                key: 'correlative',
                header: 'Correlativo',
                sortable: true,
                cell: (movement) => (
                    <span className="text-xs font-semibold text-foreground">
                        {movement.correlative}
                    </span>
                ),
            },
            {
                key: 'plate_number',
                header: 'Placa',
                sortable: true,
                cell: (movement) => (
                    <span className="text-xs text-muted-foreground">
                        {movement.plate_number || '—'}
                    </span>
                ),
            },
            {
                key: 'driver_name',
                header: 'Conductor',
                sortable: true,
                cell: (movement) => (
                    <span className="text-xs text-muted-foreground">
                        {movement.driver_name || '—'}
                    </span>
                ),
            },
            {
                key: 'sede',
                header: 'Sede',
                cell: (movement) => (
                    <span className="text-xs text-muted-foreground">
                        {movement.sede || '—'}
                    </span>
                ),
            },
            {
                key: 'garita',
                header: 'Garita',
                cell: (movement) => (
                    <span className="text-xs text-muted-foreground">
                        {movement.garita || '—'}
                    </span>
                ),
            },
            {
                key: 'route',
                header: 'Ruta',
                cell: (movement) => (
                    <span className="text-xs text-muted-foreground">
                        {movement.route || '—'}
                    </span>
                ),
            },
            {
                key: 'service_type',
                header: 'Servicio',
                cell: (movement) => (
                    <span className="text-xs text-muted-foreground">
                        {movement.service_type || '—'}
                    </span>
                ),
            },
            {
                key: 'provider',
                header: 'Proveedor',
                sortable: true,
                cell: (movement) => (
                    <span className="text-xs text-muted-foreground">
                        {movement.provider || '—'}
                    </span>
                ),
            },
            {
                key: 'vehicle_type',
                header: 'Vehículo',
                sortable: true,
                cell: (movement) => (
                    <span className="text-xs text-muted-foreground">
                        {movement.vehicle_type || '—'}
                    </span>
                ),
            },
        ],
        [],
    );

    const hasFilters = Boolean(
        filters.search ||
            filters.period_id ||
            filters.status ||
            filters.coordinator_id ||
            filters.inspection ||
            filters.template_type ||
            filters.date_from ||
            filters.date_to,
    );

    const checklistTemplateFilter = (
        <FilterChips
            ariaLabel="Filtrar por tipo de checklist"
            value={filters.template_type ?? 'all'}
            onChange={(next) =>
                visit({
                    template_type: next === 'all' ? null : next,
                    page: 1,
                })
            }
            options={[
                {
                    value: 'all',
                    label: 'Todos los tipos',
                    icon: <Layers className="size-3.5" />,
                    tone: 'default',
                },
                ...(checklistTemplateOptions.length > 0
                    ? checklistTemplateOptions
                    : [
                          { value: 'tdp', label: 'TDP' },
                          { value: 'tdc', label: 'TDC' },
                      ]
                ).map((template) => ({
                    value: template.value,
                    label: template.label,
                    icon: <Bus className="size-3.5" />,
                    tone: 'default' as const,
                })),
            ]}
        />
    );

    const statusFilter = (
        <FilterChips
            ariaLabel="Filtrar por estado"
            value={filters.status ?? 'all'}
            onChange={(next) =>
                visit({
                    status: next === 'all' ? null : next,
                    page: 1,
                })
            }
            options={[
                {
                    value: 'all',
                    label: 'Todos los estados',
                    icon: <Layers className="size-3.5" />,
                    tone: 'default',
                },
                {
                    value: 'active',
                    label: 'Activo',
                    icon: <CheckCircle2 className="size-3.5" />,
                    tone: 'success',
                },
                {
                    value: 'inactive',
                    label: 'Inactivo',
                    icon: <PauseCircle className="size-3.5" />,
                    tone: 'muted',
                },
            ]}
        />
    );

    const inspectionFilter = (
        <FilterChips
            ariaLabel="Filtrar por inspección"
            value={filters.inspection ?? 'all'}
            onChange={(next) =>
                visit({
                    inspection: next === 'all' ? null : next,
                    page: 1,
                })
            }
            options={[
                {
                    value: 'all',
                    label: 'Todas las inspecciones',
                    icon: <Layers className="size-3.5" />,
                    tone: 'default',
                },
                {
                    value: 'yes',
                    label: 'Con inspección',
                    icon: <ClipboardCheck className="size-3.5" />,
                    tone: 'success',
                },
                {
                    value: 'no',
                    label: 'Sin inspección',
                    icon: <XCircle className="size-3.5" />,
                    tone: 'muted',
                },
            ]}
        />
    );

    const coordinatorFilter = (
        <FilterChips
            ariaLabel="Filtrar por coordinador"
            value={
                filters.coordinator_id ? String(filters.coordinator_id) : 'all'
            }
            onChange={(next) =>
                visit({
                    coordinator_id: next === 'all' ? null : Number(next),
                    page: 1,
                })
            }
            options={[
                {
                    value: 'all',
                    label: 'Todos los coordinadores',
                    icon: <Layers className="size-3.5" />,
                    tone: 'default',
                },
                ...coordinatorOptions.map((option) => ({
                    value: String(option.id),
                    label: option.name,
                    icon: <UserRound className="size-3.5" />,
                    tone: 'default' as const,
                })),
            ]}
        />
    );

    const tabClass = (active: boolean) =>
        `cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium ${
            active ? 'bg-brand-700 text-white' : 'text-muted-foreground'
        }`;

    const viewToggle = (
        <div className="flex rounded-lg border border-brand-300 bg-white p-0.5">
            <button
                type="button"
                onClick={() =>
                    visit({
                        view: 'units',
                        sort: 'correlative',
                        direction: 'desc',
                        page: 1,
                    })
                }
                className={tabClass(
                    !showingHistory && !showingFiles && !showingReconcile,
                )}
            >
                Unidades
            </button>
            <button
                type="button"
                onClick={() =>
                    visit({
                        view: 'movements',
                        sort: 'service_date',
                        direction: 'desc',
                        page: 1,
                    })
                }
                className={tabClass(showingHistory)}
            >
                Historial
            </button>
            <button
                type="button"
                onClick={() =>
                    visit({
                        view: 'files',
                        page: 1,
                    })
                }
                className={tabClass(showingFiles)}
            >
                Archivos
            </button>
            <button
                type="button"
                onClick={() =>
                    visit({
                        view: 'reconcile',
                        page: 1,
                        reconcile_filter:
                            filters.reconcile_filter ?? 'mismatch',
                    })
                }
                className={tabClass(showingReconcile)}
            >
                Cruce Excel
            </button>
        </div>
    );

    const fileColumns: DataTableColumn<ImportFileItem>[] = [
        {
            key: 'imported_on',
            header: 'Fecha',
            cell: (file) => formatDay(file.imported_on),
        },
        {
            key: 'created_at',
            header: 'Hora',
            cell: (file) => formatClock(file.created_at),
        },
        {
            key: 'original_name',
            header: 'Archivo',
            cell: (file) => file.original_name || 'Sin archivo guardado',
        },
        {
            key: 'user',
            header: 'Subió',
            cell: (file) => file.user?.name || '—',
        },
        {
            key: 'period',
            header: 'Periodo',
            cell: (file) => file.period?.name || '—',
        },
        {
            key: 'rows',
            header: 'Filas',
            cell: (file) => String(file.rows),
        },
        {
            key: 'download',
            header: '',
            align: 'right',
            cell: (file) => (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                        type="button"
                        className="cursor-pointer text-xs font-semibold text-brand-700 hover:underline"
                        onClick={() =>
                            visit({
                                view: 'reconcile',
                                import_id: file.id,
                                reconcile_filter: 'mismatch',
                                page: 1,
                            })
                        }
                    >
                        Cruce
                    </button>
                    {file.download_url ? (
                        <a
                            href={file.download_url}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
                        >
                            <Download className="size-3.5" />
                            Descargar
                        </a>
                    ) : (
                        '—'
                    )}
                </div>
            ),
        },
    ];

    if (showingReconcile) {
        const report = reconcile?.report;
        const importOptions = reconcile?.import_options ?? imports;
        const rows = report?.rows ?? [];
        const summary = report?.summary;
        const missing = reconcile?.missing_import;

        return (
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_40px_-28px_rgba(15,31,58,0.4)]">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 bg-[linear-gradient(135deg,#f8fbff,#ffffff_55%)] px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 flex-col gap-2">
                        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                            Verificación
                        </p>
                        <h2 className="font-display text-lg font-bold text-brand-800">
                            Cruce Excel ↔ unidades
                        </h2>
                        <p className="max-w-2xl text-xs text-slate-500">
                            Compara el último archivo subido con el estado
                            activo/inactivo en el periodo. Una placa en el Excel
                            debe quedar activa; las que no vienen deben quedar
                            inactivas (según alcance de la importación).
                        </p>
                    </div>
                    <details className="text-xs text-slate-500">
                        <summary className="cursor-pointer font-medium text-brand-700">
                            ¿Por qué veo diferencias en Unidades?
                        </summary>
                        <p className="mt-2 max-w-md">
                            La pestaña Unidades puede filtrar por{' '}
                            <strong>fecha de servicio</strong> (ej. Este mes).
                            Una unidad inactiva con fecha antigua puede no
                            aparecer en la tabla pero sí contarse en estadísticas
                            o en otro filtro. El cruce revisa{' '}
                            <strong>todo el periodo</strong>, sin ese filtro de
                            fechas.
                        </p>
                    </details>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
                    {viewToggle}
                    <PeriodFilterSelect
                        value={filters.period_id}
                        options={periodOptions}
                        onChange={(periodId) =>
                            visit({
                                period_id: periodId,
                                page: 1,
                                view: 'reconcile',
                            })
                        }
                    />
                    {importOptions.length > 0 ? (
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            Archivo
                            <select
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                                value={
                                    filters.import_id ??
                                    report?.import.id ??
                                    importOptions[0]?.id
                                }
                                onChange={(e) =>
                                    visit({
                                        import_id: Number(e.target.value),
                                        view: 'reconcile',
                                        page: 1,
                                    })
                                }
                            >
                                {importOptions.map((file) => (
                                    <option key={file.id} value={file.id}>
                                        {formatDay(file.imported_on)} ·{' '}
                                        {file.original_name || `Import #${file.id}`}{' '}
                                        ({file.rows} filas)
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}
                    <div className="flex rounded-lg border border-slate-200 p-0.5">
                        {(
                            [
                                ['mismatch', 'Solo diferencias'],
                                ['all', 'Todo'],
                                ['ok', 'Correctos'],
                            ] as const
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                className={tabClass(
                                    (filters.reconcile_filter ?? 'mismatch') ===
                                        value,
                                )}
                                onClick={() =>
                                    visit({
                                        reconcile_filter: value,
                                        view: 'reconcile',
                                        page: 1,
                                    })
                                }
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {missing ? (
                    <div className="px-4 py-12 text-center text-sm text-slate-500">
                        {reconcile?.message}
                    </div>
                ) : report ? (
                    <>
                        <div className="grid gap-3 border-b border-slate-100 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
                            <StatBadge
                                label="Archivo"
                                value={
                                    report.import.original_name ??
                                    `Importación #${report.import.id}`
                                }
                                variant="default"
                            />
                            <StatBadge
                                label="Placas en Excel"
                                value={String(report.file.unique_plates)}
                                variant="default"
                            />
                            <StatBadge
                                label="Coinciden"
                                value={String(summary?.matches ?? 0)}
                                variant="success"
                            />
                            <StatBadge
                                label="Diferencias"
                                value={String(summary?.mismatches ?? 0)}
                                variant={
                                    (summary?.mismatches ?? 0) > 0
                                        ? 'warning'
                                        : 'success'
                                }
                            />
                        </div>

                        {summary?.all_ok ? (
                            <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 sm:mx-5">
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                                <p>
                                    El estado activo/inactivo coincide con el
                                    Excel y los movimientos del lote.
                                </p>
                            </div>
                        ) : null}

                        {report.file.file_movement_mismatch ? (
                            <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 sm:mx-5">
                                <PauseCircle className="mt-0.5 size-4 shrink-0" />
                                <p>
                                    Las placas del archivo guardado no coinciden
                                    con los movimientos registrados en ese lote.
                                    Puede haber una carga distinta el mismo día.
                                </p>
                            </div>
                        ) : null}

                        <div className="overflow-x-auto px-2 pb-4 pt-2 sm:px-4">
                            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-3 py-2">Placa</th>
                                        <th className="px-3 py-2">Correlativo</th>
                                        <th className="px-3 py-2">En Excel</th>
                                        <th className="px-3 py-2">Esperado</th>
                                        <th className="px-3 py-2">En sistema</th>
                                        <th className="px-3 py-2">Resultado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-3 py-10 text-center text-slate-500"
                                            >
                                                No hay filas con este filtro.
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, index) => (
                                            <tr
                                                key={`${row.plate_number}-${row.unit_id ?? 'new'}-${index}`}
                                                className="border-t border-slate-100"
                                            >
                                                <td className="px-3 py-2 font-semibold text-brand-800">
                                                    {row.plate_number || '—'}
                                                </td>
                                                <td className="px-3 py-2 text-xs text-slate-600">
                                                    {row.correlative || '—'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.in_excel ? 'Sí' : 'No'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.expected_status
                                                        ? row.expected_status ===
                                                          'active'
                                                            ? 'Activo'
                                                            : 'Inactivo'
                                                        : '—'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.actual_status
                                                        ? row.actual_status ===
                                                          'active'
                                                            ? 'Activo'
                                                            : 'Inactivo'
                                                        : '—'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.match === null ? (
                                                        <span className="text-xs text-slate-400">
                                                            Fuera de alcance
                                                        </span>
                                                    ) : row.match ? (
                                                        <StatBadge
                                                            label="OK"
                                                            value=""
                                                            variant="success"
                                                        />
                                                    ) : (
                                                        <StatBadge
                                                            label="Revisar"
                                                            value=""
                                                            variant="warning"
                                                        />
                                                    )}
                                                    {row.note ? (
                                                        <p className="mt-1 text-[11px] text-slate-500">
                                                            {row.note}
                                                        </p>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <p className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500 sm:px-5">
                            {report.import.scope_label} ·{' '}
                            {report.file.rows_with_data} filas con datos ·{' '}
                            {summary?.units_checked ?? 0} unidades evaluadas
                            {report.import.download_url ? (
                                <>
                                    {' · '}
                                    <a
                                        href={report.import.download_url}
                                        className="font-medium text-brand-700 hover:underline"
                                    >
                                        Descargar Excel del lote
                                    </a>
                                </>
                            ) : null}
                        </p>
                    </>
                ) : null}
            </section>
        );
    }

    if (showingFiles) {
        return (
            <DataTable
                columns={fileColumns}
                data={imports}
                rowKey={(file) => file.id}
                ariaLiveMessage={`${imports.length} archivos encontrados`}
                emptyState={
                    <EmptyState
                        icon={FileStack}
                        title="Sin archivos"
                        description="Los Excel que subas desde Importar quedan aquí, con su fecha, y se pueden descargar."
                    />
                }
                toolbar={
                    <DataToolbar
                        search={filters.search}
                        onSearchChange={(search) => visit({ search, page: 1 })}
                        placeholder="Buscar archivo, persona o periodo..."
                    >
                        {viewToggle}
                        <PeriodFilterSelect
                            value={filters.period_id}
                            options={periodOptions}
                            onChange={(periodId) =>
                                visit({ period_id: periodId, page: 1 })
                            }
                        />
                    </DataToolbar>
                }
            />
        );
    }

    const historyRows = movements?.data ?? [];

    if (showingHistory) {
        return (
            <DataTable
                columns={historyColumns}
                data={historyRows}
                rowKey={(movement) => movement.id}
                sort={sort}
                onSortChange={(next) => {
                    if (!next) {
                        visit({
                            sort: 'service_date',
                            direction: 'desc',
                            page: 1,
                        });
                        return;
                    }

                    visit({
                        sort: next.key as SortKey,
                        direction: next.direction,
                        page: 1,
                    });
                }}
                ariaLiveMessage={`${movements?.total ?? 0} movimientos encontrados`}
                toolbar={
                    <DataToolbar
                        search={filters.search}
                        onSearchChange={(search) => visit({ search, page: 1 })}
                        placeholder="Buscar correlativo, placa, conductor..."
                    >
                        {viewToggle}
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
                                visit(thisMonthQuery())
                            }
                        />
                    </DataToolbar>
                }
                footer={
                    <DataPagination
                        meta={asPaginated(
                            movements ?? {
                                data: [],
                                current_page: 1,
                                last_page: 1,
                                per_page: filters.per_page,
                                total: 0,
                                from: null,
                                to: null,
                            },
                            '/unidades',
                        )}
                        onPerPageChange={(per_page) =>
                            visit({ per_page, page: 1 })
                        }
                        preservedQuery={{
                            search: filters.search || undefined,
                            per_page: filters.per_page,
                            sort: filters.sort,
                            direction: filters.direction,
                            view: 'movements',
                            period_id: filters.period_id ?? undefined,
                            status: filters.status || undefined,
                            coordinator_id: filters.coordinator_id ?? undefined,
                            inspection: filters.inspection || undefined,
                            template_type: filters.template_type || undefined,
                            date_from: filters.date_from || undefined,
                            date_to: filters.date_to || undefined,
                            all_dates: filters.all_dates ? 1 : undefined,
                        }}
                    />
                }
                emptyState={
                    <EmptyState
                        icon={Bus}
                        title="Sin movimientos en este rango"
                        description="Cambia las fechas o vuelve a importar el Excel. Cada fila del archivo es un día de esa unidad."
                    />
                }
            />
        );
    }

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
                    {viewToggle}
                    <PeriodFilterSelect
                        value={filters.period_id}
                        options={periodOptions}
                        onChange={(periodId) =>
                            visit({ period_id: periodId, page: 1 })
                        }
                    />
                    {statusFilter}
                    {checklistTemplateFilter}
                    {inspectionFilter}
                    {coordinatorFilter}
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
                            visit(thisMonthQuery())
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
                        status: filters.status || undefined,
                        coordinator_id: filters.coordinator_id ?? undefined,
                        inspection: filters.inspection || undefined,
                        template_type: filters.template_type || undefined,
                        date_from: filters.date_from || undefined,
                        date_to: filters.date_to || undefined,
                        all_dates: filters.all_dates ? 1 : undefined,
                        view: filters.view === 'movements' ? 'movements' : undefined,
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
