import { Pencil, Shield, Trash2 } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import { TablePagination } from '@/components/shared/table-pagination';
import { TableSearchFilter } from '@/components/shared/table-search-filter';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';
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

function isProtectedUser(user: UserItem): boolean {
    return (
        user.roles?.some((role) => role.name.toLowerCase() === 'superadmin') ??
        false
    );
}

function UserActions({
    user,
    currentUserId,
    onEdit,
    onDelete,
    onAssignRoles,
    className,
}: {
    user: UserItem;
    currentUserId?: number;
    onEdit: (user: UserItem) => void;
    onDelete: (user: UserItem) => void;
    onAssignRoles: (user: UserItem) => void;
    className?: string;
}) {
    const { can } = useCan();
    const protectedUser = isProtectedUser(user);
    const isSelf = currentUserId === user.id;
    const canUpdate = can('users.update');
    const canDelete = can('users.delete') && !isSelf;

    if (protectedUser) {
        return (
            <span
                className={cn(
                    'rounded-md bg-[#eef1f5] px-2 py-0.5 text-[10px] font-medium text-[#64748b]',
                    className,
                )}
                title="Usuario protegido del sistema"
            >
                Protegido
            </span>
        );
    }

    if (!canUpdate && !canDelete) {
        return null;
    }

    return (
        <div className={cn('flex items-center gap-0.5', className)}>
            {canUpdate ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onAssignRoles(user)}
                    className="size-7 cursor-pointer text-[#6d28d9] hover:bg-[#efe8fb] hover:text-[#5b21b6]"
                    aria-label={`Roles de ${user.name}`}
                >
                    <Shield className="size-3.5" />
                </Button>
            ) : null}
            {canUpdate ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(user)}
                    className="size-7 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                    aria-label={`Editar ${user.name}`}
                >
                    <Pencil className="size-3.5" />
                </Button>
            ) : null}
            {canDelete ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(user)}
                    className="size-7 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Eliminar ${user.name}`}
                >
                    <Trash2 className="size-3.5" />
                </Button>
            ) : null}
        </div>
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
        { key: 'email', label: 'Correo', sortable: true },
        {
            key: 'roles_count',
            label: 'Roles',
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
                    placeholder="Buscar por nombre, correo, documento o celular..."
                />
            </div>

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
                            <th className="px-3 py-2 text-xs font-semibold">
                                Documento
                            </th>
                            <th className="px-3 py-2 text-xs font-semibold">
                                Celular
                            </th>
                            <th
                                className="w-24 px-3 py-2"
                                aria-label="Acciones"
                            />
                        </tr>
                    </thead>
                    <tbody>
                        {users.data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-3 py-10 text-center text-[#6b8ead]"
                                >
                                    No se encontraron usuarios.
                                </td>
                            </tr>
                        ) : (
                            users.data.map((user, index) => (
                                <tr
                                    key={user.id}
                                    className={cn(
                                        'border-b border-[#eef2f7] last:border-0',
                                        index % 2 === 1 && 'bg-[#f8fafc]',
                                    )}
                                >
                                    <td className="px-3 py-1.5 text-xs font-medium text-[#1a2b4c]">
                                        {user.name}
                                    </td>
                                    <td className="px-3 py-1.5 text-xs text-[#5a7390]">
                                        {user.email}
                                    </td>
                                    <td className="px-3 py-1.5 text-center text-xs text-[#5a7390]">
                                        {user.roles_count}
                                    </td>
                                    <td className="px-3 py-1.5 text-center text-xs text-[#5a7390]">
                                        {formatDate(user.created_at)}
                                    </td>
                                    <td className="px-3 py-1.5 text-xs text-[#5a7390]">
                                        {user.document_number
                                            ? `${(user.document_type ?? 'dni').toUpperCase()} ${user.document_number}`
                                            : '—'}
                                    </td>
                                    <td className="px-3 py-1.5 text-xs text-[#5a7390]">
                                        {user.phone || '—'}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <UserActions
                                            user={user}
                                            currentUserId={currentUserId}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onAssignRoles={onAssignRoles}
                                            className="justify-end"
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="space-y-2.5 p-3 md:hidden">
                {users.data.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#6b8ead]">
                        No se encontraron usuarios.
                    </p>
                ) : (
                    users.data.map((user) => (
                        <article
                            key={user.id}
                            className="rounded-xl border border-[#e2eaf3] bg-white p-3.5 shadow-sm"
                        >
                            <h3 className="mb-0.5 break-words text-sm font-semibold text-[#1a2b4c]">
                                {user.name}
                            </h3>
                            <p className="mb-2 break-all text-xs text-[#5a7390]">
                                {user.email}
                            </p>
                            <p className="mb-2 text-xs text-[#5a7390]">
                                {user.document_number
                                    ? `${(user.document_type ?? 'dni').toUpperCase()} ${user.document_number}`
                                    : 'Sin documento'}
                                {user.phone ? ` · ${user.phone}` : ''}
                            </p>
                            <dl className="mb-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Roles
                                    </dt>
                                    <dd className="text-xs font-medium text-[#1a2b4c]">
                                        {user.roles_count}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Creado
                                    </dt>
                                    <dd className="text-xs font-medium text-[#1a2b4c]">
                                        {formatDate(user.created_at)}
                                    </dd>
                                </div>
                            </dl>
                            <div className="flex justify-end border-t border-[#eef2f7] pt-2">
                                <UserActions
                                    user={user}
                                    currentUserId={currentUserId}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onAssignRoles={onAssignRoles}
                                />
                            </div>
                        </article>
                    ))
                )}
            </div>

            <TablePagination
                meta={{
                    from: users.from,
                    to: users.to,
                    total: users.total,
                    current_page: users.current_page,
                    last_page: users.last_page,
                    per_page: users.per_page,
                }}
                onPageChange={(page) => visit({ page })}
                onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
            />
        </div>
    );
}
