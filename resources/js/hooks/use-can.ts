import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import type { Auth } from '@/types';

type AuthPageProps = {
    auth: Auth;
};

export function useCan() {
    const { auth } = usePage().props as AuthPageProps;

    const permissions = auth.permissions ?? [];
    const roles = auth.roles ?? [];
    const isSuperAdmin = roles.some(
        (role) => role.toLowerCase() === 'superadmin',
    );

    const can = useCallback(
        (permission?: string | null) => {
            if (!permission) {
                return true;
            }

            if (isSuperAdmin) {
                return true;
            }

            return permissions.includes(permission);
        },
        [isSuperAdmin, permissions],
    );

    return { can, isSuperAdmin, permissions, roles };
}
