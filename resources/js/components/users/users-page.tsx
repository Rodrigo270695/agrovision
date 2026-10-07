import { usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { UserDeleteModal } from '@/components/users/user-delete-modal';
import { UserFormModal } from '@/components/users/user-form-modal';
import {
    UserRolesModal,
    type RoleOption,
} from '@/components/users/user-roles-modal';
import { UsersHeader } from '@/components/users/users-header';
import {
    UsersTable,
    type UserItem,
    type UsersFilters,
    type UsersPagination,
} from '@/components/users/users-table';
import type { UsersStatsData } from '@/components/users/users-stats';
import { useCan } from '@/hooks/use-can';
import { usePendingPosts } from '@/lib/offline/use-pending-posts';

type UsersPageProps = {
    users: UsersPagination;
    stats: UsersStatsData;
    filters: UsersFilters;
    roleOptions: RoleOption[];
    placeOptions: { id: number; name: string; site_name?: string | null }[];
};

export function UsersPage() {
    const { users, stats, filters, roleOptions, placeOptions } = usePage()
        .props as unknown as UsersPageProps;
    const { can } = useCan();

    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
    const [rolesOpen, setRolesOpen] = useState(false);
    const [rolesUser, setRolesUser] = useState<UserItem | null>(null);

    const openCreate = () => {
        if (!can('users.create')) {
            return;
        }

        setEditingUser(null);
        setFormOpen(true);
    };

    const openEdit = (user: UserItem) => {
        if (!can('users.update')) {
            return;
        }

        setEditingUser(user);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingUser(null);
    };

    const openDelete = (user: UserItem) => {
        if (!can('users.delete')) {
            return;
        }

        setDeletingUser(user);
        setDeleteOpen(true);
    };

    const closeDelete = () => {
        setDeleteOpen(false);
        setDeletingUser(null);
    };

    const openRoles = (user: UserItem) => {
        if (!can('users.update')) {
            return;
        }

        setRolesUser(user);
        setRolesOpen(true);
    };

    const closeRoles = () => {
        setRolesOpen(false);
        setRolesUser(null);
    };
    const pendingUsers = usePendingPosts('/usuarios');
    const localUsers = useMemo<UserItem[]>(
        () =>
            pendingUsers.map((item) => ({
                id: item.id,
                pending_sync: true,
                name: String(item.body.name ?? ''),
                email: String(item.body.email ?? ''),
                document_type: String(item.body.document_type ?? ''),
                document_number: String(item.body.document_number ?? ''),
                phone: String(item.body.phone ?? ''),
                roles_count: 0,
            })),
        [pendingUsers],
    );
    const mergedUsers = useMemo<UsersPagination>(() => {
        if (localUsers.length === 0) {
            return users;
        }

        return {
            ...users,
            data: [...localUsers, ...users.data],
            total: users.total + localUsers.length,
        };
    }, [localUsers, users]);
    const mergedStats = useMemo(
        () => ({
            ...stats,
            users: stats.users + localUsers.length,
            on_screen: stats.on_screen + localUsers.length,
            without_roles: stats.without_roles + localUsers.length,
        }),
        [localUsers, stats],
    );

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <UsersHeader stats={mergedStats} onCreate={openCreate} />
            <UsersTable
                users={mergedUsers}
                filters={filters}
                onEdit={openEdit}
                onDelete={openDelete}
                onAssignRoles={openRoles}
            />

            {can('users.create') || can('users.update') ? (
                <UserFormModal
                    open={formOpen}
                    user={editingUser}
                    places={placeOptions ?? []}
                    onClose={closeForm}
                />
            ) : null}

            {can('users.delete') ? (
                <UserDeleteModal
                    open={deleteOpen}
                    user={deletingUser}
                    onClose={closeDelete}
                />
            ) : null}

            {can('users.update') ? (
                <UserRolesModal
                    open={rolesOpen}
                    user={rolesUser}
                    roles={roleOptions ?? []}
                    places={placeOptions ?? []}
                    onClose={closeRoles}
                />
            ) : null}
        </div>
    );
}
