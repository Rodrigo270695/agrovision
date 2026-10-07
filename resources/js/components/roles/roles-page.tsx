import { usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { RoleDeleteModal } from '@/components/roles/role-delete-modal';
import { RoleFormModal } from '@/components/roles/role-form-modal';
import {
    RolePermissionsModal,
    type PermissionCatalogItem,
} from '@/components/roles/role-permissions-modal';
import { RolesHeader } from '@/components/roles/roles-header';
import {
    RolesTable,
    type RoleItem,
    type RolesFilters,
    type RolesPagination,
} from '@/components/roles/roles-table';
import type { RolesStatsData } from '@/components/roles/roles-stats';
import { useCan } from '@/hooks/use-can';
import { usePendingPosts } from '@/lib/offline/use-pending-posts';

type RolesPageProps = {
    roles: RolesPagination;
    stats: RolesStatsData;
    filters: RolesFilters;
    permissionCatalog: PermissionCatalogItem[];
};

export function RolesPage() {
    const { roles, stats, filters, permissionCatalog } = usePage()
        .props as unknown as RolesPageProps;
    const { can } = useCan();

    const [formOpen, setFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingRole, setDeletingRole] = useState<RoleItem | null>(null);
    const [permissionsOpen, setPermissionsOpen] = useState(false);
    const [permissionsRole, setPermissionsRole] = useState<RoleItem | null>(
        null,
    );

    const openCreate = () => {
        if (!can('roles.create')) {
            return;
        }

        setEditingRole(null);
        setFormOpen(true);
    };

    const openEdit = (role: RoleItem) => {
        if (
            !can('roles.update') ||
            role.is_locked ||
            role.name.toLowerCase() === 'superadmin'
        ) {
            return;
        }

        setEditingRole(role);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingRole(null);
    };

    const openDelete = (role: RoleItem) => {
        if (
            !can('roles.delete') ||
            role.is_locked ||
            role.name.toLowerCase() === 'superadmin'
        ) {
            return;
        }

        setDeletingRole(role);
        setDeleteOpen(true);
    };

    const closeDelete = () => {
        setDeleteOpen(false);
        setDeletingRole(null);
    };

    const openPermissions = (role: RoleItem) => {
        if (
            !can('roles.assign') ||
            role.permissions_locked ||
            role.name.toLowerCase() === 'superadmin'
        ) {
            return;
        }

        setPermissionsRole(role);
        setPermissionsOpen(true);
    };

    const closePermissions = () => {
        setPermissionsOpen(false);
        setPermissionsRole(null);
    };
    const pendingRoles = usePendingPosts('/roles');
    const localRoles = useMemo<RoleItem[]>(
        () =>
            pendingRoles.map((item) => ({
                id: item.id,
                pending_sync: true,
                name: String(item.body.name ?? ''),
                permissions_count: 0,
            })),
        [pendingRoles],
    );
    const mergedRoles = useMemo<RolesPagination>(() => {
        if (localRoles.length === 0) {
            return roles;
        }

        return {
            ...roles,
            data: [...localRoles, ...roles.data],
            total: roles.total + localRoles.length,
        };
    }, [localRoles, roles]);
    const mergedStats = useMemo(
        () => ({
            ...stats,
            roles: stats.roles + localRoles.length,
            on_screen: stats.on_screen + localRoles.length,
            without_permissions:
                stats.without_permissions + localRoles.length,
        }),
        [localRoles, stats],
    );

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <RolesHeader stats={mergedStats} onCreate={openCreate} />
            <RolesTable
                roles={mergedRoles}
                filters={filters}
                onEdit={openEdit}
                onDelete={openDelete}
                onAssignPermissions={openPermissions}
            />

            {can('roles.create') || can('roles.update') ? (
                <RoleFormModal
                    open={formOpen}
                    role={editingRole}
                    onClose={closeForm}
                />
            ) : null}

            {can('roles.delete') ? (
                <RoleDeleteModal
                    open={deleteOpen}
                    role={deletingRole}
                    onClose={closeDelete}
                />
            ) : null}

            {can('roles.assign') ? (
                <RolePermissionsModal
                    open={permissionsOpen}
                    role={permissionsRole}
                    catalog={permissionCatalog ?? []}
                    onClose={closePermissions}
                />
            ) : null}
        </div>
    );
}
