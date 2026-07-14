import { KeyRound, Pencil, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback } from 'react';
import { TablePagination } from '@/components/shared/table-pagination';
import { TableSearchFilter } from '@/components/shared/table-search-filter';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';

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

function SortIcon({
    active,
    direction,
}: {
    active: boolean;
    direction: 'asc' | 'desc';
}) {
    if (!active) {
        return <span className="ml-1 opacity-60">↕</span>;
    }

    return (
        <span className="ml-1" aria-hidden>
            {direction === 'asc' ? '↑' : '↓'}
        </span>
    );
}

function RoleActions({
    role,
    onEdit,
    onDelete,
    onAssignPermissions,
    className,
}: {
    role: RoleItem;
    onEdit: (role: RoleItem) => void;
    onDelete: (role: RoleItem) => void;
    onAssignPermissions: (role: RoleItem) => void;
    className?: string;
}) {
    const { can } = useCan();
    const isProtected = role.name.toLowerCase() === 'superadmin';
    const canAssign = can('roles.assign');
    const canUpdate = can('roles.update');
    const canDelete = can('roles.delete');

    if (isProtected) {
        return (
            <span
                className={cn(
                    'rounded-md bg-[#eef1f5] px-2 py-0.5 text-[10px] font-medium text-[#64748b]',
                    className,
                )}
                title="Rol protegido del sistema"
            >
                Protegido
            </span>
        );
    }

    if (!canAssign && !canUpdate && !canDelete) {
        return null;
    }

    return (
        <div className={cn('flex items-center gap-0.5', className)}>
            {canAssign ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onAssignPermissions(role)}
                    className="size-7 cursor-pointer text-[#6d28d9] hover:bg-[#efe8fb] hover:text-[#5b21b6]"
                    aria-label={`Permisos de ${role.name}`}
                >
                    <KeyRound className="size-3.5" />
                </Button>
            ) : null}
            {canUpdate ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(role)}
                    className="size-7 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                    aria-label={`Editar ${role.name}`}
                >
                    <Pencil className="size-3.5" />
                </Button>
            ) : null}
            {canDelete ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(role)}
                    className="size-7 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Eliminar ${role.name}`}
                >
                    <Trash2 className="size-3.5" />
                </Button>
            ) : null}
        </div>
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

    const toggleSort = (column: SortKey) => {
        if (filters.sort === column) {
            visit({
                sort: column,
                direction: filters.direction === 'asc' ? 'desc' : 'asc',
                page: 1,
            });
            return;
        }

        visit({ sort: column, direction: 'asc', page: 1 });
    };

    const headers: Array<{
        key: SortKey;
        label: string;
        sortable: boolean;
        className?: string;
    }> = [
        { key: 'name', label: 'Nombre', sortable: true },
        {
            key: 'permissions_count',
            label: 'Permisos',
            sortable: true,
            className: 'text-center',
        },
        {
            key: 'created_at',
            label: 'Creado',
            sortable: true,
            className: 'text-center',
        },
    ];

    return (
        <div className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
            <div className="border-b border-[#e2eaf3] px-3 py-2.5 sm:px-4">
                <TableSearchFilter
                    value={filters.search}
                    onChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar por nombre..."
                />
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-xs">
                    <thead className="bg-[#1a2b4c] text-white">
                        <tr>
                            {headers.map((header) => (
                                <th
                                    key={header.key}
                                    className={cn(
                                        'px-3 py-2 text-xs font-semibold',
                                        header.className,
                                    )}
                                >
                                    {header.sortable ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleSort(header.key)
                                            }
                                            className={cn(
                                                'inline-flex cursor-pointer items-center font-semibold transition-opacity hover:opacity-90',
                                                header.className?.includes(
                                                    'text-center',
                                                ) && 'w-full justify-center',
                                            )}
                                        >
                                            {header.label}
                                            <SortIcon
                                                active={
                                                    filters.sort === header.key
                                                }
                                                direction={filters.direction}
                                            />
                                        </button>
                                    ) : (
                                        header.label
                                    )}
                                </th>
                            ))}
                            <th
                                className="w-24 px-3 py-2"
                                aria-label="Acciones"
                            />
                        </tr>
                    </thead>
                    <tbody>
                        {roles.data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-3 py-10 text-center text-[#6b8ead]"
                                >
                                    No se encontraron roles.
                                </td>
                            </tr>
                        ) : (
                            roles.data.map((role, index) => (
                                <tr
                                    key={role.id}
                                    className={cn(
                                        'border-b border-[#eef2f7] last:border-0',
                                        index % 2 === 1 && 'bg-[#f8fafc]',
                                    )}
                                >
                                    <td className="px-3 py-1.5 text-xs font-medium text-[#1a2b4c]">
                                        {role.name}
                                    </td>
                                    <td className="px-3 py-1.5 text-center text-xs text-[#5a7390]">
                                        {role.permissions_count}
                                    </td>
                                    <td className="px-3 py-1.5 text-center text-xs text-[#5a7390]">
                                        {formatDate(role.created_at)}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <RoleActions
                                            role={role}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onAssignPermissions={
                                                onAssignPermissions
                                            }
                                            className="justify-end"
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2.5 p-3 md:hidden">
                {roles.data.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#6b8ead]">
                        No se encontraron roles.
                    </p>
                ) : (
                    roles.data.map((role) => (
                        <article
                            key={role.id}
                            className="rounded-xl border border-[#e2eaf3] bg-white p-3.5 shadow-sm"
                        >
                            <h3 className="mb-2 break-words text-sm font-semibold text-[#1a2b4c]">
                                {role.name}
                            </h3>
                            <dl className="mb-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Permisos
                                    </dt>
                                    <dd className="text-xs font-medium text-[#1a2b4c]">
                                        {role.permissions_count}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Creado
                                    </dt>
                                    <dd className="text-xs font-medium text-[#1a2b4c]">
                                        {formatDate(role.created_at)}
                                    </dd>
                                </div>
                            </dl>
                            <div className="flex justify-end border-t border-[#eef2f7] pt-2">
                                <RoleActions
                                    role={role}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onAssignPermissions={onAssignPermissions}
                                />
                            </div>
                        </article>
                    ))
                )}
            </div>

            <TablePagination
                meta={{
                    from: roles.from,
                    to: roles.to,
                    total: roles.total,
                    current_page: roles.current_page,
                    last_page: roles.last_page,
                    per_page: roles.per_page,
                }}
                onPageChange={(page) => visit({ page })}
                onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
            />
        </div>
    );
}
