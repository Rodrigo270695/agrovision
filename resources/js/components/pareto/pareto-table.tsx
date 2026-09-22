import { ChartPie, Pencil, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    FilterChips,
    StatBadge,
    type DataTableColumn,
    type FilterChip,
} from '@/components/data-page';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { useCan } from '@/hooks/use-can';
import { asPaginated } from '@/lib/paginated';

export type ParetoItem = {
    id: number;
    template_type: 'tdp' | 'tdc';
    parent_id?: number | null;
    item_number: string;
    label: string;
    sort_order: number;
    check_type: string;
    weight: number | string;
    is_active: boolean;
    parent?: { id: number; item_number: string; label: string } | null;
};

export type ParentOption = {
    id: number;
    item_number: string;
    label: string;
    template_type: string;
};

export type ParetoPagination = {
    data: ParetoItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type ParetoFilters = {
    search: string;
    template_type: 'tdp' | 'tdc' | 'all';
    sort: 'sort_order' | 'item_number' | 'label' | 'weight' | 'created_at';
    direction: 'asc' | 'desc';
    per_page: number;
};

export type ParetoStats = {
    total: number;
    weight_total: number;
    weight_ok: boolean;
    observation: number;
    expiry: number;
};

type Props = {
    items: ParetoPagination;
    filters: ParetoFilters;
    checkTypeOptions: { value: string; label: string }[];
    onEdit: (item: ParetoItem) => void;
    onDelete: (item: ParetoItem) => void;
};

export function ParetoTable({
    items,
    filters,
    checkTypeOptions,
    onEdit,
    onDelete,
}: Props) {
    const { can } = useCan();
    const canUpdate = can('pareto.update');
    const canDelete = can('pareto.delete');

    const visit = useCallback(
        (params: Partial<ParetoFilters> & { page?: number }) => {
            router.get(
                '/pareto',
                {
                    search: params.search ?? filters.search,
                    template_type: params.template_type ?? filters.template_type,
                    sort: params.sort ?? filters.sort,
                    direction: params.direction ?? filters.direction,
                    per_page: params.per_page ?? filters.per_page,
                    page: params.page ?? 1,
                },
                { preserveState: true, replace: true },
            );
        },
        [filters],
    );

    const typeLabel = (value: string) =>
        checkTypeOptions.find((item) => item.value === value)?.label ?? value;

    const typeOptions: readonly FilterChip<ParetoFilters['template_type']>[] = [
        { value: 'all', label: 'Todas', tone: 'default' },
        { value: 'tdp', label: 'TDP', tone: 'info' },
        { value: 'tdc', label: 'TDC', tone: 'primary' },
    ];

    const columns = useMemo<DataTableColumn<ParetoItem>[]>(
        () => [
            {
                key: 'item_number',
                header: 'N°',
                cell: (item) =>
                    item.parent_id ? (
                        <span className="ml-3 border-l-2 border-[#4a90e2] pl-2 font-mono text-xs text-foreground">
                            {item.item_number}
                        </span>
                    ) : (
                        <span className="font-mono text-xs font-semibold text-foreground">
                            {item.item_number}
                        </span>
                    ),
            },
            {
                key: 'label',
                header: 'Exigencia',
                cell: (item) => (
                    <span className="text-sm text-foreground">{item.label}</span>
                ),
            },
            {
                key: 'template_type',
                header: 'Plantilla',
                cell: (item) => (
                    <span className="text-xs uppercase text-muted-foreground">
                        {item.template_type}
                    </span>
                ),
            },
            {
                key: 'check_type',
                header: 'Tipo check',
                cell: (item) => (
                    <StatBadge
                        label={typeLabel(item.check_type)}
                        value=""
                        variant={
                            item.check_type === 'expiry' ? 'info' : 'muted'
                        }
                    />
                ),
            },
            {
                key: 'weight',
                header: 'Peso %',
                align: 'right',
                cell: (item) => (
                    <span className="text-xs font-semibold text-foreground">
                        {Number(item.weight).toFixed(2)}%
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                className: 'w-12',
                cell: (item) => (
                    <div className="flex justify-end">
                        <RowActionsMenu
                            label={`Acciones de ${item.item_number}`}
                            items={[
                                canUpdate
                                    ? {
                                          key: 'edit',
                                          label: 'Editar',
                                          icon: Pencil,
                                          onSelect: () => onEdit(item),
                                      }
                                    : null,
                                canDelete
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
                ),
            },
        ],
        [canDelete, canUpdate, checkTypeOptions, onDelete, onEdit],
    );

    const hasFilters =
        Boolean(filters.search) || filters.template_type !== 'all';

    return (
        <DataTable
            columns={columns}
            data={items.data}
            rowKey={(item) => item.id}
            getRowClassName={(item) =>
                item.parent_id ? 'bg-[#f5f9fd]' : undefined
            }
            ariaLiveMessage={`${items.total} ítems Pareto encontrados`}
            toolbar={
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar exigencia o número..."
                >
                    <FilterChips
                        ariaLabel="Filtrar por plantilla"
                        value={filters.template_type}
                        onChange={(template_type) =>
                            visit({ template_type, page: 1 })
                        }
                        options={typeOptions}
                    />
                </DataToolbar>
            }
            footer={
                <DataPagination
                    meta={asPaginated(items, '/pareto')}
                    onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
                    preservedQuery={{
                        search: filters.search || undefined,
                        per_page: filters.per_page,
                        sort: filters.sort,
                        direction: filters.direction,
                        template_type:
                            filters.template_type !== 'all'
                                ? filters.template_type
                                : undefined,
                    }}
                />
            }
            emptyState={
                <EmptyState
                    icon={ChartPie}
                    title={hasFilters ? 'Sin resultados' : 'Aún no hay ítems'}
                    description={
                        hasFilters
                            ? 'Prueba con otro filtro o limpia la búsqueda.'
                            : 'Crea el primer ítem Pareto o ejecuta el seeder.'
                    }
                />
            }
        />
    );
}
