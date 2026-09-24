import { Pencil, Shield, Trash2, Users } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    type DataTableColumn,
    type SortState,
} from '@/components/data-page';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { useCan } from '@/hooks/use-can';
import { asPaginated } from '@/lib/paginated';
import type { Auth } from '@/types';

export type UserRoleRef = {
    id: number;
    name: string;
};

export type UserItem = {
    id: number;
    name: string;
    email: string;
    document_type?: string | null;
    document_number?: string | null;
    phone?: string | null;
    roles_count: number;
    roles?: UserRoleRef[];
    place_id?: number | null;
    place?: {
        id: number;
        name: string;
        site?: { id: number; name: string } | null;
    } | null;
    places?: {
        id: number;
        name: string;
        site?: { id: number; name: string } | null;
    }[];
    created_at?: string | null;
};

export type UsersPagination = {
    data: UserItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type UsersFilters = {
    search: string;
    sort: 'name' | 'email' | 'roles_count' | 'created_at';
    direction: 'asc' | 'desc';
    per_page: number;
};

type Props = {
    users: UsersPagination;
    filters: UsersFilters;
    onEdit: (user: UserItem) => void;
    onDelete: (user: UserItem) => void;
    onAssignRoles: (user: UserItem) => void;
};

type SortKey = UsersFilters['sort'];

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

function UserActions({
    user,
    currentUserId,
    onEdit,
    onDelete,
    onAssignRoles,
}: {
    user: UserItem;
    currentUserId?: number;
    onEdit: (user: UserItem) => void;
    onDelete: (user: UserItem) => void;
    onAssignRoles: (user: UserItem) => void;
}) {
    const { can } = useCan();
    const isSelf = currentUserId === user.id;
    const canUpdate = can('users.update');
    const canDelete = can('users.delete') && !isSelf;

    return (
        <RowActionsMenu
            label={`Acciones de ${user.name}`}
            items={[
                canUpdate
                    ? {
                          key: 'roles',
                          label: 'Asignar roles',
                          icon: Shield,
                          onSelect: () => onAssignRoles(user),
                      }
                    : null,
                canUpdate
                    ? {
                          key: 'edit',
                          label: 'Editar',
                          icon: Pencil,
                          onSelect: () => onEdit(user),
                      }
                    : null,
                canDelete
                    ? {
                          key: 'delete',
                          label: 'Eliminar',
                          icon: Trash2,
                          tone: 'danger' as const,
                          separatorBefore: true,
                          onSelect: () => onDelete(user),
                      }
                    : null,
            ].filter((item): item is NonNullable<typeof item> => Boolean(item))}
        />
    );
}

export function UsersTable({
    users,
    filters,
    onEdit,
    onDelete,
    onAssignRoles,
}: Props) {
    const { auth } = usePage().props as { auth: Auth };
    const currentUserId = auth.user?.id;

    const visit = useCallback(
        (params: Partial<UsersFilters> & { page?: number }) => {
            router.get(
                '/usuarios',
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

    const columns = useMemo<DataTableColumn<UserItem>[]>(
        () => [
            {
                key: 'name',
                header: 'Nombre',
                sortable: true,
                cell: (user) => (
                    <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-sm font-semibold text-foreground">
                            {user.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                            {user.email}
                        </span>
                    </div>
                ),
            },
            {
                key: 'roles_count',
                header: 'Roles',
                sortable: true,
                cell: (user) => (
                    <span className="text-xs text-muted-foreground">
                        {user.roles_count}
                    </span>
                ),
            },
            {
                key: 'place',
                header: 'Lugar',
                cell: (user) => {
                    const assigned =
                        user.places && user.places.length > 0
                            ? user.places
                            : user.place
                              ? [user.place]
                              : [];
                    const grouped = new Map<string, string[]>();

                    assigned.forEach((place) => {
                        const site = place.site?.name?.trim() || '';
                        const current = grouped.get(site) ?? [];
                        current.push(place.name);
                        grouped.set(site, current);
                    });

                    const label =
                        grouped.size === 0
                            ? '—'
                            : [...grouped.entries()]
                                  .map(([site, names]) =>
                                      site
                                          ? `${site}: ${names.join(', ')}`
                                          : names.join(', '),
                                  )
                                  .join(' · ');

                    return (
                        <span
                            className="block max-w-48 truncate text-xs text-muted-foreground"
                            title={label}
                        >
                            {label}
                        </span>
                    );
                },
            },
            {
                key: 'document_number',
                header: 'Documento',
                cell: (user) => (
                    <span className="text-xs text-muted-foreground">
                        {user.document_number
                            ? `${(user.document_type ?? 'dni').toUpperCase()} ${user.document_number}`
                            : '—'}
                    </span>
                ),
            },
            {
                key: 'phone',
                header: 'Celular',
                cell: (user) => (
                    <span className="text-xs text-muted-foreground">
                        {user.phone || '—'}
                    </span>
                ),
            },
            {
                key: 'created_at',
                header: 'Creado',
                sortable: true,
                cell: (user) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDate(user.created_at)}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                className: 'w-12',
                cell: (user) => (
                    <div className="flex justify-end">
                        <UserActions
                            user={user}
                            currentUserId={currentUserId}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAssignRoles={onAssignRoles}
                        />
                    </div>
                ),
            },
        ],
        [currentUserId, onAssignRoles, onDelete, onEdit],
    );

    return (
        <DataTable
            columns={columns}
            data={users.data}
            rowKey={(user) => user.id}
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
            ariaLiveMessage={`${users.total} usuarios encontrados`}
            toolbar={
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar por nombre, correo, documento o celular..."
                />
            }
            footer={
                <DataPagination
                    meta={asPaginated(users, '/usuarios')}
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
                    icon={Users}
                    title={
                        filters.search
                            ? 'Sin resultados'
                            : 'Aún no hay usuarios'
                    }
                    description={
                        filters.search
                            ? 'Prueba con otro término o limpia la búsqueda.'
                            : 'Crea el primer usuario para asignarle roles.'
                    }
                />
            }
        />
    );
}
