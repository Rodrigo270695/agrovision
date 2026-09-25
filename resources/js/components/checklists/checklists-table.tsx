import { ClipboardCheck, FileDown, Pencil, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { isBrowserOnline } from '@/lib/offline/ids';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    FilterChips,
    StatBadge,
    type DataTableColumn,
    type FilterChip,
    type SortState,
} from '@/components/data-page';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { useCan } from '@/hooks/use-can';
import { asPaginated } from '@/lib/paginated';

export type ChecklistItemRow = {
    id: number | string;
    pending_sync?: boolean;
    plate_number: string;
    driver_name?: string | null;
    provider?: string | null;
    status: 'draft' | 'completed';
    sealed_at?: string | null;
    first_result?: 'approved' | 'rejected' | null;
    second_result?: 'approved' | 'rejected' | null;
    coordinator_status?: 'observed' | 'reviewed' | null;
    created_at?: string | null;
    template?: {
        id: number;
        type: string;
        code: string;
        name: string;
    } | null;
    period?: {
        id: number;
        name: string;
        date?: string;
        status?: string;
    } | null;
};

export type ChecklistsPagination = {
    data: ChecklistItemRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type ChecklistsFilters = {
    search: string;
    template_type?: 'tdp' | 'tdc' | null;
    status?: 'draft' | 'completed' | null;
    sort: 'plate_number' | 'created_at' | 'status' | 'first_result';
    direction: 'asc' | 'desc';
    per_page: number;
    batch_id?: number | null;
};

type Props = {
    checklists: ChecklistsPagination;
    filters: ChecklistsFilters;
    onEdit: (item: ChecklistItemRow) => void;
    onDelete: (item: ChecklistItemRow) => void;
    onPreviewPdf: (item: ChecklistItemRow) => void;
};

type SortKey = ChecklistsFilters['sort'];
type TypeFilter = 'all' | 'tdp' | 'tdc';
type StatusFilter = 'all' | 'draft' | 'completed';

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

function resultLabel(value?: string | null): string {
    if (value === 'approved') {
        return 'Aprobado';
    }

    if (value === 'rejected') {
        return 'Desaprobado';
    }

    return 'Pendiente';
}

function ResultChip({ value }: { value?: string | null }) {
    const variant =
        value === 'approved'
            ? 'success'
            : value === 'rejected'
              ? 'danger'
              : 'muted';

    return <StatBadge label={resultLabel(value)} value="" variant={variant} />;
}

function statusBadge(item: ChecklistItemRow) {
    const sealed = Boolean(item.sealed_at);

    if (item.pending_sync) {
        return <StatBadge label="En dispositivo" value="" variant="warning" />;
    }

    if (sealed) {
        return <StatBadge label="Sellado" value="" variant="info" />;
    }

    if (item.coordinator_status === 'reviewed') {
        return <StatBadge label="Revisado" value="" variant="primary" />;
    }

    if (item.coordinator_status === 'observed') {
        return <StatBadge label="Observado" value="" variant="warning" />;
    }

    if (item.status === 'completed') {
        return <StatBadge label="Completado" value="" variant="success" />;
    }

    return <StatBadge label="Borrador" value="" variant="warning" />;
}

export function ChecklistsTable({
    checklists,
    filters,
    onEdit,
    onDelete,
    onPreviewPdf,
}: Props) {
    const { can } = useCan();

    const visit = useCallback(
        (params: Partial<ChecklistsFilters> & { page?: number; batch_id?: number | null }) => {
            if (!isBrowserOnline()) {
                toast.info(
                    'Sin conexión. Los filtros se habilitan al reconectar.',
                );

                return;
            }

            const nextType = Object.prototype.hasOwnProperty.call(
                params,
                'template_type',
            )
                ? params.template_type
                : filters.template_type;
            const nextStatus = Object.prototype.hasOwnProperty.call(
                params,
                'status',
            )
                ? params.status
                : filters.status;

            router.get(
                '/inspecciones',
                {
                    search: params.search ?? filters.search,
                    ...(nextType ? { template_type: nextType } : {}),
                    ...(nextStatus ? { status: nextStatus } : {}),
                    sort: params.sort ?? filters.sort,
                    direction: params.direction ?? filters.direction,
                    per_page: params.per_page ?? filters.per_page,
                    ...(params.page ? { page: params.page } : {}),
                },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        },
        [filters],
    );

    const sort: SortState | null = filters.sort
        ? { key: filters.sort, direction: filters.direction }
        : null;

    const typeOptions: readonly FilterChip<TypeFilter>[] = [
        { value: 'all', label: 'Todos los tipos', tone: 'default' },
        { value: 'tdp', label: 'TDP', tone: 'info' },
        { value: 'tdc', label: 'TDC', tone: 'primary' },
    ];

    const statusOptions: readonly FilterChip<StatusFilter>[] = [
        { value: 'all', label: 'Todos los estados', tone: 'default' },
        { value: 'draft', label: 'Borrador', tone: 'warning' },
        { value: 'completed', label: 'Completado', tone: 'success' },
    ];

    const columns = useMemo<DataTableColumn<ChecklistItemRow>[]>(
        () => [
            {
                key: 'plate_number',
                header: 'Placa',
                sortable: true,
                cell: (item) => (
                    <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-sm font-semibold text-foreground">
                            {item.plate_number}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                            {item.driver_name || 'Sin conductor'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'status',
                header: 'Estado',
                sortable: true,
                cell: (item) => statusBadge(item),
            },
            {
                key: 'first_result',
                header: '1ra insp.',
                sortable: true,
                cell: (item) => <ResultChip value={item.first_result} />,
            },
            {
                key: 'second_result',
                header: '2da insp.',
                cell: (item) =>
                    item.coordinator_status === 'reviewed' ? (
                        <ResultChip value={item.second_result} />
                    ) : item.coordinator_status === 'observed' ? (
                        <StatBadge
                            label="En revisión"
                            value=""
                            variant="warning"
                        />
                    ) : (
                        <ResultChip value={null} />
                    ),
            },
            {
                key: 'created_at',
                header: 'Creado',
                sortable: true,
                cell: (item) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                    </span>
                ),
            },
            {
                key: 'type',
                header: 'Tipo',
                cell: (item) => (
                    <span className="text-xs font-semibold uppercase text-[#2e5a9e]">
                        {item.template?.type ?? '—'}
                    </span>
                ),
            },
            {
                key: 'period',
                header: 'Periodo',
                cell: (item) => (
                    <span className="text-xs text-muted-foreground">
                        {item.period?.name || '—'}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                className: 'w-12',
                cell: (item) => {
                    const sealed = Boolean(item.sealed_at);
                    const canPdf =
                        typeof item.id === 'number' &&
                        (item.first_result === 'approved' ||
                            item.first_result === 'rejected') &&
                        can('checklists.view');

                    return (
                        <div className="flex justify-end">
                            <RowActionsMenu
                                label={`Acciones de ${item.plate_number}`}
                                items={[
                                    canPdf
                                        ? {
                                              key: 'pdf',
                                              label: 'Ver PDF',
                                              icon: FileDown,
                                              onSelect: () =>
                                                  onPreviewPdf(item),
                                          }
                                        : null,
                                    can('checklists.update') || sealed
                                        ? {
                                              key: 'open',
                                              label: sealed ? 'Ver' : 'Editar',
                                              icon: Pencil,
                                              onSelect: () => onEdit(item),
                                          }
                                        : null,
                                    can('checklists.delete') && !sealed
                                        ? {
                                              key: 'delete',
                                              label: 'Eliminar',
                                              icon: Trash2,
                                              tone: 'danger' as const,
                                              separatorBefore: true,
                                              onSelect: () => onDelete(item),
                                          }
                                        : null,
                                ].filter(
                                    (action): action is NonNullable<typeof action> =>
                                        Boolean(action),
                                )}
                            />
                        </div>
                    );
                },
            },
        ],
        [can, onDelete, onEdit, onPreviewPdf],
    );

    const hasFilters = Boolean(
        filters.search || filters.template_type || filters.status,
    );

    return (
        <DataTable
            columns={columns}
            data={checklists.data}
            rowKey={(item) => item.id}
            sort={sort}
            onSortChange={(next) => {
                if (!next) {
                    visit({ sort: 'created_at', direction: 'desc', page: 1 });
                    return;
                }

                visit({
                    sort: next.key as SortKey,
                    direction: next.direction,
                    page: 1,
                });
            }}
            ariaLiveMessage={`${checklists.total} inspecciones encontradas`}
            toolbar={
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar placa, conductor..."
                >
                    <FilterChips
                        ariaLabel="Filtrar por tipo"
                        value={(filters.template_type ?? 'all') as TypeFilter}
                        onChange={(value) =>
                            visit({
                                template_type:
                                    value === 'all'
                                        ? null
                                        : (value as 'tdp' | 'tdc'),
                                page: 1,
                            })
                        }
                        options={typeOptions}
                    />
                    <FilterChips
                        ariaLabel="Filtrar por estado"
                        value={(filters.status ?? 'all') as StatusFilter}
                        onChange={(value) =>
                            visit({
                                status:
                                    value === 'all'
                                        ? null
                                        : (value as 'draft' | 'completed'),
                                page: 1,
                            })
                        }
                        options={statusOptions}
                    />
                </DataToolbar>
            }
            footer={
                <DataPagination
                    meta={asPaginated(checklists, '/inspecciones')}
                    onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
                    preservedQuery={{
                        search: filters.search || undefined,
                        per_page: filters.per_page,
                        sort: filters.sort,
                        direction: filters.direction,
                        template_type: filters.template_type ?? undefined,
                        status: filters.status ?? undefined,
                    }}
                />
            }
            emptyState={
                <EmptyState
                    icon={ClipboardCheck}
                    title={
                        hasFilters
                            ? 'Sin resultados'
                            : 'Aún no hay inspecciones'
                    }
                    description={
                        hasFilters
                            ? 'Prueba con otro filtro o limpia la búsqueda.'
                            : 'Crea una inspección eligiendo la fecha y una unidad.'
                    }
                />
            }
        />
    );
}
