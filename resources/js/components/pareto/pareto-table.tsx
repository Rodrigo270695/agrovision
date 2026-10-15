import { ChartPie, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback, useMemo, useState } from 'react';
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
import { isBrowserOnline } from '@/lib/offline/ids';
import { asPaginated } from '@/lib/paginated';
import { toast } from 'sonner';

export type ParetoTemplateOption = {
    id?: number;
    value: string;
    label: string;
    deletable?: boolean;
};

export type ParetoItem = {
    id: number | string;
    pending_sync?: boolean;
    template_type: string;
    parent_id?: number | null;
    item_number: string;
    label: string;
    sort_order: number;
    check_type: string;
    weight: number | string;
    is_active: boolean;
    allows_photo: boolean;
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
    template_type: string;
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
    templates: ParetoTemplateOption[];
    checkTypeOptions: { value: string; label: string }[];
    onEdit: (item: ParetoItem) => void;
    onDelete: (item: ParetoItem) => void;
};

export function ParetoTable({
    items,
    filters,
    templates,
    checkTypeOptions,
    onEdit,
    onDelete,
}: Props) {
    const { can } = useCan();
    const canUpdate = can('pareto.update');
    const canDelete = can('pareto.delete');
    const [openParents, setOpenParents] = useState<Set<string>>(new Set());
    const childrenByParent = useMemo(() => {
        const map = new Map<string, number>();

        for (const item of items.data) {
            if (item.parent_id == null) {
                continue;
            }

            const key = String(item.parent_id);
            map.set(key, (map.get(key) ?? 0) + 1);
        }

        return map;
    }, [items.data]);
    const visibleItems = useMemo(() => {
        if (filters.search) {
            return items.data;
        }

        return items.data.filter((item) => {
            if (item.parent_id == null) {
                return true;
            }

            const parentKey = String(item.parent_id);

            if (!items.data.some((row) => String(row.id) === parentKey)) {
                return true;
            }

            return openParents.has(parentKey);
        });
    }, [filters.search, items.data, openParents]);

    const toggleParent = (id: number | string) => {
        const key = String(id);
        setOpenParents((current) => {
            const next = new Set(current);

            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }

            return next;
        });
    };

    const visit = useCallback(
        (params: Partial<ParetoFilters> & { page?: number }) => {
            if (!isBrowserOnline()) {
                toast.info(
                    'Sin conexión. Los filtros se habilitan al reconectar.',
                );

                return;
            }

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

    const templateLabel = (value: string) =>
        templates.find((item) => item.value === value)?.label ??
        value.toUpperCase();

    const chipTones = ['info', 'success', 'warning', 'danger'] as const;
    const typeOptions: readonly FilterChip<string>[] = [
        { value: 'all', label: 'Todas', tone: 'default' },
        ...(templates.length > 0
            ? templates
            : [
                  { value: 'tdp', label: 'TDP' },
                  { value: 'tdc', label: 'TDC' },
              ]
        ).map((template, index) => ({
            value: template.value,
            label: template.label,
            tone: chipTones[index % chipTones.length],
        })),
    ];

    const columns = useMemo<DataTableColumn<ParetoItem>[]>(
        () => [
            {
                key: 'item_number',
                header: 'N°',
                cell: (item) => {
                    const childCount = childrenByParent.get(String(item.id)) ?? 0;
                    const expanded = openParents.has(String(item.id));

                    if (item.parent_id) {
                        return (
                            <span className="ml-6 border-l-2 border-[#4a90e2] pl-2 font-mono text-xs text-foreground">
                                {item.item_number}
                            </span>
                        );
                    }

                    if (childCount === 0) {
                        return (
                            <span className="font-mono text-xs font-semibold text-foreground">
                                {item.item_number}
                            </span>
                        );
                    }

                    return (
                        <button
                            type="button"
                            onClick={() => toggleParent(item.id)}
                            className="inline-flex cursor-pointer items-center gap-1 font-mono text-xs font-semibold text-foreground"
                            aria-expanded={expanded}
                        >
                            <ChevronDown
                                className={
                                    expanded
                                        ? 'size-3.5 text-[#2e5a9e]'
                                        : 'size-3.5 -rotate-90 text-[#6b8ead]'
                                }
                            />
                            {item.item_number}
                            <span className="font-sans text-[10px] font-medium text-[#6b8ead]">
                                {childCount}
                            </span>
                        </button>
                    );
                },
            },
            {
                key: 'label',
                header: 'Exigencia',
                cell: (item) => (
                    <span className="flex items-center gap-2 text-sm text-foreground">
                        {item.label}
                        {item.pending_sync ? (
                            <StatBadge
                                label="En dispositivo"
                                value=""
                                variant="warning"
                            />
                        ) : null}
                    </span>
                ),
            },
            {
                key: 'template_type',
                header: 'Plantilla',
                cell: (item) => (
                    <span className="text-xs text-muted-foreground">
                        {templateLabel(item.template_type)}
                    </span>
                ),
            },
            {
                key: 'allows_photo',
                header: 'Foto',
                cell: (item) => (
                    <span
                        className={
                            item.allows_photo
                                ? 'text-xs font-medium text-[#1a7f4b]'
                                : 'text-xs text-[#6b8ead]'
                        }
                    >
                        {item.allows_photo ? 'Sí' : 'No'}
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
        [
            canDelete,
            canUpdate,
            checkTypeOptions,
            childrenByParent,
            onDelete,
            onEdit,
            openParents,
            templates,
        ],
    );

    const hasFilters =
        Boolean(filters.search) || filters.template_type !== 'all';

    return (
        <DataTable
            columns={columns}
            data={visibleItems}
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
