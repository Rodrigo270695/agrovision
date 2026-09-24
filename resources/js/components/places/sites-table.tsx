import { router } from '@inertiajs/react';
import { Building2, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    StatBadge,
} from '@/components/data-page';
import type { DataTableColumn, SortState } from '@/components/data-page';
import type { PlacesFilters, PlacesPagination } from '@/components/places/places-table';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { useCan } from '@/hooks/use-can';
import { isBrowserOnline } from '@/lib/offline/ids';
import { asPaginated } from '@/lib/paginated';

export type SiteItem = {
    id: number | string;
    name: string;
    description?: string | null;
    status: string;
    places_count?: number;
};

export type SitesPagination = Omit<PlacesPagination, 'data'> & {
    data: SiteItem[];
};

type Props = {
    sites: SitesPagination;
    filters: PlacesFilters;
    selectedId?: number | string | null;
    carry?: Record<string, string | number | undefined>;
    onSelect: (site: SiteItem) => void;
    onEdit: (site: SiteItem) => void;
    onDelete: (site: SiteItem) => void;
};

type SortKey = PlacesFilters['sort'];

export function SitesTable({
    sites,
    filters,
    selectedId = null,
    carry = {},
    onSelect,
    onEdit,
    onDelete,
}: Props) {
    const { can } = useCan();

    const visit = useCallback(
        (params: Partial<PlacesFilters> & { page?: number }) => {
            if (!isBrowserOnline()) {
                toast.info(
                    'Sin conexión. Los filtros se habilitan al reconectar.',
                );

                return;
            }

            router.get(
                '/lugares',
                {
                    ...carry,
                    sites_search: params.search ?? filters.search,
                    sites_sort: params.sort ?? filters.sort,
                    sites_direction: params.direction ?? filters.direction,
                    sites_per_page: params.per_page ?? filters.per_page,
                    sites_page: params.page ?? 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        },
        [carry, filters],
    );

    const sort: SortState | null = filters.sort
        ? { key: filters.sort, direction: filters.direction }
        : null;

    const columns = useMemo<DataTableColumn<SiteItem>[]>(
        () => [
            {
                key: 'name',
                header: 'Nombre',
                sortable: true,
                cell: (site) => (
                    <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-sm font-semibold text-foreground">
                            {site.name}
                        </span>
                        {site.description ? (
                            <span className="truncate text-xs text-muted-foreground">
                                {site.description}
                            </span>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'status',
                header: 'Estado',
                sortable: true,
                cell: (site) =>
                    site.status === 'active' ? (
                        <StatBadge label="Activo" value="" variant="success" />
                    ) : (
                        <StatBadge label="Inactivo" value="" variant="muted" />
                    ),
            },
            {
                key: 'places_count',
                header: 'Lugares',
                cell: (site) => (
                    <span className="text-xs text-muted-foreground">
                        {site.places_count ?? 0}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                className: 'w-12',
                cell: (site) => (
                    <div
                        className="flex justify-end"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <RowActionsMenu
                            label={`Acciones de ${site.name}`}
                            items={[
                                can('places.update')
                                    ? {
                                          key: 'edit',
                                          label: 'Editar',
                                          icon: Pencil,
                                          onSelect: () => onEdit(site),
                                      }
                                    : null,
                                can('places.delete')
                                    ? {
                                          key: 'delete',
                                          label: 'Eliminar',
                                          icon: Trash2,
                                          tone: 'danger' as const,
                                          separatorBefore: true,
                                          onSelect: () => onDelete(site),
                                      }
                                    : null,
                            ].filter(
                                (item): item is NonNullable<typeof item> =>
                                    Boolean(item),
                            )}
                        />
                    </div>
                ),
            },
        ],
        [can, onDelete, onEdit],
    );

    return (
        <DataTable
            columns={columns}
            data={sites.data}
            rowKey={(site) => site.id}
            sort={sort}
            onRowClick={onSelect}
            getRowClassName={(site) =>
                String(site.id) === String(selectedId ?? '')
                    ? 'bg-[#e8f1fb]'
                    : undefined
            }
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
            ariaLiveMessage={`${sites.total} sedes encontradas`}
            toolbar={
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar sede por nombre o descripción..."
                />
            }
            footer={
                <DataPagination
                    meta={asPaginated(sites, '/lugares')}
                    perPageSelectId="sites-per-page"
                    onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
                    preservedQuery={{
                        ...carry,
                        sites_search: filters.search || undefined,
                        sites_per_page: filters.per_page,
                        sites_sort: filters.sort,
                        sites_direction: filters.direction,
                    }}
                    pageQueryKey="sites_page"
                />
            }
            emptyState={
                <EmptyState
                    icon={Building2}
                    title={filters.search ? 'Sin resultados' : 'Aún no hay sedes'}
                    description={
                        filters.search
                            ? 'Prueba con otro término o limpia la búsqueda.'
                            : 'Crea la primera sede para poder registrar lugares.'
                    }
                />
            }
        />
    );
}
