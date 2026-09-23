import { MapPin, Pencil, Trash2 } from 'lucide-react';
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

export type PlaceItem = {
    id: number | string;
    name: string;
    description?: string | null;
    status: string;
    users_count?: number;
    alcohol_tests_count?: number;
};

export type PlacesPagination = {
    data: PlaceItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type PlacesFilters = {
    search: string;
    sort: 'name' | 'status' | 'created_at';
    direction: 'asc' | 'desc';
    per_page: number;
};

type Props = {
    places: PlacesPagination;
    filters: PlacesFilters;
    onEdit: (place: PlaceItem) => void;
    onDelete: (place: PlaceItem) => void;
};

type SortKey = PlacesFilters['sort'];

export function PlacesTable({ places, filters, onEdit, onDelete }: Props) {
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

    const columns = useMemo<DataTableColumn<PlaceItem>[]>(
        () => [
            {
                key: 'name',
                header: 'Nombre',
                sortable: true,
                cell: (place) => (
                    <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-sm font-semibold text-foreground">
                            {place.name}
                        </span>
                        {place.description ? (
                            <span className="truncate text-xs text-muted-foreground">
                                {place.description}
                            </span>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'status',
                header: 'Estado',
                sortable: true,
                cell: (place) =>
                    place.status === 'active' ? (
                        <StatBadge label="Activo" value="" variant="success" />
                    ) : (
                        <StatBadge label="Inactivo" value="" variant="muted" />
                    ),
            },
            {
                key: 'users_count',
                header: 'Usuarios',
                cell: (place) => (
                    <span className="text-xs text-muted-foreground">
                        {place.users_count ?? 0}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                className: 'w-12',
                cell: (place) => (
                    <div className="flex justify-end">
                        <RowActionsMenu
                            label={`Acciones de ${place.name}`}
                            items={[
                                can('places.update')
                                    ? {
                                          key: 'edit',
                                          label: 'Editar',
                                          icon: Pencil,
                                          onSelect: () => onEdit(place),
                                      }
                                    : null,
                                can('places.delete')
                                    ? {
                                          key: 'delete',
                                          label: 'Eliminar',
                                          icon: Trash2,
                                          tone: 'danger' as const,
                                          separatorBefore: true,
                                          onSelect: () => onDelete(place),
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
            data={places.data}
            rowKey={(place) => place.id}
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
            ariaLiveMessage={`${places.total} lugares encontrados`}
            toolbar={
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar por nombre o descripción..."
                />
            }
            footer={
                <DataPagination
                    meta={asPaginated(places, '/lugares')}
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
                    icon={MapPin}
                    title={
                        filters.search ? 'Sin resultados' : 'Aún no hay lugares'
                    }
                    description={
                        filters.search
                            ? 'Prueba con otro término o limpia la búsqueda.'
                            : 'Crea el primer lugar para asignarlo a usuarios y tests.'
                    }
                />
            }
        />
    );
}
