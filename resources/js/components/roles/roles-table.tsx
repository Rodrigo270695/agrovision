import { KeyRound, Pencil, Shield, Trash2 } from 'lucide-react';
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
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { useCan } from '@/hooks/use-can';
import { asPaginated } from '@/lib/paginated';

export type RolePermissionRef = {
    id: number;
    name: string;
};

export type RoleItem = {
    id: number;
    name: string;
    permissions_count: number;
    permissions?: RolePermissionRef[];
    created_at?: string | null;
    is_system?: boolean;
    is_locked?: boolean;
    permissions_locked?: boolean;
};

export type RolesPagination = {
    data: RoleItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type RolesFilters = {
    search: string;
    sort: 'name' | 'permissions_count' | 'created_at';
    direction: 'asc' | 'desc';
    per_page: number;
};

type Props = {
    roles: RolesPagination;
    filters: RolesFilters;
    onEdit: (role: RoleItem) => void;
    onDelete: (role: RoleItem) => void;
    onAssignPermissions: (role: RoleItem) => void;
};

type SortKey = RolesFilters['sort'];

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

function RoleActions({
    role,
    onEdit,
    onDelete,
    onAssignPermissions,
}: {
    role: RoleItem;
    onEdit: (role: RoleItem) => void;
    onDelete: (role: RoleItem) => void;
    onAssignPermissions: (role: RoleItem) => void;
}) {
    const { can } = useCan();
    const isLocked =
        role.is_locked ?? role.name.toLowerCase() === 'superadmin';
    const permissionsLocked =
        role.permissions_locked ?? role.name.toLowerCase() === 'superadmin';
    const canAssign = can('roles.assign') && !permissionsLocked;
    const canUpdate = can('roles.update') && !isLocked;
    const canDelete = can('roles.delete') && !isLocked;

    if (permissionsLocked && isLocked) {
        return (
            <span
                className="rounded-md bg-[#eef1f5] px-2 py-0.5 text-[10px] font-medium text-[#64748b]"
                title="Rol protegido del sistema"
            >
                Protegido
            </span>
        );
    }

    return (
        <RowActionsMenu
            label={`Acciones de ${role.name}`}
            items={[
                canAssign
                    ? {
                          key: 'perms',
                          label: 'Asignar permisos',
                          icon: KeyRound,
                          onSelect: () => onAssignPermissions(role),
                      }
                    : null,
                canUpdate
                    ? {
                          key: 'edit',
                          label: 'Editar',
                          icon: Pencil,
                          onSelect: () => onEdit(role),
                      }
                    : null,
                canDelete
                    ? {
                          key: 'delete',
                          label: 'Eliminar',
                          icon: Trash2,
                          tone: 'danger' as const,
                          separatorBefore: true,
                          onSelect: () => onDelete(role),
                      }
                    : null,
            ].filter((item): item is NonNullable<typeof item> => Boolean(item))}
        />
    );
}

export function RolesTable({
    roles,
    filters,
    onEdit,
    onDelete,
    onAssignPermissions,
}: Props) {
    const visit = useCallback(
        (params: Partial<RolesFilters> & { page?: number }) => {
            router.get(
                '/roles',
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

    const columns = useMemo<DataTableColumn<RoleItem>[]>(
        () => [
            {
                key: 'name',
                header: 'Nombre',
                sortable: true,
                cell: (role) => (
                    <span className="text-sm font-semibold text-foreground">
                        {role.name}
                    </span>
                ),
            },
            {
                key: 'permissions_count',
                header: 'Permisos',
                sortable: true,
                cell: (role) => (
                    <span className="text-xs text-muted-foreground">
                        {role.permissions_count}
                    </span>
                ),
            },
            {
                key: 'created_at',
                header: 'Creado',
                sortable: true,
                cell: (role) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDate(role.created_at)}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                className: 'w-12',
                cell: (role) => (
                    <div className="flex justify-end">
                        <RoleActions
                            role={role}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAssignPermissions={onAssignPermissions}
                        />
                    </div>
                ),
            },
        ],
        [onAssignPermissions, onDelete, onEdit],
    );

    return (
        <DataTable
            columns={columns}
            data={roles.data}
            rowKey={(role) => role.id}
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
            ariaLiveMessage={`${roles.total} roles encontrados`}
            toolbar={
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar por nombre..."
                />
            }
            footer={
                <DataPagination
                    meta={asPaginated(roles, '/roles')}
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
                    icon={Shield}
                    title={
                        filters.search ? 'Sin resultados' : 'Aún no hay roles'
                    }
                    description={
                        filters.search
                            ? 'Prueba con otro término o limpia la búsqueda.'
                            : 'Crea el primer rol para asignar permisos.'
                    }
                />
            }
        />
    );
}
