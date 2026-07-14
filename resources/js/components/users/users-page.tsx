import { usePage } from '@inertiajs/react';
import { useState } from 'react';
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

type UsersPageProps = {
    users: UsersPagination;
    stats: UsersStatsData;
    filters: UsersFilters;
    roleOptions: RoleOption[];
};

function isProtectedUser(user: UserItem): boolean {
    return (
        user.roles?.some((role) => role.name.toLowerCase() === 'superadmin') ??
        false
    );
}

export function UsersPage() {
    const { users, stats, filters, roleOptions } = usePage()
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
        if (!can('users.update') || isProtectedUser(user)) {
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
        if (!can('users.delete') || isProtectedUser(user)) {
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
        if (!can('users.update') || isProtectedUser(user)) {
            return;
        }

        setRolesUser(user);
        setRolesOpen(true);
    };

    const closeRoles = () => {
        setRolesOpen(false);
        setRolesUser(null);
    };

    return (
        <div className="flex h-full flex-1 flex-col gap-4 p-4">
            <UsersHeader stats={stats} onCreate={openCreate} />
            <UsersTable
                users={users}
                filters={filters}
                onEdit={openEdit}
                onDelete={openDelete}
                onAssignRoles={openRoles}
            />

            {can('users.create') || can('users.update') ? (
                <UserFormModal
                    open={formOpen}
                    user={editingUser}
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
                    onClose={closeRoles}
                />
            ) : null}
        </div>
    );
}
