import { CalendarRange, Pencil, Trash2 } from 'lucide-react';
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
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { toast } from 'sonner';
import { useCan } from '@/hooks/use-can';
import { isBrowserOnline } from '@/lib/offline/ids';
import { asPaginated } from '@/lib/paginated';

export type PeriodItem = {
    id: number | string;
    pending_sync?: boolean;
    name: string;
    date: string;
    status: 'active' | 'inactive' | string;
    units_count?: number;
    created_at?: string | null;
};

export type PeriodsPagination = {
    data: PeriodItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type PeriodsFilters = {
    search: string;
    sort: 'name' | 'date' | 'status' | 'units_count' | 'created_at';
    direction: 'asc' | 'desc';
    per_page: number;
};

type Props = {
    periods: PeriodsPagination;
    filters: PeriodsFilters;
    onEdit: (period: PeriodItem) => void;
    onDelete: (period: PeriodItem) => void;
};

type SortKey = PeriodsFilters['sort'];

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

function PeriodActions({
    period,
    onEdit,
    onDelete,
}: {
    period: PeriodItem;
    onEdit: (period: PeriodItem) => void;
    onDelete: (period: PeriodItem) => void;
}) {
    const { can } = useCan();

    return (
        <RowActionsMenu
            label={`Acciones de ${period.name}`}
            items={[
                can('periods.update')
                    ? {
                          key: 'edit',
                          label: 'Editar',
                          icon: Pencil,
                          onSelect: () => onEdit(period),
                      }
                    : null,
                can('periods.delete')
                    ? {
                          key: 'delete',
                          label: 'Eliminar',
                          icon: Trash2,
                          tone: 'danger' as const,
                          separatorBefore: true,
                          onSelect: () => onDelete(period),
                      }
                    : null,
            ].filter((item): item is NonNullable<typeof item> => Boolean(item))}
        />
    );
}

export function PeriodsTable({ periods, filters, onEdit, onDelete }: Props) {
    const visit = useCallback(
        (params: Partial<PeriodsFilters> & { page?: number }) => {
            if (!isBrowserOnline()) {
                toast.info('Sin conexión. Los filtros se habilitan al reconectar.');

                return;
            }

            router.get(
                '/periodos',
                {
                    search: params.search ?? filters.search,
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

    const columns = useMemo<DataTableColumn<PeriodItem>[]>(
        () => [
            {
                key: 'name',
                header: 'Nombre',
                sortable: true,
                cell: (period) => (
                    <span className="text-sm font-semibold text-foreground">
                        {period.name}
                    </span>
                ),
            },
            {
                key: 'date',
                header: 'Fecha',
                sortable: true,
                cell: (period) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDate(period.date)}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Estado',
                sortable: true,
                cell: (period) =>
                    period.pending_sync ? (
                        <StatBadge label="En dispositivo" value="" variant="warning" />
                    ) : period.status === 'active' ? (
                        <StatBadge label="Activo" value="" variant="success" />
                    ) : (
                        <StatBadge label="Inactivo" value="" variant="muted" />
                    ),
            },
            {
                key: 'units_count',
                header: 'Unidades',
                sortable: true,
                cell: (period) => (
                    <span className="text-xs text-muted-foreground">
                        {period.units_count ?? 0}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                className: 'w-12',
                cell: (period) => (
                    <div className="flex justify-end">
                        <PeriodActions
                            period={period}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    </div>
                ),
            },
        ],
        [onDelete, onEdit],
    );

    return (
        <DataTable
            columns={columns}
            data={periods.data}
            rowKey={(period) => period.id}
            sort={sort}
            onSortChange={(next) => {
                if (!next) {
                    visit({ sort: 'name', direction: 'asc', page: 1 });
                    return;
                }

                visit({
                    sort: next.key as SortKey,
                    direction: next.direction,
                    page: 1,
                });
            }}
            ariaLiveMessage={`${periods.total} periodos encontrados`}
            toolbar={
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar por nombre o estado..."
                />
            }
            footer={
                <DataPagination
                    meta={asPaginated(periods, '/periodos')}
                    onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
                    preservedQuery={{
                        search: filters.search || undefined,
                        per_page: filters.per_page,
                        sort: filters.sort,
                        direction: filters.direction,
                    }}
                />
            }
            emptyState={
                <EmptyState
                    icon={CalendarRange}
                    title={
                        filters.search
                            ? 'Sin resultados'
                            : 'Aún no hay periodos'
                    }
                    description={
                        filters.search
                            ? 'Prueba con otro término o limpia la búsqueda.'
                            : 'Crea el primer periodo operativo.'
                    }
                />
            }
        />
    );
}
