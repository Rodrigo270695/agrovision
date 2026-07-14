import { usePage } from '@inertiajs/react';
import { useState } from 'react';
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

    return (
        <div className="flex h-full flex-1 flex-col gap-4 p-4">
            <RolesHeader stats={stats} onCreate={openCreate} />
            <RolesTable
                roles={roles}
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
