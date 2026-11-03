import {
    Camera,
    ChartPie,
    ChevronDown,
    ChevronsDownUp,
    ChevronsUpDown,
    Pencil,
    Trash2,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { isBrowserOnline } from '@/lib/offline/ids';
import { asPaginated } from '@/lib/paginated';
import { cn } from '@/lib/utils';
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

function CheckTypeBadge({
    value,
    label,
}: {
    value: string;
    label: string;
}) {
    const isExpiry = value === 'expiry';

    return (
        <span
            className={cn(
                'inline-flex max-w-full items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset',
                isExpiry
                    ? 'bg-sky-50 text-sky-800 ring-sky-200'
                    : 'bg-amber-50 text-amber-900 ring-amber-200',
            )}
            title={label}
        >
            {isExpiry ? 'Vencimiento' : 'Observación'}
        </span>
    );
}

function WeightCell({ weight, inactive }: { weight: number; inactive?: boolean }) {
    const clamped = Math.max(0, Math.min(weight, 100));

    return (
        <div
            className={cn(
                'ml-auto flex w-[4.75rem] flex-col items-end gap-1',
                inactive && 'opacity-50',
            )}
        >
            <span className="text-xs font-semibold tabular-nums text-brand-800">
                {weight.toFixed(2)}%
            </span>
            <span
                className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                aria-hidden
            >
                <span
                    className="block h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-out motion-reduce:transition-none"
                    style={{ width: `${clamped}%` }}
                />
            </span>
        </div>
    );
}

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
    const parentIds = useMemo(
        () =>
            items.data
                .filter((item) => (childrenByParent.get(String(item.id)) ?? 0) > 0)
                .map((item) => String(item.id)),
        [childrenByParent, items.data],
    );
    const allExpanded =
        parentIds.length > 0 && parentIds.every((id) => openParents.has(id));
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

    const toggleAllParents = () => {
        setOpenParents((current) => {
            if (parentIds.every((id) => current.has(id))) {
                return new Set();
            }

            return new Set(parentIds);
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
                className: 'w-[7.5rem]',
                cell: (item) => {
                    const childCount = childrenByParent.get(String(item.id)) ?? 0;
                    const expanded = openParents.has(String(item.id));

                    if (item.parent_id) {
                        return (
                            <div className="flex items-center gap-2 pl-3">
                                <span
                                    className="flex h-5 w-3 items-end"
                                    aria-hidden
                                >
                                    <span className="h-3 w-full rounded-bl-md border-b border-l border-slate-300" />
                                </span>
                                <span className="font-mono text-xs font-medium tabular-nums text-brand-500">
                                    {item.item_number}
                                </span>
                            </div>
                        );
                    }

                    if (childCount === 0) {
                        return (
                            <span className="font-mono text-sm font-semibold tabular-nums text-brand-800">
                                {item.item_number}
                            </span>
                        );
                    }

                    return (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => toggleParent(item.id)}
                                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-800 shadow-sm transition hover:border-brand-500/35 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
                                aria-expanded={expanded}
                                aria-label={
                                    expanded
                                        ? `Contraer ${item.item_number}`
                                        : `Expandir ${item.item_number}`
                                }
                            >
                                <ChevronDown
                                    className={cn(
                                        'size-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none',
                                        expanded ? 'rotate-0' : '-rotate-90',
                                    )}
                                    strokeWidth={2.5}
                                />
                            </button>
                            <span className="font-mono text-sm font-semibold tabular-nums text-brand-800">
                                {item.item_number}
                            </span>
                            <span
                                className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-brand-500"
                                title={`${childCount} subítems`}
                            >
                                {childCount}
                            </span>
                        </div>
                    );
                },
            },
            {
                key: 'label',
                header: 'Exigencia',
                cell: (item) => (
                    <div
                        className={cn(
                            'flex min-w-0 flex-col gap-1',
                            !item.is_active && 'opacity-60',
                        )}
                    >
                        <span
                            className={cn(
                                'truncate text-sm text-brand-800',
                                item.parent_id
                                    ? 'font-medium'
                                    : 'font-semibold',
                            )}
                        >
                            {item.label}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {!item.is_active ? (
                                <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 ring-inset">
                                    Inactivo
                                </span>
                            ) : null}
                            {item.pending_sync ? (
                                <StatBadge
                                    label="En dispositivo"
                                    value=""
                                    variant="warning"
                                />
                            ) : null}
                        </div>
                    </div>
                ),
            },
            {
                key: 'template_type',
                header: 'Plantilla',
                cell: (item) => (
                    <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-600 uppercase ring-1 ring-slate-200/80 ring-inset">
                        {templateLabel(item.template_type)}
                    </span>
                ),
            },
            {
                key: 'allows_photo',
                header: 'Foto',
                cell: (item) =>
                    item.allows_photo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset">
                            <Camera className="size-3" strokeWidth={2.5} />
                            Sí
                        </span>
                    ) : (
                        <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/80 ring-inset">
                            No
                        </span>
                    ),
            },
            {
                key: 'check_type',
                header: 'Tipo check',
                cell: (item) => (
                    <CheckTypeBadge
                        value={item.check_type}
                        label={typeLabel(item.check_type)}
                    />
                ),
            },
            {
                key: 'weight',
                header: 'Peso %',
                align: 'right',
                cell: (item) => (
                    <WeightCell
                        weight={Number(item.weight)}
                        inactive={!item.is_active}
                    />
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
            className="rounded-none border-0 bg-transparent shadow-none"
            columns={columns}
            data={visibleItems}
            rowKey={(item) => item.id}
            getRowClassName={(item) =>
                cn(
                    item.parent_id && 'bg-slate-50/80',
                    !item.parent_id &&
                        (childrenByParent.get(String(item.id)) ?? 0) > 0 &&
                        'bg-white',
                    !item.is_active && 'opacity-70',
                )
            }
            ariaLiveMessage={`${items.total} ítems Pareto encontrados`}
            toolbar={
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar exigencia o número..."
                    className="gap-2"
                >
                    <div className="flex w-full flex-wrap items-center gap-2">
                        <FilterChips
                            ariaLabel="Filtrar por plantilla"
                            value={filters.template_type}
                            onChange={(template_type) =>
                                visit({ template_type, page: 1 })
                            }
                            options={typeOptions}
                        />
                        {parentIds.length > 0 && !filters.search ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={toggleAllParents}
                                className="ml-auto cursor-pointer gap-1.5 rounded-xl border-slate-200 text-brand-800 hover:bg-slate-50"
                            >
                                {allExpanded ? (
                                    <ChevronsDownUp className="size-3.5" />
                                ) : (
                                    <ChevronsUpDown className="size-3.5" />
                                )}
                                {allExpanded ? 'Contraer todo' : 'Expandir todo'}
                            </Button>
                        ) : null}
                    </div>
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
